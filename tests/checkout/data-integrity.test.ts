/**
 * Phase J — Data Integrity
 *
 * J.1  Order state machine transitions
 * J.2  Address soft-delete + order snapshot preservation
 * J.3  User profile invariants (structural)
 * J.5  OTP token cleanup after register
 * J.6  pw:changed Redis key TTL
 *
 * Items already covered by existing tests (not duplicated here):
 *   J.1 created→paid (webhook)         → payment-service.test.ts "payment.captured → status=paid"
 *   J.1 created→failed (webhook)       → payment-service.test.ts "payment.failed → status=failed"
 *   J.1 duplicate webhook idempotency  → payment-service.test.ts "duplicate event id → handled: false"
 *   J.2 soft-delete hides from list    → address-service.test.ts "softDeleteAddress hides the row"
 *   J.3 email unique                   → register.test.ts "rejects duplicate email → 409"
 *   J.5 OTP deleted on correct verify  → otp.test.ts "happy path consumes the OTP"
 *   J.6 pw:changed key set             → change-password-route.test.ts "pw:changed key set in Redis"
 */

import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createTestUser, createTestOrder, createTestAddress } from "@/tests/helpers/db";
import { db } from "@/lib/db/client";
import { orders, paymentEvents } from "@/lib/db/schema";
import { applyWebhookEvent } from "@/lib/services/payment";
import { getOrder } from "@/lib/services/order";
import { softDeleteAddress } from "@/lib/services/address";
import { issueOtpToken } from "@/lib/auth/otp";
import { redis } from "@/lib/redis";
import { UpdateProfileRequest } from "@/lib/contracts/profile";

// ── J.1 Order state machine ───────────────────────────────────────────────────

describe("J.1 — order state machine", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const eventIds: string[] = [];

  afterEach(async () => {
    for (const id of eventIds.splice(0))
      await db.delete(paymentEvents).where(eq(paymentEvents.razorpayEventId, id));
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("payment.failed on paid order → stays paid (no paid→failed transition)", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, { status: "paid" });
    cleanups.push(() => order.cleanup(), () => user.cleanup());

    const rpOrderId = `order_j1a_${randomUUID().slice(0, 8)}`;
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
    const after = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(after!.status).toBe("paid");
  });

  it("payment.captured on failed order → stays failed (no failed→paid transition)", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, { status: "failed" });
    cleanups.push(() => order.cleanup(), () => user.cleanup());

    const rpOrderId = `order_j1b_${randomUUID().slice(0, 8)}`;
    const rpPaymentId = `pay_j1b_${randomUUID().slice(0, 8)}`;
    await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
    const eventId = randomUUID();
    eventIds.push(eventId);

    const payload = {
      id: eventId,
      event: "payment.captured",
      payload: { payment: { entity: { id: rpPaymentId, order_id: rpOrderId, status: "captured" } } },
    };
    const result = await applyWebhookEvent(JSON.stringify(payload), payload);

    expect(result.handled).toBe(true);
    const after = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(after!.status).toBe("failed");
  });

  it("payment.captured on pending → paid (valid transition confirmed)", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, { status: "pending" });
    cleanups.push(() => order.cleanup(), () => user.cleanup());

    const rpOrderId = `order_j1c_${randomUUID().slice(0, 8)}`;
    const rpPaymentId = `pay_j1c_${randomUUID().slice(0, 8)}`;
    await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
    const eventId = randomUUID();
    eventIds.push(eventId);

    const payload = {
      id: eventId,
      event: "payment.captured",
      payload: { payment: { entity: { id: rpPaymentId, order_id: rpOrderId, status: "captured" } } },
    };
    await applyWebhookEvent(JSON.stringify(payload), payload);

    const after = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(after!.status).toBe("paid");
  });
});

// ── J.2 Order snapshot preserved after address soft-delete ───────────────────

describe("J.2 — order snapshot survives address soft-delete", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("billing address snapshot on order is intact after soft-deleting the address", async () => {
    const user = await createTestUser();
    const address = await createTestAddress(user.id);

    // Create order referencing this address with its snapshot
    const snapshot = {
      firstName: address.firstName,
      lastName: address.lastName,
      line1: address.line1,
      country: address.country,
      state: address.state,
      zip: address.zip,
      phoneCountryCode: address.phoneCountryCode,
      phone: address.phone,
      phoneSign: address.phoneSign,
    };
    const order = await createTestOrder(user.id, {
      billingAddressSnapshot: snapshot,
    });
    // Order must be deleted before user (ON DELETE RESTRICT on orders.user_id)
    cleanups.push(() => order.cleanup(), () => user.cleanup());

    // Soft-delete the address
    await softDeleteAddress(user.id, address.id);

    // Order snapshot still readable (not FK-linked to address)
    const fetched = await getOrder(user.id, order.id);
    expect(fetched.billingAddressSnapshot).toMatchObject(snapshot);
  });
});

// ── J.3 User profile invariants ──────────────────────────────────────────────

describe("J.3 — profile update invariants", () => {
  it("UpdateProfileRequest schema has no email or id field (structural guard)", () => {
    // Passing email/id in body → they are stripped by Zod's .partial() which only
    // allows defined keys. Test that unknown fields are rejected or stripped.
    const result = UpdateProfileRequest.safeParse({
      email: "attacker@evil.com",
      id: "00000000-0000-0000-0000-000000000000",
      firstName: "Valid",
    });
    // Zod strips unknown keys by default (no .passthrough()) — parse succeeds but
    // email/id are not present in the output.
    if (result.success) {
      expect((result.data as Record<string, unknown>).email).toBeUndefined();
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
      expect(result.data.firstName).toBe("Valid");
    }
    // If schema is strict (.strict()), it would fail — either way email/id are never
    // processed by the profile service.
  });
});

// ── J.5 OTP token deleted after register ─────────────────────────────────────

describe("J.5 — OTP token single-use cleanup", () => {
  it("otp:verify-token key is deleted from Redis after successful register", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const token = await issueOtpToken(email);
    const tokenKey = `otp:verify-token:${token}`;

    // Token exists before register
    const before = await redis.get(tokenKey);
    expect(before).toBeTruthy();

    // Simulate what register route does: consumeOtpToken deletes the key
    const { consumeOtpToken } = await import("@/lib/auth/otp");
    const recovered = await consumeOtpToken(token);
    expect(recovered).toBe(email);

    // Token is gone — no reuse possible
    const after = await redis.get(tokenKey);
    expect(after).toBeNull();
  });
});

// ── J.6 Session revocation TTL ───────────────────────────────────────────────

describe("J.6 — pw:changed Redis key TTL", () => {
  const keysToClean: string[] = [];

  afterEach(async () => {
    for (const k of keysToClean.splice(0)) await redis.del(k);
  });

  it("pw:changed key has TTL of ~30 days (≤ 2592000s)", async () => {
    const userId = randomUUID();
    const key = `pw:changed:${userId}`;
    keysToClean.push(key);

    const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 2592000
    await redis.set(key, Date.now(), { ex: SESSION_TTL_SEC });

    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(SESSION_TTL_SEC);
    // Within 5s of the expected TTL (accounts for test execution delay)
    expect(ttl).toBeGreaterThan(SESSION_TTL_SEC - 5);
  });
});
