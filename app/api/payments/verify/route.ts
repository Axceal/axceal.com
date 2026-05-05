import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@/lib/contracts/payment";
import { verifyPayment } from "@/lib/services/payment";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export const POST = withHandler({
  input: VerifyPaymentRequest,
  output: VerifyPaymentResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`payments:verify:${session.userId}`, { limit: 20, windowSec: 3600 });
    return verifyPayment(session.userId, input);
  },
});
