import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/auth/reset-password/route";
import { createTestUser } from "@/tests/helpers/db";
import { issueOtpToken } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { makeRequest, readJson } from "@/tests/helpers/request";

type OkBody = { ok: true; data: { success: true } };
type ErrBody = { ok: false; error: { code: string } };

function uniqueIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function postReq(body: unknown, ip?: string) {
  const headers: Record<string, string> = {};
  if (ip) headers["x-forwarded-for"] = ip;
  return makeRequest("POST", "/api/auth/reset-password", body, { headers });
}

describe("POST /api/auth/reset-password", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];
  const redisKeys: string[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const k of redisKeys.splice(0)) await redis.del(k);
  });

  it("valid otpToken + new password → 200, password updated in DB", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const otpToken = await issueOtpToken(user.email, "email-verify");
    rlKeys.push(`reset-pw:email:${user.email}`, `reset-pw:ip:${ip}`);
    redisKeys.push(`pw:changed:${user.id}`);

    const res = await POST(postReq({ email: user.email, otpToken, password: "NewPassword456!" }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.success).toBe(true);

    const updated = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    expect(await verifyPassword("TestPassword123!", updated!.passwordHash)).toBe(false);
    expect(await verifyPassword("NewPassword456!", updated!.passwordHash)).toBe(true);
  });

  it("valid reset sets pw:changed Redis key for session revocation", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const otpToken = await issueOtpToken(user.email, "email-verify");
    rlKeys.push(`reset-pw:email:${user.email}`, `reset-pw:ip:${ip}`);
    redisKeys.push(`pw:changed:${user.id}`);

    await POST(postReq({ email: user.email, otpToken, password: "NewPassword456!" }, ip));

    const changedAt = await redis.get<number>(`pw:changed:${user.id}`);
    expect(typeof changedAt).toBe("number");
    expect(changedAt).toBeGreaterThan(0);
  });

  it("otpToken is single-use: second reset attempt with same token → 400", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const otpToken = await issueOtpToken(user.email, "email-verify");
    rlKeys.push(`reset-pw:email:${user.email}`, `reset-pw:ip:${ip}`);
    redisKeys.push(`pw:changed:${user.id}`);

    await POST(postReq({ email: user.email, otpToken, password: "NewPassword456!" }, ip));

    const second = await POST(postReq({ email: user.email, otpToken, password: "AnotherPw789!" }, ip));
    expect(second.status).toBe(400);
    const body = await readJson<ErrBody>(second);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("invalid/expired otpToken → 400 INVALID_OTP", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    rlKeys.push(`reset-pw:email:${email}`, `reset-pw:ip:${ip}`);

    const res = await POST(postReq({ email, otpToken: randomUUID(), password: "NewPassword456!" }, ip));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("token email mismatch → 400 INVALID_OTP", async () => {
    const ip = uniqueIp();
    const tokenEmail = `test-${randomUUID()}@example.com`;
    const requestEmail = `test-${randomUUID()}@example.com`;
    const otpToken = await issueOtpToken(tokenEmail, "email-verify");
    rlKeys.push(`reset-pw:email:${requestEmail}`, `reset-pw:ip:${ip}`);

    const res = await POST(postReq({ email: requestEmail, otpToken, password: "NewPassword456!" }, ip));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("password too short (< 8 chars) → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "test@example.com", otpToken: randomUUID(), password: "short" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("missing password → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "test@example.com", otpToken: randomUUID() }));
    expect(res.status).toBe(400);
  });

  it("missing email → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ otpToken: randomUUID(), password: "NewPassword456!" }));
    expect(res.status).toBe(400);
  });

  it("rate limit trips on 6th request for same email → 429 RATE_LIMITED", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const rlKey = `reset-pw:email:${email}`;
    rlKeys.push(rlKey, `reset-pw:ip:${ip}`);

    // Pre-seed to limit (5)
    await redis.set(rlKey, 5, { ex: 3600 });

    const res = await POST(postReq({ email, otpToken: randomUUID(), password: "NewPassword456!" }, ip));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("nonexistent user email with valid token still returns 200 (uniform timing)", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const otpToken = await issueOtpToken(email, "email-verify");
    rlKeys.push(`reset-pw:email:${email}`, `reset-pw:ip:${ip}`);

    const res = await POST(postReq({ email, otpToken, password: "NewPassword456!" }, ip));
    // Route hashes password even if user not found (uniform timing), returns 200
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.success).toBe(true);
  });
});
