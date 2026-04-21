import { z } from "zod";
import { Paise, UUID } from "@/lib/contracts/common";
import { AddressSchema } from "@/lib/contracts/address";

export const CreateOrderRequest = z.object({
  quantity: z.number().int().min(1).max(5),
  billingAddress: AddressSchema,
  shippingAddress: AddressSchema.nullable(),
  idempotencyKey: z.string().uuid(),
});

export const OrderResponse = z.object({
  id: UUID,
  status: z.enum(["pending", "paid", "failed", "cancelled"]),
  quantity: z.number().int(),
  totalPaise: Paise,
  createdAt: z.string().datetime(),
});

export const OrderListResponse = z.array(OrderResponse);

export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>;
export type OrderResponse = z.infer<typeof OrderResponse>;
export type OrderListResponse = z.infer<typeof OrderListResponse>;
