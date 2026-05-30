export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { VerifyCurrentPasswordRequest, VerifyCurrentPasswordResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

// F14.3 — short-lived authorization marker that the change-pw OTP-send route
// requires before mailing an OTP. Stops a session-cookie-only attacker from
// using the authenticated /api/account/send-otp endpoint as an inbox-spam
// vector without ever needing to know the password.
export const CHANGE_PW_AUTHZ_KEY = (userId: string) => `change-pw:authz:${userId}`;
export const CHANGE_PW_AUTHZ_TTL_SEC = 10 * 60;

export const POST = withHandler({
  input: VerifyCurrentPasswordRequest,
  output: VerifyCurrentPasswordResponse,
  handler: async ({ input }) => {
    const session = await requireSession();

    await rateLimit(`verify-cur-pw:${session.userId}`, { limit: 10, windowSec: 15 * 60 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { passwordHash: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw new AppError(ErrorCode.UNAUTHENTICATED, "Current password is incorrect.", 401);

    // F14.3 — mint the authz marker. send-otp (change-pw) reads + requires
    // this; change-password burns it after a successful rotation.
    await redis.set(CHANGE_PW_AUTHZ_KEY(session.userId), 1, { ex: CHANGE_PW_AUTHZ_TTL_SEC });

    return { verified: true as const };
  },
});
