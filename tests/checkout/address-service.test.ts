import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  createAddress,
  listAddresses,
  softDeleteAddress,
} from "@/lib/services/address";
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

describe("services/address", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds.splice(0)) {
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("create → list round-trip", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const created = await createAddress(userId, validAddress);
    expect(created.id).toBeDefined();
    expect(created.firstName).toBe("Ada");
    expect(created.isDefaultBilling).toBe(false);
    expect(created.isDefaultShipping).toBe(false);

    const list = await listAddresses(userId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("softDeleteAddress hides the row from listAddresses", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const created = await createAddress(userId, validAddress);
    await softDeleteAddress(userId, created.id);

    const list = await listAddresses(userId);
    expect(list).toHaveLength(0);
  });

  it("softDeleteAddress throws NOT_FOUND for another user's address", async () => {
    const { userId: aliceId } = await createTestUser();
    const { userId: bobId } = await createTestUser();
    createdUserIds.push(aliceId, bobId);

    const aliceAddr = await createAddress(aliceId, validAddress);
    await expect(
      softDeleteAddress(bobId, aliceAddr.id),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("listAddresses isolates by user", async () => {
    const { userId: aliceId } = await createTestUser();
    const { userId: bobId } = await createTestUser();
    createdUserIds.push(aliceId, bobId);

    await createAddress(aliceId, validAddress);
    await createAddress(bobId, { ...validAddress, firstName: "Grace" });

    const aliceList = await listAddresses(aliceId);
    const bobList = await listAddresses(bobId);
    expect(aliceList).toHaveLength(1);
    expect(bobList).toHaveLength(1);
    expect(aliceList[0].firstName).toBe("Ada");
    expect(bobList[0].firstName).toBe("Grace");
  });
});
