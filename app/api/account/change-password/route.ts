export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { ChangePasswordRequest, ChangePasswordResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { consumeOtpToken } from "@/lib/auth/otp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/http/request";
import { CHANGE_PW_AUTHZ_KEY } from "@/app/api/account/verify-current-password/route";

const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

// F14.2 — progressive delay on bad currentPassword, mirroring the S8 pattern
// used by /api/auth/verify-password. Resets on a successful change so a typo
// during a legitimate password rotation does not penalize the user later.
const CHANGE_PW_MAX_DELAY_MS = 10_000;
const CHANGE_PW_MAX_FAILURE_COUNT = 7;
const CHANGE_PW_FAIL_TTL_SEC = 60 * 60;
const changePwFailKey = (userId: string) => `change-pw:fail:${userId}`;

function changePwDelay(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(200 * 2 ** (failures - 1), CHANGE_PW_MAX_DELAY_MS);
}

export const POST = withHandler({
  input: ChangePasswordRequest,
  output: ChangePasswordResponse,
  handler: async ({ input, req }) => {
    const session = await requireSession();
    const ip = getClientIp(req);

    // F14.2 — tighten per-user budget + add per-IP brake. Combined with the
    // progressive delay below this turns a slow but unbounded brute-force on
    // currentPassword (the S16 second factor) into a true throttle.
    await rateLimit(`change-pw:${session.userId}`, { limit: 5, windowSec: 3600 });
    await rateLimit(`change-pw:ip:${ip}`, { limit: 10, windowSec: 3600 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { id: true, email: true, passwordHash: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    // S16 — verify currentPassword before consuming the OTP token. Order
    // matters: if currentPassword is wrong we want to bail without burning
    // the OTP, so the legitimate user can retry without re-running the
    // email-OTP dance.
    const failKey = changePwFailKey(user.id);
    const prevFailures = (await redis.get<number>(failKey)) ?? 0;
    if (prevFailures > 0) {
      await new Promise((r) => setTimeout(r, changePwDelay(prevFailures)));
    }

    const currentOk = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!currentOk) {
      const newCount = await redis.incr(failKey);
      if (newCount === 1) await redis.expire(failKey, CHANGE_PW_FAIL_TTL_SEC);
      if (newCount > CHANGE_PW_MAX_FAILURE_COUNT) {
        await redis.set(failKey, CHANGE_PW_MAX_FAILURE_COUNT, { ex: CHANGE_PW_FAIL_TTL_SEC });
      }
      throw new AppError(ErrorCode.UNAUTHENTICATED, "Current password is incorrect.", 401);
    }

    // Success on currentPassword check → clear delay counter.
    await redis.del(failKey);

    const tokenEmail = await consumeOtpToken(input.otpToken, "change-pw");
    if (tokenEmail !== user.email) throw new AppError(ErrorCode.INVALID_OTP, "Invalid token.", 400);

    const hash = await hashPassword(input.password);
    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash: hash, passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    await redis.set(`pw:changed:${user.id}`, Date.now(), { ex: SESSION_TTL_SEC });
    // F14.3 — close the change-pw authz window now that the rotation has
    // completed, so a future change requires another verify-current-password.
    await redis.del(CHANGE_PW_AUTHZ_KEY(user.id)).catch(() => {});

    logger.info({ userId: user.id }, "password changed");
    return { success: true as const };
  },
});
