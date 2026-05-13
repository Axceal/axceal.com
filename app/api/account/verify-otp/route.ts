export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { VerifyChangePasswordOtpRequest, VerifyChangePasswordOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { verifyChangePasswordOtp, issueOtpToken } from "@/lib/auth/otp";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const POST = withHandler({
  input: VerifyChangePasswordOtpRequest,
  output: VerifyChangePasswordOtpResponse,
  handler: async ({ input }) => {
    const session = await requireSession();

    await rateLimit(`verify-change-pw-otp:${session.userId}`, { limit: 10, windowSec: 10 * 60 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { email: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    await verifyChangePasswordOtp(user.email, input.otp);
    const otpToken = await issueOtpToken(user.email, "change-pw");

    return { otpToken };
  },
});
