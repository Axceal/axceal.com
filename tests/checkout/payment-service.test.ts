import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { razorpayMock, resetMocks } from "@/tests/helpers/mocks";

vi.mock("@/lib/razorpay/client", () => ({ getRazorpayClient: () => razorpayMock }));

import { initiatePayment, verifyPayment, applyWebhookEvent } from "@/lib/services/payment";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { db } from "@/lib/db/client";
import { orders, paymentEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { AERO } from "@/lib/product";

function sign(rpOrderId: string, rpPaymentId: string): string {
  return createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${rpOrderId}|${rpPaymentId}`)
    .digest("hex");
}

describe("payment service", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const eventIds: string[] = [];

  beforeEach(() => resetMocks());

  afterEach(async () => {
    for (const id of eventIds.splice(0))
      await db.delete(paymentEvents).where(eq(paymentEvents.razorpayEventId, id));
    for (const fn of cleanups.splice(0)) await fn();
  });

  // ─── initiatePayment ─────────────────────────────────────────────────────────

  describe("initiatePayment", () => {
    it("calls Razorpay SDK, stores razorpayOrderId, returns correct fields", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());

      const rpId = `order_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
      razorpayMock.orders.create.mockResolvedValueOnce({
        id: rpId,
        amount: order.totalPaise,
        currency: "INR",
      });

      const result = await initiatePayment(user.id, { orderId: order.id });

      expect(result.razorpayOrderId).toBe(rpId);
      expect(result.razorpayKeyId).toBe(env.RAZORPAY_KEY_ID);
      expect(result.amountPaise).toBe(order.totalPaise);
      expect(result.currency).toBe("INR");
      expect(razorpayMock.orders.create).toHaveBeenCalledOnce();

      const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(updated!.razorpayOrderId).toBe(rpId);
    });

    it("existing razorpayOrderId skips SDK call (idempotent)", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const existingRpId = `order_exist_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: existingRpId }).where(eq(orders.id, order.id));

      const result = await initiatePayment(user.id, { orderId: order.id });

      expect(result.razorpayOrderId).toBe(existingRpId);
      expect(razorpayMock.orders.create).not.toHaveBeenCalled();
    });

    it("amount comes from DB — not caller-supplied", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { quantity: 3 });
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpId = `order_amt_${randomUUID().slice(0, 8)}`;
      razorpayMock.orders.create.mockResolvedValueOnce({ id: rpId, amount: order.totalPaise, currency: "INR" });

      const result = await initiatePayment(user.id, { orderId: order.id });

      expect(result.amountPaise).toBe(AERO.priceInPaise * 3);
    });

    it("order not found → AppError 404", async () => {
      const user = await createTestUser();
      cleanups.push(() => user.cleanup());
      await expect(initiatePayment(user.id, { orderId: randomUUID() }))
        .rejects.toMatchObject({ status: 404 });
    });

    it("different user's order (IDOR) → AppError 404", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const order = await createTestOrder(owner.id);
      cleanups.push(() => order.cleanup(), () => owner.cleanup(), () => attacker.cleanup());

      await expect(initiatePayment(attacker.id, { orderId: order.id }))
        .rejects.toMatchObject({ status: 404 });
    });

    it("already paid order → AppError 409", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { status: "paid" });
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      await expect(initiatePayment(user.id, { orderId: order.id }))
        .rejects.toMatchObject({ status: 409 });
    });

    it("failed order → AppError 422", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { status: "failed" });
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      await expect(initiatePayment(user.id, { orderId: order.id }))
        .rejects.toMatchObject({ status: 422 });
    });

    it("Razorpay SDK throws → AppError 502", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      razorpayMock.orders.create.mockRejectedValueOnce(new Error("network error"));
      await expect(initiatePayment(user.id, { orderId: order.id }))
        .rejects.toMatchObject({ status: 502 });
    });
  });

  // ─── verifyPayment ────────────────────────────────────────────────────────────

  describe("verifyPayment", () => {
    it("valid signature → status paid, DB updated", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_vp_${randomUUID().slice(0, 8)}`;
      const rpPaymentId = `pay_vp_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));

      const result = await verifyPayment(user.id, {
        orderId: order.id,
        razorpayOrderId: rpOrderId,
        razorpayPaymentId: rpPaymentId,
        razorpaySignature: sign(rpOrderId, rpPaymentId),
      });

      expect(result.status).toBe("paid");
      const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(updated!.status).toBe("paid");
      expect(updated!.razorpayPaymentId).toBe(rpPaymentId);
    });

    it("already paid order → idempotent { status: paid }, no re-write", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { status: "paid" });
      cleanups.push(() => order.cleanup(), () => user.cleanup());

      const result = await verifyPayment(user.id, {
        orderId: order.id,
        razorpayOrderId: `order_x_${randomUUID().slice(0, 8)}`,
        razorpayPaymentId: `pay_x_${randomUUID().slice(0, 8)}`,
        razorpaySignature: "anysig",
      });

      expect(result.status).toBe("paid");
    });

    it("invalid signature → AppError 400, order stays pending", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_bad_${randomUUID().slice(0, 8)}`;
      const rpPaymentId = `pay_bad_${randomUUID().slice(0, 8)}`;

      await expect(verifyPayment(user.id, {
        orderId: order.id,
        razorpayOrderId: rpOrderId,
        razorpayPaymentId: rpPaymentId,
        razorpaySignature: "deadbeef".repeat(8),
      })).rejects.toMatchObject({ status: 400 });

      const unchanged = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(unchanged!.status).toBe("pending");
    });

    it("razorpayOrderId mismatch with stored value → AppError 400", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      await db.update(orders).set({ razorpayOrderId: `order_stored_${randomUUID().slice(0, 6)}` }).where(eq(orders.id, order.id));

      await expect(verifyPayment(user.id, {
        orderId: order.id,
        razorpayOrderId: `order_different_${randomUUID().slice(0, 6)}`,
        razorpayPaymentId: "pay_x",
        razorpaySignature: "abc",
      })).rejects.toMatchObject({ status: 400 });
    });

    it("different user's order (IDOR) → AppError 404", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const order = await createTestOrder(owner.id);
      cleanups.push(() => order.cleanup(), () => owner.cleanup(), () => attacker.cleanup());

      await expect(verifyPayment(attacker.id, {
        orderId: order.id,
        razorpayOrderId: "order_x",
        razorpayPaymentId: "pay_x",
        razorpaySignature: "sig_x",
      })).rejects.toMatchObject({ status: 404 });
    });

    it("non-pending, non-paid order → AppError 422", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { status: "failed" });
      cleanups.push(() => order.cleanup(), () => user.cleanup());

      await expect(verifyPayment(user.id, {
        orderId: order.id,
        razorpayOrderId: "order_x",
        razorpayPaymentId: "pay_x",
        razorpaySignature: "sig_x",
      })).rejects.toMatchObject({ status: 422 });
    });
  });

  // ─── applyWebhookEvent ────────────────────────────────────────────────────────

  describe("applyWebhookEvent", () => {
    it("payment.captured → order status = paid", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh1_${randomUUID().slice(0, 8)}`;
      const rpPaymentId = `pay_wh1_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.captured",
        payload: { payment: { entity: { id: rpPaymentId, order_id: rpOrderId, status: "captured", amount: order.totalPaise, currency: "INR" } } },
      };
      const result = await applyWebhookEvent(JSON.stringify(payload), payload);

      expect(result.handled).toBe(true);
      const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(updated!.status).toBe("paid");
      expect(updated!.razorpayPaymentId).toBe(rpPaymentId);
    });

    // F13.2 — webhook with mismatched amount must NOT flip status
    it("payment.captured with amount mismatch → order stays pending", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh_mm_${randomUUID().slice(0, 8)}`;
      const rpPaymentId = `pay_wh_mm_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.captured",
        payload: { payment: { entity: { id: rpPaymentId, order_id: rpOrderId, status: "captured", amount: 1, currency: "INR" } } },
      };
      const result = await applyWebhookEvent(JSON.stringify(payload), payload);
      expect(result.handled).toBe(true);
      const after = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(after!.status).toBe("pending");
    });

    it("payment.failed → order status = failed", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh2_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.failed",
        payload: { payment: { entity: { id: undefined, order_id: rpOrderId, status: "failed" } } },
      };
      const result = await applyWebhookEvent(JSON.stringify(payload), payload);

      expect(result.handled).toBe(true);
      const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(updated!.status).toBe("failed");
    });

    it("duplicate event id → handled: false (idempotent)", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh3_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_dup", order_id: rpOrderId, amount: order.totalPaise, currency: "INR" } } },
      };
      const first = await applyWebhookEvent(JSON.stringify(payload), payload);
      expect(first.handled).toBe(true);

      const second = await applyWebhookEvent(JSON.stringify(payload), payload);
      expect(second.handled).toBe(false);
    });

    it("unknown event type → no order update, event recorded", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id);
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh4_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.authorized",
        payload: { payment: { entity: { id: "pay_x", order_id: rpOrderId } } },
      };
      const result = await applyWebhookEvent(JSON.stringify(payload), payload);

      expect(result.handled).toBe(true);
      const unchanged = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(unchanged!.status).toBe("pending");
    });

    it("missing event id → handled: false", async () => {
      const payload = { event: "payment.captured", payload: {} } as Parameters<typeof applyWebhookEvent>[1];
      const result = await applyWebhookEvent("{}", payload);
      expect(result.handled).toBe(false);
    });

    it("payment.captured on already-paid order → no double-update", async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user.id, { status: "paid" });
      cleanups.push(() => order.cleanup(), () => user.cleanup());
      const rpOrderId = `order_wh5_${randomUUID().slice(0, 8)}`;
      await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
      const eventId = randomUUID();
      eventIds.push(eventId);

      const payload = {
        id: eventId,
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_new", order_id: rpOrderId, status: "captured", amount: order.totalPaise, currency: "INR" } } },
      };
      await applyWebhookEvent(JSON.stringify(payload), payload);

      const still = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(still!.status).toBe("paid");
    });
  });
});
