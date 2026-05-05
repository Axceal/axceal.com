export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { withHandler } from "@/lib/http/handler";
import { VerifyPhoneRequest, VerifyPhoneResponse } from "@/lib/contracts/auth";
import { rateLimit } from "@/lib/http/rate-limit";
import { requireSession } from "@/lib/auth/session";
import { verifyPhoneOtp } from "@/lib/twilio/verify";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export const POST = withHandler({
  input: VerifyPhoneRequest,
  output: VerifyPhoneResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`phone-verify:${session.userId}`, { limit: 5, windowSec: 3600 });

    const approved = await verifyPhoneOtp(input.phone, input.code);
    if (!approved) {
      throw new AppError(ErrorCode.INVALID_OTP, "Incorrect OTP.", 400);
    }

    const now = new Date();
    await db
      .update(users)
      .set({ phone: input.phone, phoneVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, session.userId));

    logger.info({ userId: session.userId }, "phone verified");
    return { verified: true as const };
  },
});
