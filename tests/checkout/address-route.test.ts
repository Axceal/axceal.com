import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

import { requireSession } from "@/lib/auth/session";
import { createTestUser, createTestAddress } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const { GET: addressesGET, POST: addressesPOST } = await import("@/app/api/addresses/route");

const validAddress = {
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

function postJson(body: unknown): Request {
  return new Request("http://localhost/api/addresses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/addresses — validation", () => {
  it("rejects line1 > 50 chars with VALIDATION_FAILED (400)", async () => {
    const res = await addressesPOST(
      postJson({ ...validAddress, line1: "a".repeat(51) }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-digit phoneCountryCode with VALIDATION_FAILED (400)", async () => {
    const res = await addressesPOST(
      postJson({ ...validAddress, phoneCountryCode: "+91" }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects missing required firstName with VALIDATION_FAILED (400)", async () => {
    const { firstName: _omit, ...rest } = validAddress;
    void _omit;
    const res = await addressesPOST(postJson(rest));
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET /api/addresses — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("returns only caller's non-deleted addresses (user isolation)", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const addrA = await createTestAddress(userA.id);
    const addrB = await createTestAddress(userB.id);
    cleanups.push(
      () => addrA.cleanup(),
      () => addrB.cleanup(),
      () => userA.cleanup(),
      () => userB.cleanup(),
    );

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: userA.id }));
    const res = await addressesGET(makeRequest("GET", "/api/addresses"));

    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: Array<{ id: string }> }>(res);
    expect(body.data.some((a) => a.id === addrA.id)).toBe(true);
    expect(body.data.some((a) => a.id === addrB.id)).toBe(false);
  });

  it("soft-deleted addresses excluded from list", async () => {
    const user = await createTestUser();
    const addr = await createTestAddress(user.id);
    cleanups.push(() => addr.cleanup(), () => user.cleanup());

    await db.update(addresses).set({ deletedAt: new Date() }).where(eq(addresses.id, addr.id));

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    const res = await addressesGET(makeRequest("GET", "/api/addresses"));

    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: Array<{ id: string }> }>(res);
    expect(body.data.some((a) => a.id === addr.id)).toBe(false);
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await addressesGET(makeRequest("GET", "/api/addresses"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/addresses — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("creates address linked to session user → 200 with id", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await addressesPOST(makeRequest("POST", "/api/addresses", validAddress));
    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: { id: string; firstName: string } }>(res);
    expect(body.data.firstName).toBe(validAddress.firstName);
    expect(typeof body.data.id).toBe("string");

    cleanups.unshift(async () => {
      await db.delete(addresses).where(eq(addresses.id, body.data.id));
    });
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await addressesPOST(makeRequest("POST", "/api/addresses", validAddress));
    expect(res.status).toBe(401);
  });
});
