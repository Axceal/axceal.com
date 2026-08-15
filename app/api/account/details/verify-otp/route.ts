export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { DetailsVerifyOtpRequest, DetailsVerifyOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { verifyDetailsOtp } from "@/lib/auth/otp";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

function isUniqueViolation(err: any): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  if (err.cause?.code === "23505") return true;
  return false;
}

// Verify the email OTP and persist the phone number to the user record.
// The OTP proves the caller controls the email on file; the phone value
// is accepted from the request body (same as the old Twilio-based flow).
export const POST = withHandler({
  input: DetailsVerifyOtpRequest,
  output: DetailsVerifyOtpResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`details-verify-otp:${session.userId}`, { limit: 10, windowSec: 10 * 60 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { email: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    // Verify the code against the details-scoped OTP stored in Redis
    await verifyDetailsOtp(user.email, input.code);

    // Persist the phone number
    const now = new Date();
    try {
      await db
        .update(users)
        .set({ phone: input.phone, phoneVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, session.userId));
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError(
          ErrorCode.CONFLICT,
          "This phone number is already linked to another account.",
          409,
        );
      }
      throw err;
    }

    logger.info({ userId: session.userId }, "phone saved via email otp");
    return { verified: true as const };
  },
});
