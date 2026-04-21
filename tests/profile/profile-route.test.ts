import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(async () => null),
  requireSession: vi.fn(async () => {
    throw new Error(
      "requireSession should not be reached in validation-failure tests",
    );
  }),
}));

const { PUT: profilePUT } = await import("@/app/api/account/profile/route");

function putJson(body: unknown): Request {
  return new Request("http://localhost/api/account/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("PUT /api/account/profile — validation", () => {
  it("rejects malformed birthday with VALIDATION_FAILED (400)", async () => {
    const res = await profilePUT(putJson({ birthday: "not-a-date" }));
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects out-of-enum gender with VALIDATION_FAILED (400)", async () => {
    const res = await profilePUT(putJson({ gender: "Female" }));
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-digit phoneCountryCode with VALIDATION_FAILED (400)", async () => {
    const res = await profilePUT(putJson({ phoneCountryCode: "+91" }));
    expect(res.status).toBe(400);
    const body = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});
