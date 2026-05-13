export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { VerifyPhoneRequest, VerifyPhoneResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { verifyPhoneOtp } from "@/lib/twilio/verify";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

export const POST = withHandler({
  input: VerifyPhoneRequest,
  output: VerifyPhoneResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`phone-verify:${session.userId}`, { limit: 5, windowSec: 3600 });

    const approved = await verifyPhoneOtp(input.phone, input.code);
    if (!approved) {
      throw new AppError(ErrorCode.INVALID_OTP, "Incorrect OTP.", 400);
    }

    const now = new Date();
    try {
      await db
        .update(users)
        .set({ phone: input.phone, phoneVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, session.userId));
    } catch (err) {
      // Postgres unique-violation = SQLSTATE 23505. The `users.phone` column
      // is UNIQUE — a duplicate means another account already verified this
      // number. Return a clear 409 instead of letting the raw 500 bubble up.
      if (isUniqueViolation(err)) {
        throw new AppError(
          ErrorCode.CONFLICT,
          "This phone number is already linked to another account.",
          409,
        );
      }
      throw err;
    }

    logger.info({ userId: session.userId }, "phone verified");
    return { verified: true as const };
  },
});
