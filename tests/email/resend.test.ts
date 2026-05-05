import { describe, it, expect, beforeEach, vi } from "vitest";

const mockEmailsSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockEmailsSend } };
  }),
}));

vi.mock("@react-email/components", async (importOriginal) => {
  const real = await importOriginal<typeof import("@react-email/components")>();
  return { ...real, render: vi.fn(async () => "<html>mocked-otp</html>") };
});

import { resendProvider } from "@/lib/email/resend";
import { AppError } from "@/lib/http/errors";

describe("lib/email/resend — resendProvider.sendOtp", () => {
  beforeEach(() => {
    mockEmailsSend.mockReset();
  });

  it("calls emails.send with correct to, subject, html, text", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "abc123" }, error: null });

    await resendProvider.sendOtp("user@example.com", "4321");

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const arg = mockEmailsSend.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.to).toBe("user@example.com");
    expect(arg.subject).toBe("Your Axceal verification code");
    expect(arg.html).toBe("<html>mocked-otp</html>");
    expect(String(arg.text)).toContain("4321");
    expect(arg.from).toBeTruthy();
  });

  it("Resend returns error object → throws AppError (502)", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: null, error: { message: "Invalid API key" } });

    await expect(resendProvider.sendOtp("user@example.com", "4321")).rejects.toBeInstanceOf(AppError);
  });

  it("Resend SDK throws → propagates the error", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("network timeout"));

    await expect(resendProvider.sendOtp("user@example.com", "4321")).rejects.toThrow("network timeout");
  });

  it("to field is server-supplied — client value passed through unchanged", async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: "xyz" }, error: null });

    await resendProvider.sendOtp("victim@example.com", "0000");

    const arg = mockEmailsSend.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.to).toBe("victim@example.com");
  });
});
