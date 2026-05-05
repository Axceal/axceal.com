import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { POST } from "@/app/api/auth/verify-password/route";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { redis } from "@/lib/redis";

type OkBody = { ok: true; data: { pendingMfaToken: string } };
type ErrBody = { ok: false; error: { code: string; message: string } };

function uniqueIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function postReq(body: unknown, ip?: string) {
  const headers: Record<string, string> = {};
  if (ip) headers["x-forwarded-for"] = ip;
  return makeRequest("POST", "/api/auth/verify-password", body, { headers });
}

describe("POST /api/auth/verify-password", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
    for (const k of rlKeys.splice(0)) await redis.del(k);
  });

  it("valid email + correct password → 200, pendingMfaToken returned", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`verify-pw:email:${user.email}`, `verify-pw:ip:${ip}`);

    const res = await POST(postReq({ email: user.email, password: "TestPassword123!" }, ip));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.ok).toBe(true);
    expect(body.data.pendingMfaToken).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("valid email + wrong password → 401 UNAUTHENTICATED", async () => {
    const ip = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`verify-pw:email:${user.email}`, `verify-pw:ip:${ip}`);

    const res = await POST(postReq({ email: user.email, password: "WrongPassword1!" }, ip));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("unknown email → 401 UNAUTHENTICATED with same generic message", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    rlKeys.push(`verify-pw:email:${email}`, `verify-pw:ip:${ip}`);

    const res = await POST(postReq({ email, password: "SomePassword1!" }, ip));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Invalid email or password.");
  });

  it("wrong password and unknown email produce identical message (no enumeration)", async () => {
    const ip1 = uniqueIp();
    const ip2 = uniqueIp();
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const unknownEmail = `test-${randomUUID()}@example.com`;
    rlKeys.push(
      `verify-pw:email:${user.email}`, `verify-pw:ip:${ip1}`,
      `verify-pw:email:${unknownEmail}`, `verify-pw:ip:${ip2}`,
    );

    const wrongPwRes = await POST(postReq({ email: user.email, password: "Bad1!" }, ip1));
    const unknownRes = await POST(postReq({ email: unknownEmail, password: "Bad1!" }, ip2));

    const wrongBody = await readJson<ErrBody>(wrongPwRes);
    const unknownBody = await readJson<ErrBody>(unknownRes);

    expect(wrongBody.error.message).toBe(unknownBody.error.message);
    expect(wrongBody.error.code).toBe(unknownBody.error.code);
  });

  it("missing email → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ password: "password123" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("missing password → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({ email: "test@example.com" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("empty body → 400 VALIDATION_FAILED", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  it("rate limit trips on 6th request for same email → 429 RATE_LIMITED", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const rlKey = `verify-pw:email:${email}`;
    rlKeys.push(rlKey, `verify-pw:ip:${ip}`);

    // Pre-seed key to limit (5) so next increment → 6 > 5 = RATE_LIMITED
    await redis.set(rlKey, 5, { ex: 3600 });

    const res = await POST(postReq({ email, password: "SomePassword1!" }, ip));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("IP rate limit trips on 21st request from same IP → 429", async () => {
    const ip = uniqueIp();
    const email = `test-${randomUUID()}@example.com`;
    const ipRlKey = `verify-pw:ip:${ip}`;
    rlKeys.push(ipRlKey, `verify-pw:email:${email}`);

    // Pre-seed IP key to limit (20)
    await redis.set(ipRlKey, 20, { ex: 3600 });

    const res = await POST(postReq({ email, password: "SomePassword1!" }, ip));
    expect(res.status).toBe(429);
  });

  it("pendingMfaToken in response contains IP+UA binding in Redis", async () => {
    const ip = uniqueIp();
    const ua = "TestAgent/1.0";
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`verify-pw:email:${user.email}`, `verify-pw:ip:${ip}`);

    const req = makeRequest("POST", "/api/auth/verify-password", {
      email: user.email,
      password: "TestPassword123!",
    }, { headers: { "x-forwarded-for": ip, "user-agent": ua } });

    const res = await POST(req);
    const body = await readJson<OkBody>(res);
    const token = body.data.pendingMfaToken;

    const record = await redis.get<{ ipHash: string; uaHash: string }>(`pending-mfa:${token}`);
    expect(record).toBeTruthy();
    expect(record!.ipHash).toBeTruthy();
    expect(record!.uaHash).toBeTruthy();

    // Clean up the pending MFA token
    await redis.del(`pending-mfa:${token}`);
  });
});
