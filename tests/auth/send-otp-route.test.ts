import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { emailProviderMock, resetMocks } from "@/tests/helpers/mocks";

vi.mock("@/lib/email/provider", () => ({ emailProvider: emailProviderMock }));

import { POST } from "@/app/api/auth/send-otp/route";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { redis } from "@/lib/redis";

type OkBody = { ok: true; data: { sent: true } };
type ErrBody = { ok: false; error: { code: string } };

function uniqueIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function postReq(body: unknown, ip?: string) {
  const headers: Record<string, string> = {};
  if (ip) headers["x-forwarded-for"] = ip;
  return makeRequest("POST", "/api/auth/send-otp", body, { headers });
}

describe("POST /api/auth/send-otp", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];
  const otpKeys: string[] = [];

  beforeEach(() => resetMocks());

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const k of otpKeys.splice(0)) await redis.del(k);
  });

  it("new email → 200, OTP stored in Redis, email sent once", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    rlKeys.push(`otp:send-rate:${email}`, `otp:send-rate-ip:${ip}`);
    otpKeys.push(`otp:${email}`);

    const res = await POST(postReq({ email }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.sent).toBe(true);

    const stored = await redis.get(`otp:${email}`);
    expect(stored).toBeTruthy();
    expect(emailProviderMock.sendOtp).toHaveBeenCalledOnce();
    expect(emailProviderMock.sendOtp).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{4}$/),
    );
  });

  it("existing user email → 200 silent no-op, email NOT sent (anti-enumeration)", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`otp:send-rate:${user.email}`, `otp:send-rate-ip:${ip}`);

    const res = await POST(postReq({ email: user.email }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.sent).toBe(true);

    // No OTP stored, no email sent
    const stored = await redis.get(`otp:${user.email}`);
    expect(stored).toBeNull();
    expect(emailProviderMock.sendOtp).not.toHaveBeenCalled();
  });

  it("OTP TTL is ≤ 600s in Redis", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    rlKeys.push(`otp:send-rate:${email}`, `otp:send-rate-ip:${ip}`);
    otpKeys.push(`otp:${email}`);

    await POST(postReq({ email }, ip));

    const ttl = await redis.ttl(`otp:${email}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it("invalid email format → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("missing email → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  // G.7 — Email schema boundary values
  it("email > 254 chars → 400 VALIDATION_FAILED", async () => {
    const oversized = "a".repeat(250) + "@x.com";
    const res = await POST(postReq({ email: oversized }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("empty string email → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rate limit trips on 6th request for same email → 429 RATE_LIMITED", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const rlKey = `otp:send-rate:${email}`;
    rlKeys.push(rlKey, `otp:send-rate-ip:${ip}`);

    // Pre-seed to limit (5)
    await redis.set(rlKey, 5, { ex: 3600 });

    const res = await POST(postReq({ email }, ip));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
