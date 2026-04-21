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

export const POST = withHandler({
  input: SendOtpRequest,
  output: SendOtpResponse,
  handler: async ({ input, req }) => {
    const { email } = input;
    const ip = getClientIp(req);

    await rateLimit(`otp:send-rate:${email}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`otp:send-rate-ip:${ip}`, { limit: 10, windowSec: 3600 });

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    // No-op for existing users (prevents spamming accounts + avoids enumeration).
    // Response shape is identical to the "sent" path.
    if (!existing) {
      const code = generateOtp();
      await storeOtp(email, code);
      await emailProvider.sendOtp(email, code);
    }

    logger.info({ emailExists: !!existing, ip }, "otp send requested");
    return { sent: true as const };
  },
});
