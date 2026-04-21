import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

const { POST: ordersPOST } = await import("@/app/api/orders/route");

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
