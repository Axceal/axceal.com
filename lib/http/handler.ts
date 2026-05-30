import { ZodError, type ZodType } from "zod";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { fail, ok } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const MAX_JSON_BYTES = 64 * 1024;

type HandlerCtx<I> = { input: I; req: Request; reqId: string };

type Config<I, O> = {
  input?: ZodType<I>;
  output?: ZodType<O>;
  handler: (ctx: HandlerCtx<I>) => Promise<O>;
};

export function withHandler<I, O>(config: Config<I, O>) {
  return async (req: Request): Promise<Response> => {
    // Codebase-review item 11 — honour a client-supplied request id when
    // present (lets upstream tracing systems thread their own id through),
    // otherwise mint a fresh UUID. Echoed back via the response helpers.
    const incomingReqId = req.headers.get("x-request-id");
    const reqId = (incomingReqId && /^[a-zA-Z0-9_-]{1,128}$/.test(incomingReqId))
      ? incomingReqId
      : crypto.randomUUID();
    const log = logger.child({ reqId });
    try {
      let input = undefined as unknown as I;
      if (config.input) {
        // Reject early when client truthfully advertises an oversize body.
        const sizeErr = assertBodySize(req, MAX_JSON_BYTES, reqId);
        if (sizeErr) return sizeErr;
        // Defence-in-depth: even if content-length is absent or lying, this
        // bounded read aborts as soon as we exceed MAX_JSON_BYTES on the wire,
        // so an attacker cannot blow memory by streaming a huge body.
        const raw = await readJsonBounded(req, MAX_JSON_BYTES);
        if (raw === BODY_TOO_LARGE) {
          return fail(ErrorCode.VALIDATION_FAILED, "Request body too large", 413, undefined, reqId);
        }
        const parsed = config.input.safeParse(raw);
        if (!parsed.success) {
          return fail(
            ErrorCode.VALIDATION_FAILED,
            "Invalid request body",
            400,
            parsed.error.issues,
            reqId,
          );
        }
        input = parsed.data;
      }

      const data = await config.handler({ input, req, reqId });

      if (config.output && env.NODE_ENV !== "production") {
        const out = config.output.safeParse(data);
        if (!out.success) {
          log.error(
            { issues: out.error.issues },
            "response shape mismatch (dev-only guard)",
          );
          throw new AppError(
            ErrorCode.INTERNAL,
            "Response shape mismatch",
            500,
            out.error.issues,
          );
        }
      }

      return ok(data, undefined, reqId);
    } catch (err) {
      return handleError(err, reqId);
    }
  };
}

function assertBodySize(req: Request, max: number, reqId: string): Response | null {
  const len = req.headers.get("content-length");
  if (len && Number(len) > max) {
    return fail(
      ErrorCode.VALIDATION_FAILED,
      "Request body too large",
      413,
      undefined,
      reqId,
    );
  }
  return null;
}

const BODY_TOO_LARGE = Symbol("BODY_TOO_LARGE");

async function readJsonBounded(
  req: Request,
  max: number,
): Promise<unknown | typeof BODY_TOO_LARGE> {
  if (!req.body) return undefined;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        return BODY_TOO_LARGE;
      }
      chunks.push(value);
    }
  } catch {
    return undefined;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(merged));
  } catch {
    return undefined;
  }
}

function handleError(err: unknown, reqId: string): Response {
  if (err instanceof AppError) {
    return fail(err.code, err.message, err.status, err.details, reqId);
  }
  if (err instanceof ZodError) {
    return fail(
      ErrorCode.VALIDATION_FAILED,
      "Validation failed",
      400,
      err.issues,
      reqId,
    );
  }
  logger.error({ err, reqId }, "unhandled route error");
  return fail(ErrorCode.INTERNAL, "Internal server error", 500, undefined, reqId);
}
