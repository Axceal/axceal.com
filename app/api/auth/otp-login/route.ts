export const runtime = "nodejs";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { OtpLoginRequest, OtpLoginResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { consumeOtpToken } from "@/lib/auth/otp";
import { issuePendingMfaToken } from "@/lib/auth/pending-mfa";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// F16.3 — hash-truncate email for log breadcrumbs. Same pattern as F14.5
// in /api/auth/send-otp — keeps PII off log-ingest while preserving the
// ability to correlate activity per account.
const hashEmail = (email: string) =>
  createHash("sha256").update(email).digest("hex").slice(0, 12);

// Passwordless login via fresh OTP token. The caller has already proven
// inbox control by verifying the OTP code (token issued by /verify-otp,
// 5 min TTL, single-use). This endpoint exchanges that proof for a session.
//
// Defense in depth:
//   • Strict per-email + per-IP rate limits — a stolen-then-leaked token still
//     can't be brute-forced through this endpoint at scale.
//   • consumeOtpToken is atomic (GETDEL) — concurrent retries collide on the
//     first delete and the loser sees OTP_EXPIRED.
//   • Token flow is scoped to "email-verify" — tokens issued for other
//     purposes are rejected immediately.
//   • Token email must match the request email — prevents using a token
//     issued for victim@x to log in as attacker@y (and vice versa).
export const POST = withHandler({
  input: OtpLoginRequest,
  output: OtpLoginResponse,
  handler: async ({ input, req }) => {
    const { email, otpToken } = input;
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") ?? "";

    // 3 attempts per email per 15 min — single-use tokens shouldn't need many
    // tries; legitimate flow consumes the token on first attempt.
    await rateLimit(`otp-login:email:${email}`, { limit: 3, windowSec: 15 * 60 });
    // 20 per hour per IP — absolute brake against distributed enumeration.
    await rateLimit(`otp-login:ip:${ip}`, { limit: 20, windowSec: 3600 });

    let tokenEmail: string;
    try {
      tokenEmail = await consumeOtpToken(otpToken, "email-verify");
    } catch (err) {
      logger.info({ emailHash: hashEmail(email), ip, outcome: "token-invalid" }, "otp-login attempt");
      throw err;
    }

    // Token email must match request email — defeats cross-account replay
    // of a leaked token. Constant-time string compare is overkill here
    // (these are application identifiers, not secrets).
    if (tokenEmail !== email) {
      logger.warn({ emailHash: hashEmail(email), ip, outcome: "email-mismatch" }, "otp-login attempt");
      throw new AppError(
        ErrorCode.UNAUTHENTICATED,
        "Verification token does not match this email.",
        401,
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true },
    });
    if (!user) {
      // Token was valid + matched but no account exists. The caller saw
      // accountExists=true at verify-otp; if they hit this path the account
      // was deleted between then and now. Burn the token (already consumed)
      // and surface a generic auth error.
      logger.warn({ emailHash: hashEmail(email), ip, outcome: "account-missing" }, "otp-login attempt");
      throw new AppError(
        ErrorCode.UNAUTHENTICATED,
        "Account not found.",
        401,
      );
    }

    const pendingMfaToken = await issuePendingMfaToken(
      user.id,
      user.email,
      ip,
      ua,
      "otp-login",
    );
    logger.info({ userId: user.id, ip, outcome: "ok" }, "otp-login attempt");
    return { pendingMfaToken };
  },
});
