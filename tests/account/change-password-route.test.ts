import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/session";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { storeChangePasswordOtp } from "@/lib/auth/otp";
import { redis } from "@/lib/redis";

const { POST } = await import("@/app/api/account/change-password/route");

type OkBody = { ok: true; data: { success: boolean } };
type ErrBody = { ok: false; error: { code: string } };

describe("POST /api/account/change-password", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];
  const redisKeys: string[] = [];

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const k of redisKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("valid OTP + new password → 200, pw:changed key set in Redis", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`change-pw:${user.id}`);
    redisKeys.push(`pw:changed:${user.id}`, `otp:change-pw:${user.email}`);

    const otp = "9876";
    await storeChangePasswordOtp(user.email, otp);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp,
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.success).toBe(true);

    const revoked = await redis.get(`pw:changed:${user.id}`);
    expect(revoked).toBeTruthy();
  });

  it("wrong OTP → 400 OTP_EXPIRED or INVALID_OTP", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`change-pw:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp: "0000",
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(400);
  });

  it("invalid body (OTP too short) → 400 VALIDATION_FAILED", async () => {
    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp: "12",
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(400);
  });

  it("rate limit trips on 6th request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `change-pw:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 5, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp: "1234",
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp: "1234",
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(401);
  });

  it("authenticated but user not found in DB → 404 NOT_FOUND", async () => {
    const ghostUserId = "00000000-0000-0000-0000-000000000099";
    rlKeys.push(`change-pw:${ghostUserId}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: ghostUserId }));

    const res = await POST(makeRequest("POST", "/api/account/change-password", {
      otp: "1234",
      password: "NewPassword123!",
    }));
    expect(res.status).toBe(404);
  });
});
