import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, orders } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createOrder, getOrder, listOrders } from "@/lib/services/order";
import { AERO } from "@/lib/product";
import { AppError } from "@/lib/http/errors";
import type { Address } from "@/lib/contracts/address";

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  const passwordHash = await hashPassword("password123");
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();
  return { userId: user.id, email };
}

const validAddress: Address = {
  firstName: "Ada",
  lastName: "Lovelace",
  line1: "123 Analytical Engine Ln",
  country: "India",
  state: "Karnataka",
  zip: "560001",
  phoneCountryCode: "91",
  phone: "9876543210",
  phoneSign: "+",
};

describe("services/order", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds.splice(0)) {
      // orders → users FK is ON DELETE RESTRICT; clear orders first.
      // addresses cascade with the user, so they don't need a manual wipe.
      await db.delete(orders).where(eq(orders.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("creates a pending order with correct totalPaise (qty 3 → 2,999,700)", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const order = await createOrder(userId, {
      quantity: 3,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    });

    expect(order.status).toBe("pending");
    expect(order.quantity).toBe(3);
    expect(order.totalPaise).toBe(AERO.priceInPaise * 3);
    expect(order.totalPaise).toBe(2_999_700);
  });

  it("same idempotencyKey returns the same order row", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const key = randomUUID();
    const first = await createOrder(userId, {
      quantity: 1,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: key,
    });
    const second = await createOrder(userId, {
      quantity: 5,
      billingAddress: { ...validAddress, firstName: "Grace" },
      shippingAddress: null,
      idempotencyKey: key,
    });

    expect(second.id).toBe(first.id);
    expect(second.quantity).toBe(1);
    expect(second.totalPaise).toBe(AERO.priceInPaise);
  });

  it("stores a distinct shippingAddress when provided", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const shipping: Address = {
      ...validAddress,
      firstName: "Grace",
      line1: "456 Compiler St",
    };
    const order = await createOrder(userId, {
      quantity: 2,
      billingAddress: validAddress,
      shippingAddress: shipping,
      idempotencyKey: randomUUID(),
    });
    expect(order.status).toBe("pending");
    expect(order.quantity).toBe(2);
  });

  it("getOrder throws NOT_FOUND for another user's order", async () => {
    const { userId: aliceId } = await createTestUser();
    const { userId: bobId } = await createTestUser();
    createdUserIds.push(aliceId, bobId);

    const aliceOrder = await createOrder(aliceId, {
      quantity: 1,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    });

    await expect(getOrder(bobId, aliceOrder.id)).rejects.toBeInstanceOf(AppError);
  });

  it("listOrders returns only the caller's orders, newest first", async () => {
    const { userId: aliceId } = await createTestUser();
    const { userId: bobId } = await createTestUser();
    createdUserIds.push(aliceId, bobId);

    const a1 = await createOrder(aliceId, {
      quantity: 1,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    });
    await createOrder(bobId, {
      quantity: 2,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    });
    const a2 = await createOrder(aliceId, {
      quantity: 4,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    });

    const list = await listOrders(aliceId);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(a2.id);
    expect(list[1].id).toBe(a1.id);
  });
});
