import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, users, type Order as OrderRow } from "@/lib/db/schema";
import { AERO } from "@/lib/product";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";
import type { CreateOrderRequest, OrderDetailResponse, OrderResponse } from "@/lib/contracts/order";

function rowToResponse(row: OrderRow): OrderResponse {
  return {
    id: row.id,
    status: row.status as OrderResponse["status"],
    quantity: row.quantity,
    totalPaise: row.totalPaise,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<OrderRow | undefined> {
  return db.query.orders.findFirst({
    where: and(
      eq(orders.userId, userId),
      eq(orders.idempotencyKey, idempotencyKey),
    ),
  });
}

export async function createOrder(
  userId: string,
  input: CreateOrderRequest,
): Promise<OrderResponse> {
  const existing = await findByIdempotencyKey(userId, input.idempotencyKey);
  if (existing) return rowToResponse(existing);

  // F13.3 — orders no longer insert into `addresses`. The JSONB snapshot
  // columns are the source of truth for billing/shipping on past orders, and
  // bypassing the S12 address-cap via order-driven inserts is closed by
  // dropping the inserts entirely. `billingAddressId`/`shippingAddressId`
  // remain nullable for backward-compatibility with older rows.

  const unitPricePaise = AERO.priceInPaise;
  const totalPaise = unitPricePaise * input.quantity;

  try {
    const [orderRow] = await db
      .insert(orders)
      .values({
        userId,
        sku: AERO.sku,
        quantity: input.quantity,
        unitPricePaise,
        totalPaise,
        status: "pending",
        billingAddressId: null,
        shippingAddressId: null,
        billingAddressSnapshot: input.billingAddress,
        shippingAddressSnapshot: input.shippingAddress ?? null,
        idempotencyKey: input.idempotencyKey,
      })
      .returning();
    return rowToResponse(orderRow);
  } catch (err) {
    // Lost the race against a concurrent request with the same idempotency key.
    // Re-lookup and return the winner's row.
    const winner = await findByIdempotencyKey(userId, input.idempotencyKey);
    if (winner) {
      logger.info(
        { userId, idempotencyKey: input.idempotencyKey },
        "idempotency race resolved — returning existing order",
      );
      return rowToResponse(winner);
    }
    throw err;
  }
}

export async function listOrders(userId: string): Promise<OrderResponse[]> {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    limit: 100,
  });
  return rows.map(rowToResponse);
}

export async function getOrder(
  userId: string,
  id: string,
): Promise<OrderDetailResponse> {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      quantity: orders.quantity,
      totalPaise: orders.totalPaise,
      createdAt: orders.createdAt,
      razorpayPaymentId: orders.razorpayPaymentId,
      billingAddressSnapshot: orders.billingAddressSnapshot,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      email: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(and(eq(orders.id, id), eq(orders.userId, userId)));

  const row = rows[0];
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, "Order not found", 404);

  return {
    id: row.id,
    status: row.status as OrderDetailResponse["status"],
    quantity: row.quantity,
    totalPaise: row.totalPaise,
    createdAt: row.createdAt.toISOString(),
    razorpayPaymentId: row.razorpayPaymentId,
    email: row.email,
    billingAddressSnapshot: row.billingAddressSnapshot as OrderDetailResponse["billingAddressSnapshot"],
    shippingAddressSnapshot: row.shippingAddressSnapshot as OrderDetailResponse["shippingAddressSnapshot"],
  };
}
