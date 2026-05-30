export const runtime = "nodejs";

import { createHash } from "node:crypto";
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

// F14.5 — hash-truncate email for log breadcrumb. Lets us correlate per-email
// activity in logs without persisting the full address (PII + log-export
// enumeration risk).
const hashEmail = (email: string) =>
  createHash("sha256").update(email).digest("hex").slice(0, 12);

// S9 — set above p99 of the real send path (Resend API: typically 400–2000ms,
// p99 ≈ 2.5s). The previous 350ms target only padded the no-op branch and
// any real send that exceeded 350ms leaked existence via timing. Padding to
// 2500ms makes both branches indistinguishable at the cost of UX latency on
// every send-otp call. Long-term improvement: decouple the email send onto a
// background queue so synchronous work is bounded to the redis write only.
const SEND_LATENCY_TARGET_MS = 2500;

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
    //   register flow: ALWAYS send. The create-account UI surfaces an
    //     "Account already exists → Login / Forgot Password" pathway after
    //     OTP verify (proves inbox control first). Refusing to send here
    //     would leave existing-account users stuck without a verified OTP
    //     to bridge into that pathway. Anti-enumeration is preserved: both
    //     branches return {sent:true} with identical wall-clock latency,
    //     and existence is revealed only post-verify in verify-otp.
    //   reset-pw flow: send only when an account exists — there's nothing
    //     to reset otherwise, and forgot-password has no follow-on UX that
    //     would benefit from revealing existence post-verify.
    const shouldSend =
      flow === "register" ||
      (flow === "reset-pw" && !!existing);

    await constantTime(SEND_LATENCY_TARGET_MS, async () => {
      if (!shouldSend) return;
      const code = generateOtp();
      await storeOtp(email, code);
      await emailProvider.sendOtp(email, code);
    });

    // F14.5 — dropped `emailExists` (log-based enumeration vector) and `email`
    // (PII). `sent` already captures the outcome we need for debugging; the
    // hashed email lets us correlate suspicious activity per-account without
    // log-export becoming a user-existence map.
    logger.info(
      { flow, sent: shouldSend, ip, emailHash: hashEmail(email) },
      "otp send requested",
    );
    return { sent: true as const };
  },
});
