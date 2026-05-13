export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { SendPhoneRequest, SendPhoneResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { sendPhoneOtp } from "@/lib/twilio/verify";

export const POST = withHandler({
  input: SendPhoneRequest,
  output: SendPhoneResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`phone-send:${session.userId}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`phone-send:num:${input.phone}`, { limit: 3, windowSec: 3600 });
    await sendPhoneOtp(input.phone);
    return { sent: true as const };
  },
});
