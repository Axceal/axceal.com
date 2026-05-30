export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { generateOtp, storeLoginOtp } from "@/lib/auth/otp";
import { peekPendingMfaToken } from "@/lib/auth/pending-mfa";
import { emailProvider } from "@/lib/email/provider";
import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { LoginOtpRequest, LoginOtpResponse } from "@/lib/contracts/auth";

// S11 — cap how many login OTPs can be sent per pendingMfaToken. The token
// is valid for 5 minutes; without a per-token counter an attacker who
// completed password verification (perhaps via leaked credentials) could
// spam the victim's inbox + burn Resend quota up to the email rate limit.
const MAX_OTPS_PER_TOKEN = 3;
const TOKEN_OTP_TTL_SEC = 5 * 60;
const tokenSendKey = (token: string) => `otp:login-send-count:${token}`;

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

    const sendCount = await redis.incr(tokenSendKey(input.pendingMfaToken));
    if (sendCount === 1) {
      await redis.expire(tokenSendKey(input.pendingMfaToken), TOKEN_OTP_TTL_SEC);
    }
    if (sendCount > MAX_OTPS_PER_TOKEN) {
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        "Code send limit reached for this login attempt. Please re-enter your password.",
        429,
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
