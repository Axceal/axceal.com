export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { SendOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { generateOtp, storeChangePasswordOtp } from "@/lib/auth/otp";
import { emailProvider } from "@/lib/email/provider";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { CHANGE_PW_AUTHZ_KEY } from "@/app/api/account/verify-current-password/route";

export const POST = withHandler({
  output: SendOtpResponse,
  handler: async () => {
    const session = await requireSession();

    await rateLimit(`change-pw-otp:${session.userId}`, { limit: 5, windowSec: 3600 });

    // F14.3 — require the caller to have just proven currentPassword via
    // /api/account/verify-current-password (which mints a short-lived authz
    // marker). Without this gate, a session-cookie-only attacker could spam
    // OTP mail at the victim's inbox even though they can never actually
    // complete /api/account/change-password (which now also requires
    // currentPassword post-S16).
    const authz = await redis.get<number>(CHANGE_PW_AUTHZ_KEY(session.userId));
    if (!authz) {
      throw new AppError(
        ErrorCode.UNAUTHENTICATED,
        "Re-enter your current password to continue.",
        401,
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { email: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    const code = generateOtp();
    await storeChangePasswordOtp(user.email, code);
    await emailProvider.sendOtp(user.email, code);

    logger.info({ userId: session.userId }, "change-password otp sent");
    return { sent: true as const };
  },
});
