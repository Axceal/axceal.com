import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

const { POST: initiatePOST } = await import(
  "@/app/api/payments/initiate/route"
);
const { POST: verifyPOST } = await import("@/app/api/payments/verify/route");

function postJson(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("POST /api/payments/initiate — validation", () => {
  it("rejects missing orderId with VALIDATION_FAILED (400)", async () => {
    const res = await initiatePOST(
      postJson("http://localhost/api/payments/initiate", {}),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-UUID orderId with VALIDATION_FAILED (400)", async () => {
    const res = await initiatePOST(
      postJson("http://localhost/api/payments/initiate", {
        orderId: "not-a-uuid",
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("POST /api/payments/verify — validation", () => {
  it("rejects body missing razorpaySignature with VALIDATION_FAILED (400)", async () => {
    const res = await verifyPOST(
      postJson("http://localhost/api/payments/verify", {
        orderId: "11111111-1111-1111-1111-111111111111",
        razorpayOrderId: "order_abc",
        razorpayPaymentId: "pay_xyz",
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-UUID orderId with VALIDATION_FAILED (400)", async () => {
    const res = await verifyPOST(
      postJson("http://localhost/api/payments/verify", {
        orderId: "not-a-uuid",
        razorpayOrderId: "order_abc",
        razorpayPaymentId: "pay_xyz",
        razorpaySignature: "deadbeef",
      }),
    );
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});
