import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  issueOtpToken,
  consumeOtpToken,
} from "@/lib/auth/otp";
import { redis } from "@/lib/redis";
import { AppError } from "@/lib/http/errors";

function testEmail() {
  return `test-${randomUUID()}@example.com`;
}

describe("auth/otp", () => {
  let email = "";

  beforeEach(() => {
    email = testEmail();
  });

  afterEach(async () => {
    await redis.del(`otp:${email}`);
    await redis.del(`otp:attempts:${email}`);
  });

  it("generateOtp produces a 4-digit string", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{4}$/);
    }
  });

  it("storeOtp + verifyOtp happy path consumes the OTP", async () => {
    const code = "1234";
    await storeOtp(email, code);
    expect(await redis.get(`otp:${email}`)).toBeTruthy();

    await expect(verifyOtp(email, code)).resolves.toBeUndefined();

    // Consumed — second verify should report expired/not-found.
    await expect(verifyOtp(email, code)).rejects.toThrow(AppError);
  });

  it("wrong OTP increments attempts and rejects", async () => {
    await storeOtp(email, "1234");

    await expect(verifyOtp(email, "0000")).rejects.toThrow(/Incorrect OTP/);
    // Attempt count is now tracked in a separate atomic key, not inside the OTP record.
    const attemptCount = await redis.get<number>(`otp:attempts:${email}`);
    expect(attemptCount).toBe(1);
  });

  it("6th attempt is rejected with max-attempts error and deletes the OTP", async () => {
    await storeOtp(email, "1234");
    for (let i = 0; i < 5; i++) {
      await expect(verifyOtp(email, "0000")).rejects.toThrow();
    }
    await expect(verifyOtp(email, "0000")).rejects.toThrow(/Too many incorrect attempts/);
    expect(await redis.get(`otp:${email}`)).toBeNull();
  });

  it("missing/expired OTP is rejected with OTP_EXPIRED", async () => {
    await expect(verifyOtp(email, "1234")).rejects.toThrow(/expired/i);
  });

  it("issueOtpToken returns a UUID and consumeOtpToken returns the email once", async () => {
    const token = await issueOtpToken(email, "email-verify");
    expect(token).toMatch(/^[0-9a-f-]{36}$/i);

    const recovered = await consumeOtpToken(token, "email-verify");
    expect(recovered).toBe(email);

    // Single-use — second consume fails.
    await expect(consumeOtpToken(token, "email-verify")).rejects.toThrow();
  });

  it("rejects token consumed under wrong flow and burns it", async () => {
    const token = await issueOtpToken(email, "email-verify");
    // Wrong flow → throws and deletes the key (single-use even on mismatch).
    await expect(consumeOtpToken(token, "change-pw")).rejects.toThrow();
    // Even the correct flow now fails because the key was burned.
    await expect(consumeOtpToken(token, "email-verify")).rejects.toThrow();
  });
});
