import { z } from "zod";
import { Paise, UUID } from "@/lib/contracts/common";

export const InitiatePaymentRequest = z.object({ orderId: UUID });
export const InitiatePaymentResponse = z.object({
  razorpayOrderId: z.string(),
  razorpayKeyId: z.string(),
  amountPaise: Paise,
  currency: z.literal("INR"),
});

export const VerifyPaymentRequest = z.object({
  orderId: UUID,
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});
export const VerifyPaymentResponse = z.object({ status: z.literal("paid") });

export type InitiatePaymentRequest = z.infer<typeof InitiatePaymentRequest>;
export type InitiatePaymentResponse = z.infer<typeof InitiatePaymentResponse>;
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequest>;
export type VerifyPaymentResponse = z.infer<typeof VerifyPaymentResponse>;
