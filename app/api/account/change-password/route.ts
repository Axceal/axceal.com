export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { ChangePasswordRequest, ChangePasswordResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { consumeOtpToken } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export const POST = withHandler({
  input: ChangePasswordRequest,
  output: ChangePasswordResponse,
  handler: async ({ input }) => {
    const session = await requireSession();

    await rateLimit(`change-pw:${session.userId}`, { limit: 5, windowSec: 15 * 60 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { id: true, email: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    const tokenEmail = await consumeOtpToken(input.otpToken, "change-pw");
    if (tokenEmail !== user.email) throw new AppError(ErrorCode.INVALID_OTP, "Invalid token.", 400);

    const hash = await hashPassword(input.password);
    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash: hash, passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    await redis.set(`pw:changed:${user.id}`, Date.now(), { ex: SESSION_TTL_SEC });

    logger.info({ userId: user.id }, "password changed");
    return { success: true as const };
  },
});
