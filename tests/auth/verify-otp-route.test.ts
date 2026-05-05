import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { POST } from "@/app/api/auth/verify-otp/route";
import { storeOtp } from "@/lib/auth/otp";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { redis } from "@/lib/redis";

type OkBody = { ok: true; data: { otpToken: string } };
type ErrBody = { ok: false; error: { code: string } };

function uniqueIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function postReq(body: unknown, ip?: string) {
  const headers: Record<string, string> = {};
  if (ip) headers["x-forwarded-for"] = ip;
  return makeRequest("POST", "/api/auth/verify-otp", body, { headers });
}

function testEmail() {
  return `test-${randomUUID()}@example.com`;
}

describe("POST /api/auth/verify-otp", () => {
  const rlKeys: string[] = [];
  const otpKeys: string[] = [];

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const k of otpKeys.splice(0)) await redis.del(k);
  });

  it("valid OTP → 200, otpToken is a UUID", async () => {
    const ip = uniqueIp();
    const email = testEmail();
    otpKeys.push(`otp:${email}`);
    rlKeys.push(`otp:verify-rate-ip:${ip}`);
    await storeOtp(email, "1234");

    const res = await POST(postReq({ email, otp: "1234" }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.otpToken).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("wrong OTP → 400 INVALID_OTP", async () => {
    const ip = uniqueIp();
    const email = testEmail();
    otpKeys.push(`otp:${email}`);
    rlKeys.push(`otp:verify-rate-ip:${ip}`);
    await storeOtp(email, "1234");

    const res = await POST(postReq({ email, otp: "0000" }, ip));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("expired/missing OTP → 400 OTP_EXPIRED", async () => {
    const ip = uniqueIp();
    const email = testEmail();
    rlKeys.push(`otp:verify-rate-ip:${ip}`);

    const res = await POST(postReq({ email, otp: "1234" }, ip));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("OTP_EXPIRED");
  });

  it("OTP is single-use: second correct submission → 400 OTP_EXPIRED", async () => {
    const ip = uniqueIp();
    const email = testEmail();
    otpKeys.push(`otp:${email}`);
    rlKeys.push(`otp:verify-rate-ip:${ip}`);
    await storeOtp(email, "5678");

    const first = await POST(postReq({ email, otp: "5678" }, ip));
    expect(first.status).toBe(200);

    const second = await POST(postReq({ email, otp: "5678" }, ip));
    expect(second.status).toBe(400);
    const body = await readJson<ErrBody>(second);
    expect(body.error.code).toBe("OTP_EXPIRED");
  });

  it("5 wrong attempts store attempts=5; 6th triggers lockout and deletes OTP", async () => {
    const ip = uniqueIp();
    const email = testEmail();
    otpKeys.push(`otp:${email}`);
    rlKeys.push(`otp:verify-rate-ip:${ip}`);
    await storeOtp(email, "1234");

    for (let i = 0; i < 5; i++) {
      const r = await POST(postReq({ email, otp: "0000" }, ip));
      expect(r.status).toBe(400);
      const b = await readJson<ErrBody>(r);
      expect(b.error.code).toBe("INVALID_OTP");
    }
    // 6th wrong: attempts was 5 >= MAX_ATTEMPTS → lockout
    const lockout = await POST(postReq({ email, otp: "0000" }, ip));
    expect(lockout.status).toBe(400);
    const lockoutBody = await readJson<ErrBody>(lockout);
    expect(lockoutBody.error.code).toBe("INVALID_OTP");

    // OTP deleted — further attempts return OTP_EXPIRED
    const after = await POST(postReq({ email, otp: "1234" }, ip));
    expect(after.status).toBe(400);
    const afterBody = await readJson<ErrBody>(after);
    expect(afterBody.error.code).toBe("OTP_EXPIRED");
  });

  it("OTP scoped to email: OTP from emailA cannot verify emailB", async () => {
    const ip = uniqueIp();
    const emailA = testEmail();
    const emailB = testEmail();
    otpKeys.push(`otp:${emailA}`);
    rlKeys.push(`otp:verify-rate-ip:${ip}`);
    await storeOtp(emailA, "9999");

    const res = await POST(postReq({ email: emailB, otp: "9999" }, ip));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("OTP_EXPIRED");
  });

  it("invalid OTP format (not 4 digits) → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "test@example.com", otp: "12345" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("missing otp field → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "test@example.com" }));
    expect(res.status).toBe(400);
  });

  it("rate limit trips on 21st request from same IP → 429", async () => {
    const ip = uniqueIp();
    const rlKey = `otp:verify-rate-ip:${ip}`;
    rlKeys.push(rlKey);

    // Pre-seed to limit (20)
    await redis.set(rlKey, 20, { ex: 3600 });

    const email = testEmail();
    const res = await POST(postReq({ email, otp: "1234" }, ip));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
