export const runtime = "nodejs";

import { withHandler } from "@/lib/http/handler";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { verifyCredentials } from "@/lib/auth/credentials";
import { issuePendingMfaToken } from "@/lib/auth/pending-mfa";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { redis } from "@/lib/redis";
import { VerifyPasswordRequest, VerifyPasswordResponse } from "@/lib/contracts/auth";

// S8 — replace the previous `verify-pw:email:5/hour` hard cap (account-lockout
// DoS lever) with progressive per-(email,ip) delay. Counter increments on
// bad password, resets on good. Delay grows exponentially up to 10s.
// F14.1 — scope counter by `(email, ip)` so a cross-origin attacker firing
// bad-password POSTs against /api/auth/verify-password (CSRF-exempt route)
// from one IP cannot poison the global per-email counter and slow every
// legitimate user attempt for the next hour. Additionally clamp the value at
// MAX_FAILURE_COUNT so a sustained botnet cannot saturate the delay at 10s
// for the full hour TTL.
const MAX_DELAY_MS = 10_000;
const MAX_FAILURE_COUNT = 7;
const FAIL_COUNTER_TTL_SEC = 60 * 60;
const failKey = (email: string, ip: string) => `verify-pw:fail:${email}:${ip}`;

function delayForFailures(failures: number): number {
  if (failures <= 0) return 0;
  // 200, 400, 800, 1600, 3200, 6400, 10000, 10000, ...
  return Math.min(200 * 2 ** (failures - 1), MAX_DELAY_MS);
}

export const POST = withHandler({
  input: VerifyPasswordRequest,
  output: VerifyPasswordResponse,
  handler: async ({ input, req }) => {
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") ?? "";

    // Per-IP cap remains as the absolute brake against credential-stuffing
    // distributed across many emails from one source.
    await rateLimit(`verify-pw:ip:${ip}`, { limit: 20, windowSec: 3600 });

    const key = failKey(input.email, ip);
    const prevFailures = (await redis.get<number>(key)) ?? 0;
    if (prevFailures > 0) {
      await new Promise((r) => setTimeout(r, delayForFailures(prevFailures)));
    }

    const user = await verifyCredentials(input.email, input.password);
    if (!user) {
      const newCount = await redis.incr(key);
      if (newCount === 1) await redis.expire(key, FAIL_COUNTER_TTL_SEC);
      // Clamp so the stored value cannot exceed the max — prevents a botnet
      // from inflating the counter past the delay ceiling for the full TTL.
      if (newCount > MAX_FAILURE_COUNT) {
        await redis.set(key, MAX_FAILURE_COUNT, { ex: FAIL_COUNTER_TTL_SEC });
      }
      throw new AppError(ErrorCode.UNAUTHENTICATED, "Incorrect email or password.", 401);
    }

    // Success → clear the slowdown so a typo from earlier doesn't penalize
    // the legitimate user on subsequent logins.
    await redis.del(key);

    const pendingMfaToken = await issuePendingMfaToken(
      user.id,
      user.email,
      ip,
      ua,
      "mfa-second-factor",
    );
    return { pendingMfaToken };
  },
});
