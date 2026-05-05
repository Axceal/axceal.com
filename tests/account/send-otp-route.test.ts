import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/email/provider", () => ({
  emailProvider: {
    sendOtp: vi.fn(async () => {}),
    sendWelcome: vi.fn(async () => {}),
  },
}));

import { requireSession } from "@/lib/auth/session";
import { emailProvider } from "@/lib/email/provider";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { redis } from "@/lib/redis";

const { POST } = await import("@/app/api/account/send-otp/route");

type OkBody = { ok: true; data: { sent: boolean } };
type ErrBody = { ok: false; error: { code: string } };

describe("POST /api/account/send-otp", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];
  const otpKeys: string[] = [];

  beforeEach(() => {
    vi.mocked(emailProvider.sendOtp).mockReset();
  });

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const k of otpKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("authenticated → 200, email sent, OTP stored in Redis", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`change-pw-otp:${user.id}`);
    otpKeys.push(`otp:change-pw:${user.email}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/send-otp"));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.sent).toBe(true);

    expect(vi.mocked(emailProvider.sendOtp)).toHaveBeenCalledOnce();
    expect(vi.mocked(emailProvider.sendOtp)).toHaveBeenCalledWith(user.email, expect.any(String));

    const stored = await redis.get(`otp:change-pw:${user.email}`);
    expect(stored).toBeTruthy();
  });

  it("rate limit trips on 6th request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `change-pw-otp:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 5, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(makeRequest("POST", "/api/account/send-otp"));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(makeRequest("POST", "/api/account/send-otp"));
    expect(res.status).toBe(401);
  });
});
