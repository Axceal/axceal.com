import { describe, it, expect, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/services/address", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/services/address")>();
  return { ...real, softDeleteAddress: vi.fn(real.softDeleteAddress) };
});

import { requireSession } from "@/lib/auth/session";
import { softDeleteAddress } from "@/lib/services/address";
import { DELETE } from "@/app/api/addresses/[id]/route";
import { createTestUser, createTestAddress } from "@/tests/helpers/db";
import { deleteRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";

type OkBody = { ok: true; data: { deleted: boolean } };
type ErrBody = { ok: false; error: { code: string } };

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/addresses/:id", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("owner soft-deletes address → 200, deleted: true", async () => {
    const user = await createTestUser();
    const address = await createTestAddress(user.id);
    cleanups.push(() => address.cleanup(), () => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await DELETE(deleteRequest(`/api/addresses/${address.id}`), ctx(address.id));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.deleted).toBe(true);
  });

  it("non-owner → 404 (IDOR guard)", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const address = await createTestAddress(owner.id);
    cleanups.push(() => address.cleanup(), () => owner.cleanup(), () => attacker.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: attacker.id }));

    const res = await DELETE(deleteRequest(`/api/addresses/${address.id}`), ctx(address.id));
    expect(res.status).toBe(404);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("non-UUID id → 400 VALIDATION_FAILED", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await DELETE(deleteRequest("/api/addresses/not-a-uuid"), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("already soft-deleted → 404", async () => {
    const user = await createTestUser();
    const address = await createTestAddress(user.id);
    cleanups.push(() => address.cleanup(), () => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    await DELETE(deleteRequest(`/api/addresses/${address.id}`), ctx(address.id));

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    const res = await DELETE(deleteRequest(`/api/addresses/${address.id}`), ctx(address.id));
    expect(res.status).toBe(404);
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const fakeId = randomUUID();
    const res = await DELETE(deleteRequest(`/api/addresses/${fakeId}`), ctx(fakeId));
    expect(res.status).toBe(401);
  });

  it("unexpected service error → 500 INTERNAL", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    vi.mocked(softDeleteAddress).mockRejectedValueOnce(new Error("db exploded"));

    const fakeId = randomUUID();
    const res = await DELETE(deleteRequest(`/api/addresses/${fakeId}`), ctx(fakeId));
    expect(res.status).toBe(500);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INTERNAL");
  });
});
