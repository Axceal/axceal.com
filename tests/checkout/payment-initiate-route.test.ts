import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { razorpayMock, resetMocks } from "@/tests/helpers/mocks";

vi.mock("@/lib/razorpay/client", () => ({ getRazorpayClient: () => razorpayMock }));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/session";
import { POST } from "@/app/api/payments/initiate/route";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { db } from "@/lib/db/client";
import { orders, paymentEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { AERO } from "@/lib/product";
import { AppError, ErrorCode } from "@/lib/http/errors";

type OkBody = { ok: true; data: { razorpayOrderId: string; razorpayKeyId: string; amountPaise: number; currency: string } };
type ErrBody = { ok: false; error: { code: string } };

function postReq(body: unknown) {
  return makeRequest("POST", "/api/payments/initiate", body);
}

describe("POST /api/payments/initiate — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  beforeEach(() => resetMocks());

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("authenticated user, valid orderId → 200, correct fields", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:initiate:${user.id}`);

    const rpId = `order_init_${randomUUID().slice(0, 8)}`;
    razorpayMock.orders.create.mockResolvedValueOnce({ id: rpId, amount: order.totalPaise, currency: "INR" });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({ orderId: order.id }));

    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.ok).toBe(true);
    expect(body.data.razorpayOrderId).toBe(rpId);
    expect(body.data.amountPaise).toBe(AERO.priceInPaise);
    expect(body.data.currency).toBe("INR");
    expect(typeof body.data.razorpayKeyId).toBe("string");
  });

  it("orderId belonging to different user → 404 (IDOR guard)", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const order = await createTestOrder(owner.id);
    cleanups.push(() => order.cleanup(), () => owner.cleanup(), () => attacker.cleanup());
    rlKeys.push(`payments:initiate:${attacker.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: attacker.id }));

    const res = await POST(postReq({ orderId: order.id }));
    expect(res.status).toBe(404);
  });

  it("orderId not found → 404", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`payments:initiate:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({ orderId: randomUUID() }));
    expect(res.status).toBe(404);
  });

  it("order already paid → 409", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, { status: "paid" });
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:initiate:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({ orderId: order.id }));
    expect(res.status).toBe(409);
  });

  it("Razorpay SDK throws → 502", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:initiate:${user.id}`);

    razorpayMock.orders.create.mockRejectedValueOnce(new Error("upstream failure"));
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({ orderId: order.id }));
    expect(res.status).toBe(502);
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(postReq({ orderId: randomUUID() }));
    expect(res.status).toBe(401);
  });

  it("rate limit trips on 21st request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `payments:initiate:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 20, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({ orderId: randomUUID() }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
