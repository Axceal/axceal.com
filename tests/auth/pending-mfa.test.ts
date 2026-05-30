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
    const token = await issuePendingMfaToken(userId, email, "127.0.0.1", "test-agent", "mfa-second-factor");
    tokens.push(token);

    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
    const ttl = await redis.ttl(`pending-mfa:${token}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it("key is stored at pending-mfa:<token>", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent", "mfa-second-factor");
    tokens.push(token);

    const raw = await redis.get(`pending-mfa:${token}`);
    expect(raw).toBeTruthy();
  });

  it("consumePendingMfaToken returns userId and email on valid token with matching IP+UA", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    tokens.push(token);

    const result = await consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    expect(result.userId).toBe(userId);
    expect(result.email).toBe(email);
  });

  it("consumePendingMfaToken is single-use: second call throws AppError", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    tokens.push(token);

    await consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws on nonexistent token", async () => {
    await expect(
      consumePendingMfaToken(randomUUID(), "1.2.3.4", "agent", "mfa-second-factor"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws when IP does not match binding", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    tokens.push(token);

    await expect(
      consumePendingMfaToken(token, "9.9.9.9", "Mozilla/5.0", "mfa-second-factor"),
    ).rejects.toThrow(AppError);
  });

  it("consumePendingMfaToken throws when UA does not match binding", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0", "mfa-second-factor");
    tokens.push(token);

    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "OtherAgent/1.0", "mfa-second-factor"),
    ).rejects.toThrow(AppError);
  });

  // F13.1 — cross-flow token reuse must be rejected
  it("consumePendingMfaToken throws when flow does not match issuance", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent", "mfa-second-factor");
    tokens.push(token);

    // Wrong flow consumes (burns) the token via GETDEL — assert it is gone after.
    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "agent", "signup-auto"),
    ).rejects.toThrow(AppError);

    // Even the correct flow now fails because the token was burned.
    await expect(
      consumePendingMfaToken(token, "1.2.3.4", "agent", "mfa-second-factor"),
    ).rejects.toThrow(AppError);
  });

  it("peekPendingMfaToken returns email without consuming the token (matching flow)", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent", "mfa-second-factor");
    tokens.push(token);

    const peeked = await peekPendingMfaToken(token, "mfa-second-factor");
    expect(peeked?.email).toBe(email);

    // Token still alive — peek again
    const peekedAgain = await peekPendingMfaToken(token, "mfa-second-factor");
    expect(peekedAgain?.email).toBe(email);
  });

  it("peekPendingMfaToken returns null for nonexistent token", async () => {
    const result = await peekPendingMfaToken(randomUUID(), "mfa-second-factor");
    expect(result).toBeNull();
  });

  // F13.1 — peek must not leak email across flows either
  it("peekPendingMfaToken returns null when flow does not match", async () => {
    const userId = randomUUID();
    const email = `test-${randomUUID()}@example.com`;
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent", "signup-auto");
    tokens.push(token);

    const peeked = await peekPendingMfaToken(token, "mfa-second-factor");
    expect(peeked).toBeNull();
  });
});
