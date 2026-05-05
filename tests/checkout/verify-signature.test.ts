import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/lib/razorpay/verify";

const SECRET = "test_secret_value";

describe("verifyPaymentSignature", () => {
  it("accepts a correct HMAC-SHA256(order_id|payment_id) signature", () => {
    const razorpayOrderId = "order_ABC123";
    const razorpayPaymentId = "pay_XYZ789";
    const expected = createHmac("sha256", SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const ok = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: expected,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const razorpayOrderId = "order_ABC123";
    const razorpayPaymentId = "pay_XYZ789";
    const expected = createHmac("sha256", SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    // Flip one byte
    const tampered =
      expected.slice(0, -1) + (expected.slice(-1) === "0" ? "1" : "0");

    const ok = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: tampered,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rejects when signed with a different secret", () => {
    const razorpayOrderId = "order_ABC123";
    const razorpayPaymentId = "pay_XYZ789";
    const wrong = createHmac("sha256", "other_secret")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const ok = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: wrong,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rejects a non-hex / wrong-length signature", () => {
    const ok = verifyPaymentSignature({
      razorpayOrderId: "order_x",
      razorpayPaymentId: "pay_y",
      signature: "not-even-hex",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts HMAC-SHA256(raw_body) when signature matches", () => {
    const rawBody = JSON.stringify({ id: "evt_1", event: "payment.captured" });
    const expected = createHmac("sha256", SECRET).update(rawBody).digest("hex");

    const ok = verifyWebhookSignature({
      rawBody,
      signature: expected,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("is sensitive to whitespace — reparsed/reserialized body fails", () => {
    const rawBody = `{"id":"evt_1","event":"payment.captured"}`;
    const expected = createHmac("sha256", SECRET).update(rawBody).digest("hex");

    const reserialized = JSON.stringify(JSON.parse(rawBody)) + " ";
    const ok = verifyWebhookSignature({
      rawBody: reserialized,
      signature: expected,
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });
});
