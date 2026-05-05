export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { generateOtp, storeLoginOtp } from "@/lib/auth/otp";
import { peekPendingMfaToken } from "@/lib/auth/pending-mfa";
import { emailProvider } from "@/lib/email/provider";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { LoginOtpRequest, LoginOtpResponse } from "@/lib/contracts/auth";

export const POST = withHandler({
  input: LoginOtpRequest,
  output: LoginOtpResponse,
  handler: async ({ input, req }) => {
    const ip = getClientIp(req);

    await rateLimit(`otp:login-rate-ip:${ip}`, { limit: 10, windowSec: 3600 });

    const pending = await peekPendingMfaToken(input.pendingMfaToken);
    if (!pending) {
      throw new AppError(
        ErrorCode.UNAUTHENTICATED,
        "Verification session expired. Please enter your password again.",
        401,
      );
    }

    const { email } = pending;
    await rateLimit(`otp:login-rate:${email}`, { limit: 5, windowSec: 3600 });

    const code = generateOtp();
    await storeLoginOtp(email, code);
    await emailProvider.sendOtp(email, code);

    if (process.env.NODE_ENV !== "production") {
      logger.info({ email, otp: code }, "login otp [dev]");
    }

    return { sent: true as const };
  },
});
