export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { VerifyOtpRequest, VerifyOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { issueOtpToken, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const POST = withHandler({
  input: VerifyOtpRequest,
  output: VerifyOtpResponse,
  handler: async ({ input, req }) => {
    const { email, otp } = input;
    const ip = getClientIp(req);

    await rateLimit(`otp:verify-rate-ip:${ip}`, { limit: 20, windowSec: 3600 });

    await verifyOtp(email, otp);
    // Public unauth flow — token usable by registration + reset-password +
    // passwordless OTP login, not by the auth-gated change-password endpoint.
    const otpToken = await issueOtpToken(email, "email-verify");

    // Caller has now proven control of the inbox, so revealing whether an
    // account exists is safe (they could enumerate via reset-pw anyway).
    // The create-account UI uses this to switch into a Login / Forgot path
    // when the email is already registered.
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    return { otpToken, accountExists: !!existing };
  },
});
