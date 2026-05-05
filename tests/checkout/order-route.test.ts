import { describe, it, expect, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

import { requireSession } from "@/lib/auth/session";
import { makeSession } from "@/tests/helpers/session";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { makeRequest } from "@/tests/helpers/request";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { AERO } from "@/lib/product";

const { GET: ordersGET, POST: ordersPOST } = await import("@/app/api/orders/route");

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
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("POST /api/orders — validation", () => {
  it("rejects quantity 0 with VALIDATION_FAILED (400)", async () => {
    const res = await ordersPOST(
      postJson({
        quantity: 0,
        billingAddress: validAddress,
        shippingAddress: null,
        idempotencyKey: randomUUID(),
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects quantity 6 with VALIDATION_FAILED (400)", async () => {
    const res = await ordersPOST(
      postJson({
        quantity: 6,
        billingAddress: validAddress,
        shippingAddress: null,
        idempotencyKey: randomUUID(),
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects billing line1 > 50 chars with VALIDATION_FAILED (400)", async () => {
    const res = await ordersPOST(
      postJson({
        quantity: 1,
        billingAddress: { ...validAddress, line1: "a".repeat(51) },
        shippingAddress: null,
        idempotencyKey: randomUUID(),
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-UUID idempotencyKey with VALIDATION_FAILED (400)", async () => {
    const res = await ordersPOST(
      postJson({
        quantity: 1,
        billingAddress: validAddress,
        shippingAddress: null,
        idempotencyKey: "not-a-uuid",
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET /api/orders — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("returns only caller's orders (user isolation)", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const orderA = await createTestOrder(userA.id);
    const orderB = await createTestOrder(userB.id);
    cleanups.push(
      () => orderA.cleanup(),
      () => orderB.cleanup(),
      () => userA.cleanup(),
      () => userB.cleanup(),
    );

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: userA.id }));
    const res = await ordersGET(makeRequest("GET", "/api/orders"));

    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: Array<{ id: string }> }>(res);
    expect(body.data.some((o) => o.id === orderA.id)).toBe(true);
    expect(body.data.some((o) => o.id === orderB.id)).toBe(false);
  });

  it("returns newest-first ordering", async () => {
    const user = await createTestUser();
    const order1 = await createTestOrder(user.id);
    const order2 = await createTestOrder(user.id);
    cleanups.push(() => order1.cleanup(), () => order2.cleanup(), () => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    const res = await ordersGET(makeRequest("GET", "/api/orders"));

    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: Array<{ id: string; createdAt: string }> }>(res);
    const userOrders = body.data.filter((o) => o.id === order1.id || o.id === order2.id);
    expect(userOrders.length).toBe(2);
    expect(new Date(userOrders[0].createdAt) >= new Date(userOrders[1].createdAt)).toBe(true);
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await ordersGET(makeRequest("GET", "/api/orders"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/orders — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("creates order with server-computed price (not client-supplied)", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await ordersPOST(makeRequest("POST", "/api/orders", {
      quantity: 2,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey: randomUUID(),
    }));

    expect(res.status).toBe(200);
    const body = await readJson<{ ok: true; data: { id: string; totalPaise: number } }>(res);
    expect(body.data.totalPaise).toBe(AERO.priceInPaise * 2);

    cleanups.unshift(async () => {
      await db.delete(orders).where(eq(orders.id, body.data.id));
    });
  });

  it("idempotency: same key returns same order", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const idempotencyKey = randomUUID();

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    const res1 = await ordersPOST(makeRequest("POST", "/api/orders", {
      quantity: 1,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey,
    }));
    expect(res1.status).toBe(200);
    const body1 = await readJson<{ ok: true; data: { id: string } }>(res1);

    cleanups.unshift(async () => {
      await db.delete(orders).where(eq(orders.id, body1.data.id));
    });

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    const res2 = await ordersPOST(makeRequest("POST", "/api/orders", {
      quantity: 1,
      billingAddress: validAddress,
      shippingAddress: null,
      idempotencyKey,
    }));
    expect(res2.status).toBe(200);
    const body2 = await readJson<{ ok: true; data: { id: string } }>(res2);

    expect(body2.data.id).toBe(body1.data.id);
  });
});
