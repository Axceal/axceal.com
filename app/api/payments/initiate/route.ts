import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
} from "@/lib/contracts/payment";
import { initiatePayment } from "@/lib/services/payment";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export const POST = withHandler({
  input: InitiatePaymentRequest,
  output: InitiatePaymentResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`payments:initiate:${session.userId}`, {
      limit: 20,
      windowSec: 3600,
    });
    return initiatePayment(session.userId, input);
  },
});
