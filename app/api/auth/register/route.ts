export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { RegisterRequest, RegisterResponse } from "@/lib/contracts/auth";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { consumeOtpToken } from "@/lib/auth/otp";
import { issuePendingMfaToken } from "@/lib/auth/pending-mfa";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp } from "@/lib/http/request";
import { db } from "@/lib/db/client";
import { users, userProfiles } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/http/rate-limit";

export const POST = withHandler({
  input: RegisterRequest,
  output: RegisterResponse,
  handler: async ({ input, req }) => {
    const ip = getClientIp(req);
    await rateLimit(`register:ip:${ip}`, { limit: 10, windowSec: 3600 });
    const { email, password, otpToken } = input;

    const tokenEmail = await consumeOtpToken(otpToken, "email-verify");
    if (tokenEmail !== email) {
      throw new AppError(
        ErrorCode.INVALID_OTP,
        "Verification token does not match this email.",
        400,
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (existing) {
      throw new AppError(
        ErrorCode.EMAIL_EXISTS,
        "Unable to complete registration.",
        409,
      );
    }

    const passwordHash = await hashPassword(password);

    const [userRow] = await db
      .insert(users)
      .values({ email, passwordHash, emailVerifiedAt: new Date() })
      .returning({ id: users.id });

    if (!userRow) {
      throw new AppError(ErrorCode.INTERNAL, "Failed to create user record.", 500);
    }

    // neon-http has no transactions. Compensate on profile-insert failure so we
    // never leave an orphaned users row (email is UNIQUE, so a retry would 409).
    try {
      await db.insert(userProfiles).values({ userId: userRow.id });
    } catch (err) {
      await db.delete(users).where(eq(users.id, userRow.id));
      logger.error({ err, userId: userRow.id }, "profile insert failed; user rolled back");
      throw new AppError(ErrorCode.INTERNAL, "Failed to create user profile.", 500);
    }

    const ua = req.headers.get("user-agent") ?? "";
    const signupSessionToken = await issuePendingMfaToken(userRow.id, email, ip, ua);

    return { userId: userRow.id, signupSessionToken };
  },
});
