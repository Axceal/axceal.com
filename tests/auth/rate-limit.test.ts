import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/lib/http/rate-limit";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { redis } from "@/lib/redis";

describe("http/rate-limit", () => {
  let key = "";
  afterEach(async () => {
    if (key) await redis.del(key);
  });

  it("allows up to the limit, rejects the next with RATE_LIMITED", async () => {
    key = `test:rl:${randomUUID()}`;
    for (let i = 1; i <= 3; i++) {
      const r = await rateLimit(key, { limit: 3, windowSec: 60 });
      expect(r.count).toBe(i);
    }
    const err = await rateLimit(key, { limit: 3, windowSec: 60 }).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(ErrorCode.RATE_LIMITED);
    expect((err as AppError).status).toBe(429);
  });
});
