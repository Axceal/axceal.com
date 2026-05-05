import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok } from "@/lib/http/response";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";
import { applyWebhookEvent } from "@/lib/services/payment";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1024 * 1024;

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

    const rawBody = await req.text();

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
