import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok } from "@/lib/http/response";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";
import { applyWebhookEvent } from "@/lib/services/payment";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1024 * 1024;

async function readBoundedText(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function POST(req: Request) {
  try {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;

    const len = req.headers.get("content-length");
    if (len && Number(len) > MAX_WEBHOOK_BYTES) {
      return fail(ErrorCode.VALIDATION_FAILED, "Request body too large", 413);
    }

    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return fail(ErrorCode.FORBIDDEN, "Missing signature", 403);
    }

    // Bounded read — content-length can be absent or wrong; abort once we
    // exceed MAX_WEBHOOK_BYTES on the wire to prevent memory blow-up DoS.
    const bodyResult = await readBoundedText(req, MAX_WEBHOOK_BYTES);
    if (bodyResult === null) {
      return fail(ErrorCode.VALIDATION_FAILED, "Request body too large", 413);
    }
    const rawBody = bodyResult;

    if (!verifyWebhookSignature({ rawBody, signature, secret })) {
      logger.warn({ signaturePrefix: signature.slice(0, 8) }, "webhook signature invalid");
      return fail(ErrorCode.FORBIDDEN, "Invalid signature", 403);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return fail(ErrorCode.VALIDATION_FAILED, "Invalid JSON body", 400);
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { id?: unknown }).id !== "string" ||
      typeof (parsed as { event?: unknown }).event !== "string"
    ) {
      return fail(ErrorCode.VALIDATION_FAILED, "Missing id or event", 400);
    }

    await applyWebhookEvent(
      rawBody,
      parsed as Parameters<typeof applyWebhookEvent>[1],
    );

    return ok({ received: true });
  } catch (err) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    logger.error({ err }, "webhook handler error");
    return fail(ErrorCode.INTERNAL, "Internal server error", 500);
  }
}
