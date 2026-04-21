import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

const { POST: addressesPOST } = await import("@/app/api/addresses/route");

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

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
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
