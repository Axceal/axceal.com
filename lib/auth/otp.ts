import { randomUUID } from "node:crypto";
import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";

const OTP_TTL_SEC = 10 * 60;
const TOKEN_TTL_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;

type OtpRecord = { code: string; attempts: number };
type TokenRecord = { email: string };

const otpKey = (email: string) => `otp:${email}`;
const tokenKey = (token: string) => `otp:verify-token:${token}`;

export function generateOtp(): string {
  const n = Math.floor(Math.random() * 10000);
  return n.toString().padStart(4, "0");
}

export async function storeOtp(email: string, code: string): Promise<void> {
  const record: OtpRecord = { code, attempts: 0 };
  await redis.set(otpKey(email), record, { ex: OTP_TTL_SEC });
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const key = otpKey(email);
  const record = (await redis.get<OtpRecord>(key)) ?? null;

  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "OTP expired or not found. Please request a new one.",
      400,
    );
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError(
      ErrorCode.INVALID_OTP,
      "Too many incorrect attempts. Please request a new OTP.",
      400,
    );
  }

  if (record.code !== code) {
    const next: OtpRecord = { code: record.code, attempts: record.attempts + 1 };
    const ttl = await redis.ttl(key);
    await redis.set(key, next, { ex: ttl > 0 ? ttl : OTP_TTL_SEC });
    throw new AppError(ErrorCode.INVALID_OTP, "Incorrect OTP.", 400);
  }

  // Correct — consume the OTP so it can't be reused.
  await redis.del(key);
}

export async function issueOtpToken(email: string): Promise<string> {
  const token = randomUUID();
  const record: TokenRecord = { email };
  await redis.set(tokenKey(token), record, { ex: TOKEN_TTL_SEC });
  return token;
}

export async function consumeOtpToken(token: string): Promise<string> {
  const key = tokenKey(token);
  const record = (await redis.get<TokenRecord>(key)) ?? null;
  if (!record) {
    throw new AppError(
      ErrorCode.OTP_EXPIRED,
      "Verification token expired. Please verify your email again.",
      400,
    );
  }
  await redis.del(key);
  return record.email;
}
