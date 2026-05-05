import { describe, it, expect, afterEach } from "vitest";
import { createTestUser } from "@/tests/helpers/db";
import { getAccountOverview } from "@/lib/services/account";
import { AppError } from "@/lib/http/errors";
import { randomUUID } from "node:crypto";

describe("services/account", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("getAccountOverview returns email, createdAt, profile for valid user", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    const overview = await getAccountOverview(user.id);
    expect(overview.email).toBe(user.email);
    expect(typeof overview.createdAt).toBe("string");
    expect(overview.profile).toBeDefined();
    expect(overview.profile.firstName).toBeNull();
  });

  it("getAccountOverview throws NOT_FOUND for unknown userId", async () => {
    await expect(getAccountOverview(randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});
