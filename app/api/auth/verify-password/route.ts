export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { verifyCredentials } from "@/lib/auth/credentials";
import { issuePendingMfaToken } from "@/lib/auth/pending-mfa";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { VerifyPasswordRequest, VerifyPasswordResponse } from "@/lib/contracts/auth";

export const POST = withHandler({
  input: VerifyPasswordRequest,
  output: VerifyPasswordResponse,
  handler: async ({ input, req }) => {
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") ?? "";

    await rateLimit(`verify-pw:email:${input.email}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`verify-pw:ip:${ip}`, { limit: 20, windowSec: 3600 });

    const user = await verifyCredentials(input.email, input.password);
    if (!user) {
      throw new AppError(ErrorCode.UNAUTHENTICATED, "Invalid email or password.", 401);
    }

    const pendingMfaToken = await issuePendingMfaToken(user.id, user.email, ip, ua);
    return { pendingMfaToken };
  },
});
