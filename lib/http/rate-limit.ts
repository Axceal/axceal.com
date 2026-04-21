import { redis } from "@/lib/redis";
import { AppError, ErrorCode } from "@/lib/http/errors";

type Options = { limit: number; windowSec: number };

export async function rateLimit(
  key: string,
  { limit, windowSec }: Options,
): Promise<{ count: number; remaining: number }> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  if (count > limit) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      "Too many requests, please try again later.",
      429,
    );
  }
  return { count, remaining: Math.max(0, limit - count) };
}
