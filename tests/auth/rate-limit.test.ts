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

  // G.3 — fail-closed is verified transitively: rateLimit propagates throws uncaught,
  // and withHandler maps any non-AppError throw → 500 (tested in tests/http/handler.test.ts).
  // Direct Redis failure injection is not possible here: the Upstash client uses a Proxy
  // that prevents vi.spyOn from intercepting method calls.

  // I.4 — window resets after TTL expires
  it("window resets after TTL: blocked at limit, succeeds again after window expires", async () => {
    key = `test:rl:${randomUUID()}`;
    const opts = { limit: 2, windowSec: 2 };

    // Hit the limit
    await rateLimit(key, opts);
    await rateLimit(key, opts);
    const blocked = await rateLimit(key, opts).catch((e) => e);
    expect(blocked).toBeInstanceOf(AppError);
    expect((blocked as AppError).code).toBe(ErrorCode.RATE_LIMITED);

    // Wait for window to expire (2s + 500ms buffer)
    await new Promise((r) => setTimeout(r, 2500));

    // Window reset — should succeed again from zero
    const r = await rateLimit(key, opts);
    expect(r.count).toBe(1);
  }, 10_000);
});
