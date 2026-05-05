import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID, createHmac } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/session";
import { POST } from "@/app/api/payments/verify/route";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { env } from "@/lib/env";
import { AppError, ErrorCode } from "@/lib/http/errors";

type OkBody = { ok: true; data: { status: string } };
type ErrBody = { ok: false; error: { code: string } };

function sign(rpOrderId: string, rpPaymentId: string): string {
  return createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${rpOrderId}|${rpPaymentId}`)
    .digest("hex");
}

function postReq(body: unknown) {
  return makeRequest("POST", "/api/payments/verify", body);
}

describe("POST /api/payments/verify — integration", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("valid signature + owned order → 200, order status = paid", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:verify:${user.id}`);

    const rpOrderId = `order_vr_${randomUUID().slice(0, 8)}`;
    const rpPaymentId = `pay_vr_${randomUUID().slice(0, 8)}`;
    await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({
      orderId: order.id,
      razorpayOrderId: rpOrderId,
      razorpayPaymentId: rpPaymentId,
      razorpaySignature: sign(rpOrderId, rpPaymentId),
    }));

    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.status).toBe("paid");

    const updated = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(updated!.status).toBe("paid");
  });

  it("invalid signature → 400, order status unchanged", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:verify:${user.id}`);

    const rpOrderId = `order_bad_${randomUUID().slice(0, 8)}`;
    const rpPaymentId = `pay_bad_${randomUUID().slice(0, 8)}`;
    await db.update(orders).set({ razorpayOrderId: rpOrderId }).where(eq(orders.id, order.id));
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({
      orderId: order.id,
      razorpayOrderId: rpOrderId,
      razorpayPaymentId: rpPaymentId,
      razorpaySignature: "deadbeef".repeat(8),
    }));

    expect(res.status).toBe(400);
    const unchanged = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(unchanged!.status).toBe("pending");
  });

  it("order belonging to different user → 404 (IDOR guard)", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const order = await createTestOrder(owner.id);
    cleanups.push(() => order.cleanup(), () => owner.cleanup(), () => attacker.cleanup());
    rlKeys.push(`payments:verify:${attacker.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: attacker.id }));

    const res = await POST(postReq({
      orderId: order.id,
      razorpayOrderId: "order_x",
      razorpayPaymentId: "pay_x",
      razorpaySignature: "sig_x",
    }));

    expect(res.status).toBe(404);
  });

  it("already paid order → idempotent 200", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id, { status: "paid" });
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:verify:${user.id}`);

    const rpOrderId = `order_idem_${randomUUID().slice(0, 6)}`;
    const rpPaymentId = `pay_idem_${randomUUID().slice(0, 6)}`;
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({
      orderId: order.id,
      razorpayOrderId: rpOrderId,
      razorpayPaymentId: rpPaymentId,
      razorpaySignature: sign(rpOrderId, rpPaymentId),
    }));

    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.status).toBe("paid");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await POST(postReq({
      orderId: randomUUID(),
      razorpayOrderId: "order_x",
      razorpayPaymentId: "pay_x",
      razorpaySignature: "sig_x",
    }));
    expect(res.status).toBe(401);
  });

  it("rate limit trips on 21st request → 429", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    const rlKey = `payments:verify:${user.id}`;
    rlKeys.push(rlKey);

    await redis.set(rlKey, 20, { ex: 3600 });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await POST(postReq({
      orderId: randomUUID(),
      razorpayOrderId: "order_x",
      razorpayPaymentId: "pay_x",
      razorpaySignature: "sig_x",
    }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
