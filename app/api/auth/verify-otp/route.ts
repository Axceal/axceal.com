export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { VerifyOtpRequest, VerifyOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { issueOtpToken, verifyOtp } from "@/lib/auth/otp";

export const POST = withHandler({
  input: VerifyOtpRequest,
  output: VerifyOtpResponse,
  handler: async ({ input, req }) => {
    const { email, otp } = input;
    const ip = getClientIp(req);

    await rateLimit(`otp:verify-rate-ip:${ip}`, { limit: 20, windowSec: 3600 });

    await verifyOtp(email, otp);
    const otpToken = await issueOtpToken(email);

    return { otpToken };
  },
});
