import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, userProfiles } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { getProfile, updateProfile } from "@/lib/services/profile";

async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  const passwordHash = await hashPassword("password123");
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();
  await db.insert(userProfiles).values({ userId: user.id });
  return { userId: user.id, email };
}

describe("services/profile", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds.splice(0)) {
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("getProfile returns all-null fields (phoneSign defaults to '+') for a fresh user", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    const profile = await getProfile(userId);
    expect(profile.firstName).toBeNull();
    expect(profile.lastName).toBeNull();
    expect(profile.birthday).toBeNull();
    expect(profile.gender).toBeNull();
    expect(profile.phoneCountryCode).toBeNull();
    expect(profile.phone).toBeNull();
    expect(profile.phoneSign).toBe("+");
  });

  it("PUT -> GET roundtrip across all fields", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    await updateProfile(userId, {
      firstName: "Ada",
      lastName: "Lovelace",
      birthday: "1815-12-10",
      gender: "female",
      phoneCountryCode: "44",
      phone: "5551234567",
      phoneSign: "-",
    });

    const profile = await getProfile(userId);
    expect(profile.firstName).toBe("Ada");
    expect(profile.lastName).toBe("Lovelace");
    expect(profile.birthday).toBe("1815-12-10");
    expect(profile.gender).toBe("female");
    expect(profile.phoneCountryCode).toBe("44");
    expect(profile.phone).toBe("5551234567");
    expect(profile.phoneSign).toBe("-");
  });

  it("partial updates preserve previously-written fields", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    await updateProfile(userId, { firstName: "Ada", lastName: "Lovelace" });
    await updateProfile(userId, { gender: "female" });

    const profile = await getProfile(userId);
    expect(profile.firstName).toBe("Ada");
    expect(profile.lastName).toBe("Lovelace");
    expect(profile.gender).toBe("female");
  });

  it("updateProfile with empty patch is a no-op", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    await updateProfile(userId, { firstName: "Ada" });
    const returned = await updateProfile(userId, {});
    expect(returned.firstName).toBe("Ada");
  });

  it("upserts when user_profiles row is missing", async () => {
    const { userId } = await createTestUser();
    createdUserIds.push(userId);

    // Delete the auto-created profile row to prove upsert creates it.
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));

    const profile = await updateProfile(userId, { firstName: "Grace" });
    expect(profile.firstName).toBe("Grace");
    expect(profile.lastName).toBeNull();
  });
});
