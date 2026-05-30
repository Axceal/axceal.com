export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { SendPhoneRequest, SendPhoneResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { sendPhoneOtp } from "@/lib/twilio/verify";
import { redis } from "@/lib/redis";

// S13 — bind the requested phone to the session so /verify cannot accept a
// different phone than the one the OTP was sent to. Without this binding an
// attacker with a stolen session could request OTP to their own phone, enter
// the code, and link their phone to the victim's account, breaking phone
// recovery. TTL matches the Twilio Verify code expiry (10 min).
const PHONE_BIND_TTL_SEC = 10 * 60;
const phoneBindKey = (userId: string) => `phone-pending:${userId}`;

export const POST = withHandler({
  input: SendPhoneRequest,
  output: SendPhoneResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`phone-send:${session.userId}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`phone-send:num:${input.phone}`, { limit: 3, windowSec: 3600 });

    // F14.9 — write the binding before the Twilio call so a Redis blip after
    // the OTP was sent cannot leave the user with a code that has no binding
    // to verify against. If Twilio then fails, clear the binding so a stale
    // value doesn't block a retry with a different number.
    await redis.set(phoneBindKey(session.userId), input.phone, { ex: PHONE_BIND_TTL_SEC });
    try {
      await sendPhoneOtp(input.phone);
    } catch (err) {
      await redis.del(phoneBindKey(session.userId)).catch(() => {});
      throw err;
    }
    return { sent: true as const };
  },
});
