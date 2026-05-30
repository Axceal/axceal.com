import { vi } from "vitest";

/** Drop-in for vi.mock("@/lib/email/provider") */
export const emailProviderMock = {
  sendOtp: vi.fn(async () => {}),
  sendWelcome: vi.fn(async () => {}),
  sendLoginAlert: vi.fn(async () => {}),
};

/** Drop-in for vi.mock("@/lib/twilio/verify") */
export const twilioMock = {
  sendVerification: vi.fn(async () => ({ status: "pending" })),
  checkVerification: vi.fn(async () => ({ status: "approved" })),
};

/** Drop-in for vi.mock("@/lib/razorpay/client") — only stubs methods used in tests */
export const razorpayMock = {
  orders: {
    create: vi.fn(async () => ({
      id: "order_test123",
      amount: 999900,
      currency: "INR",
    })),
    fetch: vi.fn(async () => ({
      id: "order_test123",
      amount: 999900,
      currency: "INR",
      status: "created",
    })),
  },
};

/** Reset all mocks between tests. Call in beforeEach. */
export function resetMocks() {
  emailProviderMock.sendOtp.mockReset();
  emailProviderMock.sendWelcome.mockReset();
  emailProviderMock.sendLoginAlert.mockReset();
  twilioMock.sendVerification.mockReset();
  twilioMock.checkVerification.mockReset();
  razorpayMock.orders.create.mockReset();
  razorpayMock.orders.fetch.mockReset();
}
