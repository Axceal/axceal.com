import Razorpay from "razorpay";
import { env } from "@/lib/env";

let cached: Razorpay | undefined;

export function getRazorpayClient(): Razorpay {
  if (!cached) {
    cached = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return cached;
}
