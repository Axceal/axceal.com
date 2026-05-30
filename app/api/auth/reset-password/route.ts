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

// F14.4 — pad both branches (user exists / user does not exist) to the same
// wall-clock time so a botnet that already owns the inbox cannot squeeze a
// timing oracle out of the post-token-burn path. Threshold is well above the
// typical bcrypt(12) hash time (~250ms) and a Neon UPDATE round-trip (~50ms).
const RESET_LATENCY_TARGET_MS = 700;

async function padToTarget<T>(target: number, work: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await work();
  const elapsed = Date.now() - start;
  if (elapsed < target) {
    await new Promise((r) => setTimeout(r, target - elapsed));
  }
  return result;
}

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
      tokenEmail = await consumeOtpToken(otpToken, "email-verify");
    } catch {
      throw new AppError(ErrorCode.INVALID_OTP, "Invalid or expired verification token.", 400);
    }

    if (tokenEmail !== email) {
      throw new AppError(ErrorCode.INVALID_OTP, "Invalid or expired verification token.", 400);
    }

    await padToTarget(RESET_LATENCY_TARGET_MS, async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true },
      });

      // Always hash (uniform timing) even when user doesn't exist.
      const hash = await hashPassword(password);

      if (user) {
        const now = new Date();
        await db
          .update(users)
          .set({ passwordHash: hash, passwordChangedAt: now, updatedAt: now })
          .where(eq(users.id, user.id));

        // Invalidate all existing sessions for this user.
        await redis.set(`pw:changed:${user.id}`, Date.now(), { ex: SESSION_TTL_SEC });

        logger.info({ userId: user.id }, "password reset");
      }
    });

    return { success: true as const };
  },
});
