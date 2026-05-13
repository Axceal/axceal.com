import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { issueOtpToken } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { users, userProfiles } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

function testEmail() {
  return `test-${randomUUID()}@example.com`;
}

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("POST /api/auth/register", () => {
  const createdEmails: string[] = [];

  beforeEach(async () => {
    await redis.del("register:ip:unknown");
  });

  afterEach(async () => {
    await redis.del("register:ip:unknown");
    for (const email of createdEmails.splice(0)) {
      await db.delete(users).where(eq(users.email, email));
    }
  });

  it("rejects invalid otpToken with OTP_EXPIRED", async () => {
    const email = testEmail();
    const res = await registerPOST(
      postJson({ email, password: "password123", otpToken: randomUUID() }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("OTP_EXPIRED");
  });

  it("rejects when token email does not match submitted email", async () => {
    const tokenEmail = testEmail();
    const otherEmail = testEmail();
    const otpToken = await issueOtpToken(tokenEmail, "email-verify");

    const res = await registerPOST(
      postJson({ email: otherEmail, password: "password123", otpToken }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("rejects duplicate email with EMAIL_EXISTS (409)", async () => {
    const email = testEmail();
    createdEmails.push(email);

    // Seed an existing user directly.
    const passwordHash = await hashPassword("password123");
    await db.insert(users).values({ email, passwordHash });

    const otpToken = await issueOtpToken(email, "email-verify");
    const res = await registerPOST(
      postJson({ email, password: "password123", otpToken }),
    );
    expect(res.status).toBe(409);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("EMAIL_EXISTS");
  });

  it("happy path: creates user + empty profile, returns userId, hash is bcrypt", async () => {
    const email = testEmail();
    createdEmails.push(email);
    const otpToken = await issueOtpToken(email, "email-verify");

    const res = await registerPOST(
      postJson({ email, password: "password123", otpToken }),
    );
    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: { userId: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toMatch(/^[0-9a-f-]{36}$/i);

    const row = await db.query.users.findFirst({ where: eq(users.email, email) });
    expect(row).toBeTruthy();
    expect(row!.passwordHash).toMatch(/^\$2[aby]\$/);

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, row!.id),
    });
    expect(profile).toBeTruthy();
    expect(profile!.firstName).toBeNull();
    expect(profile!.lastName).toBeNull();
  });
});
