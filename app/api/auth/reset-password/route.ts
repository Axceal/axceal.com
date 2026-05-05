export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { ResetPasswordRequest, ResetPasswordResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { consumeOtpToken } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export const POST = withHandler({
  input: ResetPasswordRequest,
  output: ResetPasswordResponse,
  handler: async ({ input, req }) => {
    const { email, otpToken, password } = input;
    const ip = getClientIp(req);

    await rateLimit(`reset-pw:email:${email}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`reset-pw:ip:${ip}`, { limit: 10, windowSec: 3600 });

    // Consume token — single-use, expires after verify-otp TTL
    let tokenEmail: string;
    try {
      tokenEmail = await consumeOtpToken(otpToken);
    } catch {
      throw new AppError(ErrorCode.INVALID_OTP, "Invalid or expired verification token.", 400);
    }

    if (tokenEmail !== email) {
      throw new AppError(ErrorCode.INVALID_OTP, "Invalid or expired verification token.", 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    // Always hash (uniform timing) even when user doesn't exist
    const hash = await hashPassword(password);

    if (user) {
      const now = new Date();
      await db
        .update(users)
        .set({ passwordHash: hash, passwordChangedAt: now, updatedAt: now })
        .where(eq(users.id, user.id));

      // Invalidate all existing sessions for this user
      await redis.set(`pw:changed:${user.id}`, Date.now(), { ex: SESSION_TTL_SEC });

      logger.info({ userId: user.id }, "password reset");
    }

    return { success: true as const };
  },
});
