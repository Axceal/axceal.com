import { describe, it, expect } from "vitest";
import { redis } from "@/lib/redis";

describe("upstash redis", () => {
  it("SET and GET a key", async () => {
    const key = `test:setget:${Date.now()}`;
    await redis.set(key, "hello", { ex: 30 });
    const value = await redis.get<string>(key);
    expect(value).toBe("hello");
    await redis.del(key);
  });
});
