import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, paymentEvents } from "@/lib/db/schema";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getRazorpayClient } from "@/lib/razorpay/client";
import { verifyPaymentSignature } from "@/lib/razorpay/verify";
import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@/lib/contracts/payment";

async function loadOwnedOrder(userId: string, orderId: string) {
  const row = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, "Order not found", 404);
  return row;
}

export async function initiatePayment(
  userId: string,
  input: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> {
  const order = await loadOwnedOrder(userId, input.orderId);

  if (order.status === "paid") {
    throw new AppError(
      ErrorCode.ORDER_ALREADY_PAID,
      "Order already paid",
      409,
    );
  }
  if (order.status !== "pending") {
    throw new AppError(
      ErrorCode.UNPROCESSABLE,
      `Order status is ${order.status}`,
      422,
    );
  }

  if (order.razorpayOrderId) {
    return {
      razorpayOrderId: order.razorpayOrderId,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amountPaise: order.totalPaise,
      currency: "INR",
    };
  }

  const rp = getRazorpayClient();
  let rpOrder;
  try {
    rpOrder = await rp.orders.create({
      amount: order.totalPaise,
      currency: "INR",
      receipt: order.id,
      notes: { userId, sku: order.sku, quantity: String(order.quantity) },
    });
  } catch (err) {
    logger.error(
      { err, orderId: order.id },
      "razorpay orders.create failed",
    );
    throw new AppError(
      ErrorCode.UPSTREAM_FAILED,
      "Payment provider unavailable",
      502,
    );
  }

  await db
    .update(orders)
    .set({ razorpayOrderId: rpOrder.id })
    .where(eq(orders.id, order.id));

  return {
    razorpayOrderId: rpOrder.id,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    amountPaise: order.totalPaise,
    currency: "INR",
  };
}

export async function verifyPayment(
  userId: string,
  input: VerifyPaymentRequest,
): Promise<VerifyPaymentResponse> {
  const order = await loadOwnedOrder(userId, input.orderId);

  if (order.status === "paid") {
    return { status: "paid" };
  }
  if (order.status !== "pending") {
    throw new AppError(
      ErrorCode.UNPROCESSABLE,
      `Order status is ${order.status}`,
      422,
    );
  }
  // S7 — defense in depth: require initiate to have run for this order AND
  // the razorpay order id submitted to match the one bound on the row. Without
  // this, an attacker who legitimately paid order A could submit verify on
  // their own pending order B with A's razorpay credentials; signature would
  // verify and B would be marked paid for free. Currently also blocked by the
  // UNIQUE(razorpayOrderId) DB constraint, but the app layer must not rely on
  // a single defense.
  if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) {
    throw new AppError(
      ErrorCode.VALIDATION_FAILED,
      "Razorpay order id mismatch",
      400,
    );
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
    secret: env.RAZORPAY_KEY_SECRET,
  });
  if (!valid) {
    throw new AppError(
      ErrorCode.UPSTREAM_FAILED,
      "Signature verification failed",
      400,
    );
  }

  // Guard status='pending' in WHERE to prevent a TOCTOU race where two
  // concurrent verify requests both pass the signature check and double-write.
  const updated = await db
    .update(orders)
    .set({
      status: "paid",
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    })
    .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (!updated.length) {
    // Another concurrent request already transitioned the order — idempotent.
    return { status: "paid" };
  }

  return { status: "paid" };
}

type RazorpayWebhookEvent = {
  id: string;
  event: string;
  payload: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };
  };
};

export async function applyWebhookEvent(
  rawBody: string,
  parsed: RazorpayWebhookEvent,
): Promise<{ handled: boolean }> {
  const eventId = parsed.id;
  if (!eventId) return { handled: false };

  const razorpayOrderId = parsed.payload?.payment?.entity?.order_id ?? null;
  const razorpayPaymentId = parsed.payload?.payment?.entity?.id ?? null;
  const eventAmount = parsed.payload?.payment?.entity?.amount ?? null;
  const eventCurrency = parsed.payload?.payment?.entity?.currency ?? null;

  // Fetch the full order so F13.2 amount/currency assertion can run before
  // any state transition. HMAC already proves Razorpay sent the payload, but
  // an amount mismatch would mean either Razorpay account misconfiguration or
  // a future code path that mutates amounts post-initiate — both should fail
  // closed, not silently mark the order paid.
  type MatchedOrder = { id: string; totalPaise: number };
  let matchedOrder: MatchedOrder | null = null;
  if (razorpayOrderId) {
    const orderRow = await db.query.orders.findFirst({
      where: eq(orders.razorpayOrderId, razorpayOrderId),
      columns: { id: true, totalPaise: true },
    });
    if (orderRow) matchedOrder = orderRow;
  }

  // S15 — collapse the previous "find existing event then insert" into a
  // single insert with ON CONFLICT DO NOTHING. Closes the TOCTOU window
  // where two concurrent Razorpay retries could both pass the find check,
  // both attempt the order update, and the second insert would 500. Now the
  // first delivery wins atomically and the second short-circuits.
  const inserted = await db
    .insert(paymentEvents)
    .values({
      orderId: matchedOrder?.id ?? null,
      razorpayEventId: eventId,
      eventType: parsed.event,
      payload: JSON.parse(rawBody),
    })
    .onConflictDoNothing({ target: paymentEvents.razorpayEventId })
    .returning({ id: paymentEvents.id });

  if (!inserted.length) return { handled: false };

  if (matchedOrder) {
    // F13.2 — defense in depth: assert the captured amount + currency on
    // payment.captured match what the order is owed. Log + skip state
    // transition on mismatch so the event row stays for audit but the order
    // does not flip to paid on a divergent payload.
    if (parsed.event === "payment.captured") {
      if (eventAmount !== matchedOrder.totalPaise || eventCurrency !== "INR") {
        logger.warn(
          {
            orderId: matchedOrder.id,
            expectedPaise: matchedOrder.totalPaise,
            eventAmount,
            eventCurrency,
          },
          "webhook payment.captured amount/currency mismatch — order NOT marked paid",
        );
        return { handled: true };
      }
      await db
        .update(orders)
        .set({
          status: "paid",
          razorpayPaymentId: razorpayPaymentId ?? undefined,
        })
        .where(and(eq(orders.id, matchedOrder.id), eq(orders.status, "pending")));
    } else if (parsed.event === "payment.failed") {
      await db
        .update(orders)
        .set({
          status: "failed",
          razorpayPaymentId: razorpayPaymentId ?? undefined,
        })
        .where(and(eq(orders.id, matchedOrder.id), eq(orders.status, "pending")));
    }
  }

  return { handled: true };
}
