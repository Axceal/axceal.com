import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/twilio/verify", () => ({
  sendPhoneOtp: vi.fn(async () => {}),
  verifyPhoneOtp: vi.fn(async () => true),
}));

import { requireSession } from "@/lib/auth/session";
import { sendPhoneOtp } from "@/lib/twilio/verify";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { redis } from "@/lib/redis";

const { POST } = await import("@/app/api/account/phone/send/route");

type OkBody = { ok: true; data: { sent: boolean } };
type ErrBody = { ok: false; error: { code: string } };

describe("POST /api/account/phone/send", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  beforeEach(() => {
    vi.mocked(sendPhoneOtp).mockReset();
  });

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("valid phone → 200, Twilio mock called", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`phone-send:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/phone/send", { phone: "+919876543210" }));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.sent).toBe(true);

    expect(vi.mocked(sendPhoneOtp)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendPhoneOtp)).toHaveBeenCalledWith("+919876543210");
  });

  it("invalid phone format → 400 VALIDATION_FAILED", async () => {
    const res = await POST(makeRequest("POST", "/api/account/phone/send", { phone: "9876543210" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rate limit trips on 6th request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `phone-send:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 5, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/phone/send", { phone: "+919876543210" }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(makeRequest("POST", "/api/account/phone/send", { phone: "+919876543210" }));
    expect(res.status).toBe(401);
  });
});
