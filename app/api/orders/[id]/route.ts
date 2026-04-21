import { requireSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order";
import { ok, fail } from "@/lib/http/response";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return fail(ErrorCode.VALIDATION_FAILED, "Invalid order id", 400);
    }
    const order = await getOrder(session.userId, id);
    return ok(order);
  } catch (err) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    logger.error({ err }, "get order failed");
    return fail(ErrorCode.INTERNAL, "Internal server error", 500);
  }
}
