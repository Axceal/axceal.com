import { describe, it, expect } from "vitest";
import { generateCsrfToken, timingSafeEqual } from "@/lib/http/csrf";

describe("http/csrf", () => {
  describe("generateCsrfToken", () => {
    it("returns a string of length ≥ 32", () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it("output contains only hex characters (UUID without dashes)", () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/i);
    });

    it("two calls never return the same value (1000 iterations)", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const t = generateCsrfToken();
        expect(seen.has(t)).toBe(false);
        seen.add(t);
      }
    });
  });

  describe("timingSafeEqual", () => {
    it("returns true for identical strings", () => {
      expect(timingSafeEqual("abc", "abc")).toBe(true);
      expect(timingSafeEqual("", "")).toBe(true);
      expect(timingSafeEqual("abc123!@#", "abc123!@#")).toBe(true);
    });

    it("returns false for different-length strings without crashing", () => {
      expect(timingSafeEqual("abc", "ab")).toBe(false);
      expect(timingSafeEqual("a", "ab")).toBe(false);
      expect(timingSafeEqual("", "a")).toBe(false);
      expect(timingSafeEqual("abc", "")).toBe(false);
    });

    it("returns false for same-length strings that differ", () => {
      expect(timingSafeEqual("abc", "abd")).toBe(false);
      expect(timingSafeEqual("aaaa", "aaab")).toBe(false);
      expect(timingSafeEqual("abcd", "abce")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(timingSafeEqual("ABC", "abc")).toBe(false);
    });

    it("correctly compares real CSRF tokens", () => {
      const token = generateCsrfToken();
      expect(timingSafeEqual(token, token)).toBe(true);

      // Flip last char
      const modified =
        token.slice(0, -1) + (token[token.length - 1] === "a" ? "b" : "a");
      expect(timingSafeEqual(token, modified)).toBe(false);
    });
  });
});
