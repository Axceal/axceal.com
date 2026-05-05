import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockVerificationsCreate, mockVerificationChecksCreate } = vi.hoisted(() => ({
  mockVerificationsCreate: vi.fn(),
  mockVerificationChecksCreate: vi.fn(),
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: { create: mockVerificationsCreate },
          verificationChecks: { create: mockVerificationChecksCreate },
        })),
      },
    },
  })),
}));

import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/twilio/verify";

describe("lib/twilio/verify", () => {
  beforeEach(() => {
    mockVerificationsCreate.mockReset();
    mockVerificationChecksCreate.mockReset();
  });

  describe("sendPhoneOtp", () => {
    it("calls verifications.create with correct to and channel", async () => {
      mockVerificationsCreate.mockResolvedValueOnce({ status: "pending" });

      await sendPhoneOtp("+919876543210");

      expect(mockVerificationsCreate).toHaveBeenCalledOnce();
      expect(mockVerificationsCreate).toHaveBeenCalledWith({
        to: "+919876543210",
        channel: "sms",
      });
    });

    it("propagates SDK error", async () => {
      mockVerificationsCreate.mockRejectedValueOnce(new Error("Twilio down"));
      await expect(sendPhoneOtp("+919876543210")).rejects.toThrow("Twilio down");
    });
  });

  describe("verifyPhoneOtp", () => {
    it("returns true when status is approved", async () => {
      mockVerificationChecksCreate.mockResolvedValueOnce({ status: "approved" });

      const result = await verifyPhoneOtp("+919876543210", "123456");
      expect(result).toBe(true);
      expect(mockVerificationChecksCreate).toHaveBeenCalledWith({
        to: "+919876543210",
        code: "123456",
      });
    });

    it("returns false when status is pending", async () => {
      mockVerificationChecksCreate.mockResolvedValueOnce({ status: "pending" });
      const result = await verifyPhoneOtp("+919876543210", "000000");
      expect(result).toBe(false);
    });

    it("returns false when status is not approved", async () => {
      mockVerificationChecksCreate.mockResolvedValueOnce({ status: "canceled" });
      const result = await verifyPhoneOtp("+919876543210", "000000");
      expect(result).toBe(false);
    });

    it("propagates SDK error", async () => {
      mockVerificationChecksCreate.mockRejectedValueOnce(new Error("network error"));
      await expect(verifyPhoneOtp("+919876543210", "123456")).rejects.toThrow("network error");
    });
  });
});
