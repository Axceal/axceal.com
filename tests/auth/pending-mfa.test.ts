import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  issuePendingMfaToken,
  consumePendingMfaToken,
  peekPendingMfaToken,
} from "@/lib/auth/pending-mfa";
import { redis } from "@/lib/redis";
import { AppError } from "@/lib/http/errors";

describe("auth/pending-mfa", () => {
  const tokens: string[] = [];

  afterEach(async () => {
    for (const t of tokens.splice(0)) {
      await redis.del(`pending-mfa:${t}`);
    }
  });

  it("issuePendingMfaToken returns a UUID and stores record in Redis with TTL ≤ 300s", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "127.0.0.1", "test-agent");
    tokens.push(token);

    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
    const ttl = await redis.ttl(`pending-mfa:${token}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it("key is stored at pending-mfa:<token>", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent");
    tokens.push(token);

    const raw = await redis.get(`pending-mfa:${token}`);
    expect(raw).toBeTruthy();
  });

  it("consumePendingMfaToken returns userId and email on valid token with matching IP+UA", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    tokens.push(token);

    const result = await consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0");
    expect(result.userId).toBe(userId);
    expect(result.email).toBe(email);
  });

  it("consumePendingMfaToken is single-use: second call throws AppError", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    tokens.push(token);

    await consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0");
    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws on nonexistent token", async () => {
    await expect(
      consumePendingMfaToken(randomUUID(), "1.2.3.4", "agent"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws when IP does not match binding", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    tokens.push(token);

    await expect(
      consumePendingMfaToken(token, "9.9.9.9", "Mozilla/5.0"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws when UA does not match binding", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    tokens.push(token);

    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "OtherAgent/1.0"),
    ).rejects.toThrow(AppError);
  });

  it("peekPendingMfaToken returns email without consuming the token", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent");
    tokens.push(token);

    const peeked = await peekPendingMfaToken(token);
    expect(peeked?.email).toBe(email);

    // Token still alive — peek again
    const peekedAgain = await peekPendingMfaToken(token);
    expect(peekedAgain?.email).toBe(email);
  });

  it("peekPendingMfaToken returns null for nonexistent token", async () => {
    const result = await peekPendingMfaToken(randomUUID());
    expect(result).toBeNull();
  });
});
