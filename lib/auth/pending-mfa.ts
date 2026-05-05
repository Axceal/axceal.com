import { randomUUID, createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";

const TTL_SEC = 5 * 60;
const pendingKey = (token: string) => `pending-mfa:${token}`;

type PendingMfaRecord = {
  userId: string;
  email: string;
  ipHash: string;
  uaHash: string;
};

function hashString(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function issuePendingMfaToken(
  userId: string,
  email: string,
  ip: string,
  ua: string,
): Promise<string> {
  const token = randomUUID();
  const record: PendingMfaRecord = {
    userId,
    email,
    ipHash: hashString(ip),
    uaHash: hashString(ua),
  };
  await redis.set(pendingKey(token), record, { ex: TTL_SEC });
  return token;
}

// Peek without consuming — used by login-otp to send OTP to the right email
export async function peekPendingMfaToken(
  token: string,
): Promise<{ email: string } | null> {
  const record = await redis.get<PendingMfaRecord>(pendingKey(token));
  if (!record) return null;
  return { email: record.email };
}

// Consume (single-use) — validates IP+UA binding; called when completing login
export async function consumePendingMfaToken(
  token: string,
  ip: string,
  ua: string,
): Promise<{ userId: string; email: string }> {
  const key = pendingKey(token);
  const record = await redis.get<PendingMfaRecord>(key);
  if (!record) {
    throw new AppError(
      ErrorCode.UNAUTHENTICATED,
      "Verification session expired or invalid. Please log in again.",
      401,
    );
  }
  await redis.del(key);
  if (record.ipHash !== hashString(ip) || record.uaHash !== hashString(ua)) {
    throw new AppError(
      ErrorCode.UNAUTHENTICATED,
      "Verification session invalid.",
      401,
    );
  }
  return { userId: record.userId, email: record.email };
}
