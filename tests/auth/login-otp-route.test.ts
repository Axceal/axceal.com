import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { emailProviderMock, resetMocks } from "@/tests/helpers/mocks";

vi.mock("@/lib/email/provider", () => ({ emailProvider: emailProviderMock }));

import { POST } from "@/app/api/auth/login-otp/route";
import { issuePendingMfaToken } from "@/lib/auth/pending-mfa";
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
  return makeRequest("POST", "/api/auth/login-otp", body, { headers });
}

describe("POST /api/auth/login-otp", () => {
  const pendingTokens: string[] = [];
  const rlKeys: string[] = [];

  beforeEach(() => resetMocks());

  afterEach(async () => {
    for (const t of pendingTokens.splice(0)) await redis.del(`pending-mfa:${t}`);
    for (const k of rlKeys.splice(0)) await redis.del(k);
  });

  it("valid pendingMfaToken → 200, OTP email sent once", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const userId = randomUUID();
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    pendingTokens.push(token);
    rlKeys.push(`otp:login-rate-ip:${ip}`, `otp:login-rate:${email}`, `otp:login:${email}`);

    const res = await POST(postReq({ pendingMfaToken: token }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.sent).toBe(true);
    expect(emailProviderMock.sendOtp).toHaveBeenCalledOnce();
    expect(emailProviderMock.sendOtp).toHaveBeenCalledWith(
      email,
      expect.stringMatching(/^\d{4}$/),
    );
  });

  it("invalid/nonexistent pendingMfaToken → 401 UNAUTHENTICATED", async () => {
    const ip = uniqueIp();
    rlKeys.push(`otp:login-rate-ip:${ip}`);

    const res = await POST(postReq({ pendingMfaToken: randomUUID() }, ip));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("consumed/deleted token → 401 UNAUTHENTICATED", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const userId = randomUUID();
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "agent");
    // Delete immediately to simulate already-consumed
    await redis.del(`pending-mfa:${token}`);
    rlKeys.push(`otp:login-rate-ip:${ip}`);

    const res = await POST(postReq({ pendingMfaToken: token }, ip));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("invalid UUID pendingMfaToken → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ pendingMfaToken: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("missing pendingMfaToken → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  it("IP rate limit trips on 11th request from same IP → 429", async () => {
    const ip = uniqueIp();
    const rlKey = `otp:login-rate-ip:${ip}`;
    rlKeys.push(rlKey);

    // Pre-seed IP rate limit to 10 (limit is 10)
    await redis.set(rlKey, 10, { ex: 3600 });

    const res = await POST(postReq({ pendingMfaToken: randomUUID() }, ip));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("email OTP stored in Redis after successful send", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const userId = randomUUID();
    const token = await issuePendingMfaToken(userId, email, "1.2.3.4", "Mozilla/5.0");
    pendingTokens.push(token);
    rlKeys.push(`otp:login-rate-ip:${ip}`, `otp:login-rate:${email}`, `otp:login:${email}`);

    await POST(postReq({ pendingMfaToken: token }, ip));

    const stored = await redis.get(`otp:login:${email}`);
    expect(stored).toBeTruthy();
  });
});
