import { randomUUID, createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";

const TTL_SEC = 5 * 60;
const pendingKey = (token: string) => `pending-mfa:${token}`;

// F13.1 — flow-scope pending-mfa tokens so the F0.1 2FA guarantee can't be
// downgraded by submitting a verify-password token to the signup-auto or
// otp-login providers (both of which skip the OTP step). Mismatch burns the
// token (same pattern as F7.2 for `consumeOtpToken`) so a stolen token cannot
// be retried against a different provider after being rejected once.
export type PendingMfaFlow = "mfa-second-factor" | "signup-auto" | "otp-login";

type PendingMfaRecord = {
  userId: string;
  email: string;
  ipHash: string;
  uaHash: string;
  flow: PendingMfaFlow;
};

function hashString(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function issuePendingMfaToken(
  userId: string,
  email: string,
  ip: string,
  ua: string,
  flow: PendingMfaFlow,
): Promise<string> {
  const token = randomUUID();
  const record: PendingMfaRecord = {
    userId,
    email,
    ipHash: hashString(ip),
    uaHash: hashString(ua),
    flow,
  };
  await redis.set(pendingKey(token), record, { ex: TTL_SEC });
  return token;
}

// Peek without consuming — used by login-otp to send OTP to the right email.
// Asserts flow so a non-mfa token cannot be used to spam OTPs at a victim.
export async function peekPendingMfaToken(
  token: string,
  expectedFlow: PendingMfaFlow = "mfa-second-factor",
): Promise<{ email: string } | null> {
  const record = await redis.get<PendingMfaRecord>(pendingKey(token));
  if (!record) return null;
  if (record.flow !== expectedFlow) return null;
  return { email: record.email };
}

// Consume (single-use) — validates IP+UA binding AND flow scope. On flow
// mismatch the token is deleted before throwing so it cannot be retried
// against the correct provider after a wrong-provider probe.
export async function consumePendingMfaToken(
  token: string,
  ip: string,
  ua: string,
  expectedFlow: PendingMfaFlow,
): Promise<{ userId: string; email: string }> {
  const key = pendingKey(token);
  // Atomic GET+DEL — closes the race where two concurrent consumers could
  // both pass the existence check before either deletes the key.
  const record = await redis.getdel<PendingMfaRecord>(key);
  if (!record) {
    throw new AppError(
      ErrorCode.UNAUTHENTICATED,
      "Verification session expired or invalid. Please log in again.",
      401,
    );
  }
  if (record.flow !== expectedFlow) {
    logger.warn(
      { expectedFlow, actualFlow: record.flow },
      "pending-mfa token flow mismatch — token burned",
    );
    throw new AppError(
      ErrorCode.UNAUTHENTICATED,
      "Verification session invalid.",
      401,
    );
  }
  if (record.ipHash !== hashString(ip) || record.uaHash !== hashString(ua)) {
    throw new AppError(
      ErrorCode.UNAUTHENTICATED,
      "Verification session invalid.",
      401,
    );
  }
  return { userId: record.userId, email: record.email };
}
