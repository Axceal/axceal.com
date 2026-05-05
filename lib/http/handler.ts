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
    const reqId = crypto.randomUUID();
    const log = logger.child({ reqId });
    try {
      let input = undefined as unknown as I;
      if (config.input) {
        const sizeErr = assertBodySize(req, MAX_JSON_BYTES);
        if (sizeErr) return sizeErr;
        const raw = await readJson(req);
        const parsed = config.input.safeParse(raw);
        if (!parsed.success) {
          return fail(
            ErrorCode.VALIDATION_FAILED,
            "Invalid request body",
            400,
            parsed.error.issues,
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

      return ok(data);
    } catch (err) {
      return handleError(err, reqId);
    }
  };
}

function assertBodySize(req: Request, max: number): Response | null {
  const len = req.headers.get("content-length");
  if (len && Number(len) > max) {
    return fail(
      ErrorCode.VALIDATION_FAILED,
      "Request body too large",
      413,
    );
  }
  return null;
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function handleError(err: unknown, reqId: string): Response {
  if (err instanceof AppError) {
    return fail(err.code, err.message, err.status, err.details);
  }
  if (err instanceof ZodError) {
    return fail(
      ErrorCode.VALIDATION_FAILED,
      "Validation failed",
      400,
      err.issues,
    );
  }
  logger.error({ err, reqId }, "unhandled route error");
  return fail(ErrorCode.INTERNAL, "Internal server error", 500);
}
