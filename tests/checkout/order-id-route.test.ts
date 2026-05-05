import { describe, it, expect, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/services/order", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/services/order")>();
  return { ...real, getOrder: vi.fn(real.getOrder) };
});

import { requireSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order";
import { GET } from "@/app/api/orders/[id]/route";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";

type OkBody = { ok: true; data: { id: string; status: string; totalPaise: number } };
type ErrBody = { ok: false; error: { code: string } };

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function getReq(id: string) {
  return new Request(`http://localhost/api/orders/${id}`, { method: "GET" });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/orders/:id", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("owner gets their order → 200 with order details", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await GET(getReq(order.id), ctx(order.id));

    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.id).toBe(order.id);
    expect(body.data.status).toBe("pending");
    expect(typeof body.data.totalPaise).toBe("number");
  });

  it("non-owner → 404 (IDOR guard)", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const order = await createTestOrder(owner.id);
    cleanups.push(() => order.cleanup(), () => owner.cleanup(), () => attacker.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: attacker.id }));

    const res = await GET(getReq(order.id), ctx(order.id));
    expect(res.status).toBe(404);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("non-UUID id → 400 VALIDATION_FAILED", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await GET(getReq("not-a-uuid"), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("valid UUID but order not found → 404", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const nonExistent = randomUUID();
    const res = await GET(getReq(nonExistent), ctx(nonExistent));
    expect(res.status).toBe(404);
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const fakeId = randomUUID();
    const res = await GET(getReq(fakeId), ctx(fakeId));
    expect(res.status).toBe(401);
  });

  it("unexpected service error → 500 INTERNAL", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));
    vi.mocked(getOrder).mockRejectedValueOnce(new Error("db blew up"));

    const fakeId = randomUUID();
    const res = await GET(getReq(fakeId), ctx(fakeId));
    expect(res.status).toBe(500);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("INTERNAL");
  });
});
