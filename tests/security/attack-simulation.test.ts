/**
 * Phase H — Dynamic Attack Simulation
 *
 * Tests run against route handlers directly (middleware bypassed).
 * Coverage status for all 19 plan items is documented inline.
 *
 * COVERED BY EXISTING TESTS (not duplicated here):
 *   T1  IDOR order fetch          → order-id-route.test.ts "non-owner → 404"
 *   T2  IDOR address PATCH        → address-id-route.test.ts "non-owner → 404"
 *   T4  Tampered Razorpay sig     → payment-verify-route.test.ts "invalid signature"
 *   T5  Replay webhook            → webhook-route.test.ts idempotency test
 *   T7  Login rate limit          → verify-password-route.test.ts email+IP limits
 *   T8  OTP brute force           → verify-otp-route.test.ts "5 wrong attempts → lockout"
 *   T9  Account enumeration       → verify-password-route.test.ts identical error
 *   T13 1 MB body                 → handler.test.ts 64KB content-length limit
 *   T15 Logout race (pw:changed)  → lib/auth/index.ts:51 JWT callback checks key on refresh
 *   T18 MFA token reuse           → pending-mfa.test.ts single-use token
 *   T19 MFA IP binding            → pending-mfa.test.ts IP mismatch → null
 *
 * NOT TESTABLE VIA ROUTE HANDLERS (require running server or browser):
 *   T10 Open redirect             — middleware uses req.nextUrl.pathname (always same-origin path)
 *   T14 JWT tampering             — NextAuth validates HMAC signature via NEXTAUTH_SECRET
 *   T16 CSRF cookie httpOnly      — httpOnly:false intentional (double-submit cookie pattern)
 *   T17 Session cookie httpOnly   — NextAuth default: httpOnly:true, secure in prod
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/razorpay/client", () => ({
  getRazorpayClient: () => razorpayMock,
}));

import { requireSession } from "@/lib/auth/session";
import { razorpayMock, resetMocks } from "@/tests/helpers/mocks";
import { createTestUser, createTestOrder } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { db } from "@/lib/db/client";
import { addresses, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { AERO } from "@/lib/product";
import { generateCsrfToken, timingSafeEqual, CSRF_COOKIE, CSRF_HEADER } from "@/lib/http/csrf";
import { VerifyPasswordRequest } from "@/lib/contracts/auth";

const { POST: initiatePayment } = await import("@/app/api/payments/initiate/route");
const { POST: createAddressRoute } = await import("@/app/api/addresses/route");

type OkBody<T = Record<string, unknown>> = { ok: true; data: T };

// ── T3: Tampered payment amount ───────────────────────────────────────────────

describe("T3 — tampered payment amount", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  beforeEach(() => resetMocks());

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("attacker-supplied amount in body is ignored — server always uses DB price", async () => {
    const user = await createTestUser();
    const order = await createTestOrder(user.id);
    cleanups.push(() => order.cleanup(), () => user.cleanup());
    rlKeys.push(`payments:initiate:${user.id}`);

    razorpayMock.orders.create.mockResolvedValueOnce({
      id: `order_${randomUUID().slice(0, 8)}`,
      amount: AERO.priceInPaise,
      currency: "INR",
    });
    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await initiatePayment(
      makeRequest("POST", "/api/payments/initiate", {
        orderId: order.id,
        amount: 1,       // attacker-supplied: ₹0.01
        amountPaise: 1,  // alternate field name
        price: 0,        // alternate field name
      }),
    );

    expect(res.status).toBe(200);
    const body = await readJson<OkBody<{ amountPaise: number }>>(res);
    // Server-computed price from product config, not client body
    expect(body.data.amountPaise).toBe(AERO.priceInPaise);
    expect(body.data.amountPaise).toBeGreaterThan(1);
  });
});

// ── T6: CSRF double-submit pattern ────────────────────────────────────────────

describe("T6 — CSRF enforcement (utility-level)", () => {
  // Full enforcement is in middleware.ts (wraps NextAuth; not callable in unit tests).
  // These tests verify the underlying primitives middleware relies on.

  it("matching cookie and header token → timingSafeEqual returns true", () => {
    const token = generateCsrfToken();
    expect(timingSafeEqual(token, token)).toBe(true);
  });

  it("mismatched tokens → timingSafeEqual returns false (middleware would 403)", () => {
    const cookieToken = generateCsrfToken();
    const headerToken = generateCsrfToken();
    expect(timingSafeEqual(cookieToken, headerToken)).toBe(false);
  });

  it("missing header (empty string) → timingSafeEqual returns false", () => {
    expect(timingSafeEqual(generateCsrfToken(), "")).toBe(false);
  });

  it("CSRF cookie and header name constants are correct", () => {
    expect(CSRF_COOKIE).toBe("axceal_csrf");
    expect(CSRF_HEADER).toBe("x-csrf-token");
  });

  it("makeRequest helper always attaches matching CSRF cookie+header", () => {
    const req = makeRequest("POST", "/api/test", {});
    const cookie = req.headers.get("cookie") ?? "";
    const header = req.headers.get(CSRF_HEADER) ?? "";
    const match = cookie.match(/axceal_csrf=([^;]+)/);
    expect(match).toBeTruthy();
    expect(timingSafeEqual(match![1], header)).toBe(true);
  });
});

// ── T11: XSS probe in free-text address fields ────────────────────────────────

describe("T11 — XSS probe in address free-text fields", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("<script> in firstName: accepted as literal text, response is application/json", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`addresses:create:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const xssPayload = "<script>alert(1)</script>";
    const res = await createAddressRoute(
      makeRequest("POST", "/api/addresses", {
        firstName: xssPayload,
        lastName: "Test",
        line1: "123 Main St",
        country: "India",
        state: "Karnataka",
        zip: "560001",
        phoneCountryCode: "91",
        phone: "9876543210",
        phoneSign: "+",
      }),
    );

    expect(res.status).toBe(200);
    // Response MUST be JSON, not HTML — browsers won't execute script tags in JSON responses
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await readJson<OkBody<{ id: string; firstName: string }>>(res);
    // Data round-trips as literal text (no server-side transformation or execution)
    expect(body.data.firstName).toBe(xssPayload);

    if (body.data?.id) {
      await db.delete(addresses).where(eq(addresses.id, body.data.id));
    }
  });

  it("<img onerror> in line1: stored as literal string, response is application/json", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`addresses:create:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const xssPayload = "<img src=x onerror=alert(1)>";
    const res = await createAddressRoute(
      makeRequest("POST", "/api/addresses", {
        firstName: "Test",
        lastName: "User",
        line1: xssPayload,
        country: "India",
        state: "Karnataka",
        zip: "560001",
        phoneCountryCode: "91",
        phone: "9876543210",
        phoneSign: "+",
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await readJson<OkBody<{ id: string; line1: string }>>(res);
    expect(body.data.line1).toBe(xssPayload);

    if (body.data?.id) {
      await db.delete(addresses).where(eq(addresses.id, body.data.id));
    }
  });
});

// ── T12: SQL injection probe ──────────────────────────────────────────────────

describe("T12 — SQL injection probe", () => {
  const cleanups: (() => Promise<void>)[] = [];
  const rlKeys: string[] = [];

  afterEach(async () => {
    for (const k of rlKeys.splice(0)) await redis.del(k);
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("'OR 1=1 -- in email field → rejected by Zod .email() before reaching DB", () => {
    const result = VerifyPasswordRequest.safeParse({
      email: "' OR 1=1 --",
      password: "SomePassword1!",
    });
    expect(result.success).toBe(false);
  });

  it("SQL probe as email local-part with @domain → rejected by Zod .email()", () => {
    // Even with a domain suffix, the local part is not RFC 5321 compliant
    const result = VerifyPasswordRequest.safeParse({
      email: "' OR '1'='1@example.com",
      password: "SomePassword1!",
    });
    // Zod .email() rejects malformed local parts
    expect(result.success).toBe(false);
  });

  it("SQL probe in firstName (free-text) — Drizzle parameterized query stores as literal string", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());
    rlKeys.push(`addresses:create:${user.id}`);

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const sqlPayload = "'; DROP TABLE users; --";
    const res = await createAddressRoute(
      makeRequest("POST", "/api/addresses", {
        firstName: sqlPayload,
        lastName: "Test",
        line1: "123 Main St",
        country: "India",
        state: "Karnataka",
        zip: "560001",
        phoneCountryCode: "91",
        phone: "9876543210",
        phoneSign: "+",
      }),
    );

    // INSERT succeeds — payload treated as literal string
    expect(res.status).toBe(200);
    const body = await readJson<OkBody<{ id: string; firstName: string }>>(res);
    expect(body.data.firstName).toBe(sqlPayload);

    // users table still exists and the test user record is intact
    const userRecord = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    expect(userRecord).toBeTruthy();

    if (body.data?.id) {
      await db.delete(addresses).where(eq(addresses.id, body.data.id));
    }
  });
});
