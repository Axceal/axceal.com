import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { verifyCredentials } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

function testEmail() {
  return `test-${randomUUID()}@example.com`;
}

describe("auth/credentials.verifyCredentials", () => {
  const createdEmails: string[] = [];

  afterEach(async () => {
    for (const email of createdEmails.splice(0)) {
      await db.delete(users).where(eq(users.email, email));
    }
  });

  it("returns {id,email} for correct password", async () => {
    const email = testEmail();
    createdEmails.push(email);
    const passwordHash = await hashPassword("password123");
    await db.insert(users).values({ email, passwordHash });

    const result = await verifyCredentials(email, "password123");
    expect(result).not.toBeNull();
    expect(result!.email).toBe(email);
    expect(result!.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("returns null for wrong password", async () => {
    const email = testEmail();
    createdEmails.push(email);
    const passwordHash = await hashPassword("password123");
    await db.insert(users).values({ email, passwordHash });

    const result = await verifyCredentials(email, "wrong-password");
    expect(result).toBeNull();
  });

  it("returns null for non-existent user", async () => {
    const result = await verifyCredentials(testEmail(), "password123");
    expect(result).toBeNull();
  });

  it("is case-insensitive on email (citext)", async () => {
    const email = testEmail();
    createdEmails.push(email);
    const passwordHash = await hashPassword("password123");
    await db.insert(users).values({ email, passwordHash });

    const result = await verifyCredentials(email.toUpperCase(), "password123");
    expect(result).not.toBeNull();
    expect(result!.email).toBe(email);
  });
});
