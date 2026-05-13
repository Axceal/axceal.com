import { requireSession } from "@/lib/auth/session";
import { softDeleteAddress } from "@/lib/services/address";
import { ok, fail } from "@/lib/http/response";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    await rateLimit(`addresses:delete:${session.userId}`, { limit: 30, windowSec: 3600 });
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return fail(ErrorCode.VALIDATION_FAILED, "Invalid address id", 400);
    }
    await softDeleteAddress(session.userId, id);
    return ok({ deleted: true as const });
  } catch (err) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    logger.error({ err }, "delete address failed");
    return fail(ErrorCode.INTERNAL, "Internal server error", 500);
  }
}
