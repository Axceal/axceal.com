import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/twilio/verify", () => ({
  sendPhoneOtp: vi.fn(async () => {}),
  verifyPhoneOtp: vi.fn(async () => true),
}));

import { requireSession } from "@/lib/auth/session";
import { verifyPhoneOtp } from "@/lib/twilio/verify";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const { POST } = await import("@/app/api/account/phone/verify/route");

type OkBody = { ok: true; data: { verified: boolean } };
type ErrBody = { ok: false; error: { code: string } };

const TEST_PHONE = "+919876543210";

describe("POST /api/account/phone/verify", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  beforeEach(() => {
    vi.mocked(verifyPhoneOtp).mockReset();
  });

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("valid code → 200, phone saved in DB", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`phone-verify:${user.id}`);

    vi.mocked(verifyPhoneOtp).mockResolvedValueOnce(true);
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/phone/verify", {
      phone: TEST_PHONE,
      code: "123456",
    }));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.verified).toBe(true);

    const updated = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    expect(updated!.phone).toBe(TEST_PHONE);
  });

  it("Twilio returns false → 400 INVALID_OTP", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`phone-verify:${user.id}`);

    vi.mocked(verifyPhoneOtp).mockResolvedValueOnce(false);
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/phone/verify", {
      phone: TEST_PHONE,
      code: "000000",
    }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("rate limit trips on 6th request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `phone-verify:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 5, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/phone/verify", {
      phone: TEST_PHONE,
      code: "123456",
    }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(makeRequest("POST", "/api/account/phone/verify", {
      phone: TEST_PHONE,
      code: "123456",
    }));
    expect(res.status).toBe(401);
  });
});
