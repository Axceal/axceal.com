export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { SendOtpRequest, SendOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { generateOtp, storeOtp } from "@/lib/auth/otp";
import { emailProvider } from "@/lib/email/provider";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// Approximate the p50 send latency of the real email provider so the
// "no-op" branch sleeps long enough to mask which side of the existence
// check ran. Tune from production telemetry.
const SEND_LATENCY_TARGET_MS = 350;

async function constantTime<T>(target: number, work: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await work();
  const elapsed = Date.now() - start;
  if (elapsed < target) {
    await new Promise((r) => setTimeout(r, target - elapsed));
  }
  return result;
}

export const POST = withHandler({
  input: SendOtpRequest,
  output: SendOtpResponse,
  handler: async ({ input, req }) => {
    const { email, flow } = input;
    const ip = getClientIp(req);

    await rateLimit(`otp:send-rate:${email}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`otp:send-rate-ip:${ip}`, { limit: 10, windowSec: 3600 });

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    // shouldSend = "send the OTP for this combination of flow + existence".
    //   register flow: send only when no account exists (avoid spamming).
    //   reset-pw flow: send only when an account exists (nothing to reset otherwise).
    // The opposite branch is the "silent no-op" path. Both branches go through
    // constantTime so response latency is uniform regardless of which ran.
    const shouldSend =
      (flow === "register" && !existing) ||
      (flow === "reset-pw" && !!existing);

    await constantTime(SEND_LATENCY_TARGET_MS, async () => {
      if (!shouldSend) return;
      const code = generateOtp();
      await storeOtp(email, code);
      await emailProvider.sendOtp(email, code);
    });

    logger.info(
      { flow, emailExists: !!existing, sent: shouldSend, ip },
      "otp send requested",
    );
    return { sent: true as const };
  },
});
