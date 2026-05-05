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
  if (order.razorpayOrderId && order.razorpayOrderId !== input.razorpayOrderId) {
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

  await db
    .update(orders)
    .set({
      status: "paid",
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    })
    .where(eq(orders.id, order.id));

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

  const existing = await db.query.paymentEvents.findFirst({
    where: eq(paymentEvents.razorpayEventId, eventId),
  });
  if (existing) return { handled: false };

  const razorpayOrderId = parsed.payload?.payment?.entity?.order_id ?? null;
  const razorpayPaymentId = parsed.payload?.payment?.entity?.id ?? null;

  let matchedOrderId: string | null = null;
  if (razorpayOrderId) {
    const orderRow = await db.query.orders.findFirst({
      where: eq(orders.razorpayOrderId, razorpayOrderId),
    });
    if (orderRow) matchedOrderId = orderRow.id;

    if (orderRow) {
      if (parsed.event === "payment.captured" && orderRow.status === "pending") {
        await db
          .update(orders)
          .set({
            status: "paid",
            razorpayPaymentId: razorpayPaymentId ?? orderRow.razorpayPaymentId,
          })
          .where(eq(orders.id, orderRow.id));
      } else if (
        parsed.event === "payment.failed" &&
        orderRow.status === "pending"
      ) {
        await db
          .update(orders)
          .set({
            status: "failed",
            razorpayPaymentId: razorpayPaymentId ?? orderRow.razorpayPaymentId,
          })
          .where(eq(orders.id, orderRow.id));
      }
    }
  }

  await db.insert(paymentEvents).values({
    orderId: matchedOrderId,
    razorpayEventId: eventId,
    eventType: parsed.event,
    payload: JSON.parse(rawBody),
  });

  return { handled: true };
}
