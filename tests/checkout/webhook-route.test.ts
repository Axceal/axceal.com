import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const applyWebhookEventMock = vi.fn(
  async (_rawBody: string, _parsed: { id: string; event: string }) => ({
    handled: true,
  }),
);

vi.mock("@/lib/services/payment", () => ({
  applyWebhookEvent: applyWebhookEventMock,
}));

const { POST: webhookPOST } = await import(
  "@/app/api/payments/webhook/route"
);

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

function webhookReq(body: string, signature: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers["x-razorpay-signature"] = signature;
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers,
    body,
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    applyWebhookEventMock.mockClear();
  });

  it("rejects missing signature header with 403", async () => {
    const body = JSON.stringify({ id: "evt_1", event: "payment.captured" });
    const res = await webhookPOST(webhookReq(body, null));
    expect(res.status).toBe(403);
    expect(applyWebhookEventMock).not.toHaveBeenCalled();
  });

  it("rejects invalid signature with 403", async () => {
    const body = JSON.stringify({ id: "evt_2", event: "payment.captured" });
    const res = await webhookPOST(webhookReq(body, "deadbeef"));
    expect(res.status).toBe(403);
    expect(applyWebhookEventMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON (with valid signature) with 400", async () => {
    const body = "not-json";
    const res = await webhookPOST(webhookReq(body, sign(body)));
    expect(res.status).toBe(400);
    const parsed = await readJson<{ ok: false; error: { code: string } }>(res);
    expect(parsed.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects JSON missing id/event with 400", async () => {
    const body = JSON.stringify({ foo: "bar" });
    const res = await webhookPOST(webhookReq(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it("accepts a valid signed event and calls applyWebhookEvent once", async () => {
    const body = JSON.stringify({
      id: "evt_ok_1",
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_1", order_id: "order_1", status: "captured" },
        },
      },
    });
    const res = await webhookPOST(webhookReq(body, sign(body)));
    expect(res.status).toBe(200);
    expect(applyWebhookEventMock).toHaveBeenCalledTimes(1);
    const call = applyWebhookEventMock.mock.calls[0];
    expect(call[0]).toBe(body);
    expect(call[1].id).toBe("evt_ok_1");
  });
});
