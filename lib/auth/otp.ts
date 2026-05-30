import { randomUUID, randomInt } from "node:crypto";
import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";

const OTP_TTL_SEC = 10 * 60;
// Post-verify token. Short window — user is in an active flow and the token
// authorises sensitive follow-on actions (register / reset / passwordless
// login). Tab-away scenarios re-OTP rather than extend the trust window.
const TOKEN_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;

// OTP record no longer stores attempts — attempt counting is done with a
// separate atomic INCR key to prevent concurrent requests from bypassing
// MAX_ATTEMPTS by reading stale attempt counts simultaneously.
type OtpRecord = { code: string };
// Flow scopes the token so a token issued for one flow cannot be replayed
// in another. `email-verify` is shared between registration and
// password-reset (both unauthenticated, both prove email ownership).
// `change-pw` is the auth-gated change-password flow.
export type TokenFlow = "email-verify" | "change-pw";
type TokenRecord = { email: string; flow: TokenFlow };

const otpKey          = (email: string) => `otp:${email}`;
const otpAttemptsKey  = (email: string) => `otp:attempts:${email}`;
const tokenKey        = (token: string) => `otp:verify-token:${token}`;

export function generateOtp(): string {
  return randomInt(0, 10000).toString().padStart(4, "0");
}

export async function storeOtp(email: string, code: string): Promise<void> {
  const record: OtpRecord = { code };
  await redis.set(otpKey(email), record, { ex: OTP_TTL_SEC });
  // Reset attempts so a re-issued OTP starts from zero.
  await redis.del(otpAttemptsKey(email));
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const key  = otpKey(email);
  const aKey = otpAttemptsKey(email);

  const record = (await redis.get<OtpRecord>(key)) ?? null;
  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "Code expired or not found. Please request a new one.",
      400,
    );
  }

  // Atomic increment — concurrent wrong attempts each get a distinct count,
  // preventing race conditions that would allow more than MAX_ATTEMPTS tries.
  const attempts = await redis.incr(aKey);
  if (attempts === 1) await redis.expire(aKey, OTP_TTL_SEC);

  if (attempts > MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      ErrorCode.INVALID_OTP,
      "Too many incorrect attempts. Please request a new Code.",
      400,
    );
  }

  if (record.code !== code) {
    throw new AppError(ErrorCode.INVALID_OTP, "Incorrect Code.", 400);
  }

  // Correct — consume both keys so OTP cannot be reused.
  await redis.del(key);
  await redis.del(aKey);
}

export async function issueOtpToken(email: string, flow: TokenFlow): Promise<string> {
  const token = randomUUID();
  const record: TokenRecord = { email, flow };
  await redis.set(tokenKey(token), record, { ex: TOKEN_TTL_SEC });
  return token;
}

// Login-scoped OTPs — separate keys prevent cross-flow reuse with registration OTPs
const loginOtpKey         = (email: string) => `otp:login:${email}`;
const loginOtpAttemptsKey = (email: string) => `otp:login:attempts:${email}`;

export async function storeLoginOtp(email: string, code: string): Promise<void> {
  const record: OtpRecord = { code };
  await redis.set(loginOtpKey(email), record, { ex: OTP_TTL_SEC });
  await redis.del(loginOtpAttemptsKey(email));
}

export async function verifyLoginOtp(email: string, code: string): Promise<void> {
  const key  = loginOtpKey(email);
  const aKey = loginOtpAttemptsKey(email);

  const record = (await redis.get<OtpRecord>(key)) ?? null;
  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "Code expired or not found. Please request a new one.",
      400,
    );
  }

  const attempts = await redis.incr(aKey);
  if (attempts === 1) await redis.expire(aKey, OTP_TTL_SEC);

  if (attempts > MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      ErrorCode.INVALID_OTP,
      "Too many incorrect attempts. Please request a new Code.",
      400,
    );
  }

  if (record.code !== code) {
    throw new AppError(ErrorCode.INVALID_OTP, "Incorrect Code.", 400);
  }

  await redis.del(key);
  await redis.del(aKey);
}

// Change-password scoped OTPs — separate keys prevent cross-flow reuse
const changePwOtpKey         = (email: string) => `otp:change-pw:${email}`;
const changePwOtpAttemptsKey = (email: string) => `otp:change-pw:attempts:${email}`;

export async function storeChangePasswordOtp(email: string, code: string): Promise<void> {
  const record: OtpRecord = { code };
  await redis.set(changePwOtpKey(email), record, { ex: OTP_TTL_SEC });
  await redis.del(changePwOtpAttemptsKey(email));
}

export async function verifyChangePasswordOtp(email: string, code: string): Promise<void> {
  const key  = changePwOtpKey(email);
  const aKey = changePwOtpAttemptsKey(email);

  const record = (await redis.get<OtpRecord>(key)) ?? null;
  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "Code expired or not found. Please request a new one.",
      400,
    );
  }

  const attempts = await redis.incr(aKey);
  if (attempts === 1) await redis.expire(aKey, OTP_TTL_SEC);

  if (attempts > MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      ErrorCode.INVALID_OTP,
      "Too many incorrect attempts. Please request a new Code.",
      400,
    );
  }

  if (record.code !== code) {
    throw new AppError(ErrorCode.INVALID_OTP, "Incorrect Code.", 400);
  }

  await redis.del(key);
  await redis.del(aKey);
}

export async function consumeOtpToken(token: string, expectedFlow: TokenFlow): Promise<string> {
  const key = tokenKey(token);
  // Atomic GET+DEL — prevents two concurrent consumers from both passing the
  // existence check before either deletes the key (race that would allow
  // double-use of a single-use token). Upstash returns the prior value and
  // removes the key in a single round trip.
  const record = (await redis.getdel<TokenRecord>(key)) ?? null;
  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "Verification token expired. Please verify your email again.",
      400,
    );
  }
  if (record.flow !== expectedFlow) {
    // F13.7 — flow mismatches mean either a misrouted legitimate flow or a
    // probe against an unintended endpoint. Log so multiple mismatches
    // surface in monitoring; the token has already been burned by GETDEL
    // above, so this branch is observation-only.
    logger.warn(
      { expectedFlow, actualFlow: record.flow },
      "otp-token flow mismatch — token burned",
    );
    throw new AppError(
      ErrorCode.INVALID_OTP,
      "Invalid verification token.",
      400,
    );
  }
  return record.email;
}
