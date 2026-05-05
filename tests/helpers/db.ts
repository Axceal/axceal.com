import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, addresses, orders } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { AERO } from "@/lib/product";
import type { Address } from "@/lib/contracts/address";

const TEST_PASSWORD = "TestPassword123!";

export async function createTestUser(overrides?: { email?: string; passwordHash?: string }) {
  const email = overrides?.email ?? `test-${randomUUID()}@example.com`;
  const passwordHash = overrides?.passwordHash ?? await hashPassword(TEST_PASSWORD);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    async cleanup() {
      await db.delete(users).where(eq(users.id, user.id));
    },
  };
}

const BASE_ADDRESS: Address = {
  firstName: "Test",
  lastName: "User",
  line1: "123 Test Street",
  country: "India",
  state: "Karnataka",
  zip: "560001",
  phoneCountryCode: "91",
  phone: "9876543210",
  phoneSign: "+",
};

export async function createTestAddress(userId: string, overrides?: Partial<Address>) {
  const data = { ...BASE_ADDRESS, ...overrides };
  const [address] = await db
    .insert(addresses)
    .values({ userId, ...data })
    .returning();
  return {
    ...address,
    async cleanup() {
      await db.delete(addresses).where(eq(addresses.id, address.id));
    },
  };
}

export async function createTestOrder(
  userId: string,
  overrides?: {
    sku?: string;
    quantity?: number;
    unitPricePaise?: number;
    totalPaise?: number;
    status?: string;
    billingAddressSnapshot?: Record<string, unknown>;
  },
) {
  const quantity = overrides?.quantity ?? 1;
  const unitPricePaise = overrides?.unitPricePaise ?? AERO.priceInPaise;
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      sku: overrides?.sku ?? AERO.sku,
      quantity,
      unitPricePaise,
      totalPaise: overrides?.totalPaise ?? unitPricePaise * quantity,
      status: overrides?.status ?? "pending",
      billingAddressSnapshot: overrides?.billingAddressSnapshot ?? BASE_ADDRESS,
    })
    .returning();
  return {
    ...order,
    async cleanup() {
      await db.delete(orders).where(eq(orders.id, order.id));
    },
  };
}
