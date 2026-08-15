export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { SendOtpResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { generateOtp, storeDetailsOtp } from "@/lib/auth/otp";
import { emailProvider } from "@/lib/email/provider";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// Send an email OTP to the authenticated user's registered email address.
// Used by the details-unified flow to verify identity before persisting
// sensitive profile changes (e.g. phone number).
export const POST = withHandler({
  output: SendOtpResponse,
  handler: async () => {
    const session = await requireSession();
    await rateLimit(`details-otp:${session.userId}`, { limit: 5, windowSec: 3600 });

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { email: true },
    });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, "User not found.", 404);

    const code = generateOtp();
    await storeDetailsOtp(user.email, code);
    await emailProvider.sendOtp(user.email, code);

    logger.info({ userId: session.userId }, "details-flow otp sent");
    return { sent: true as const };
  },
});
