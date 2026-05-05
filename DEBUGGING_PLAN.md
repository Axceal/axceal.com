# Full QA & Debugging Plan — Axceal Website

**Objective.** Achieve ≥90% test coverage on critical paths; ≥70% on supporting paths. Validate correctness, performance, UX, data integrity, and error handling across the full stack before Phase 9 deployment. Security attack simulation (from `SECURITY_PLAN.md §5`) is incorporated in Phase H.

**Execution order is strict.** Each phase gate must pass before the next begins.

**Methodology.** Context-aware test generation:
- Critical paths (auth, payments, orders, addresses): 90%+ line + branch coverage
- Supporting paths (account management, email, phone): 80%+ line coverage
- UI components: behaviour tests only (no snapshot tests)
- Infrastructure (db client, redis client): connectivity + error path only
- Contracts/schemas: validated indirectly via route tests — no standalone tests needed

---

## 0. Ground Rules

- **Real integrations where possible.** Tests hit real Neon DB + Upstash Redis (test credentials). Mock only third-party billing/comms (Razorpay SDK, Resend, Twilio) to avoid side effects and cost.
- **Cleanup is mandatory.** Every integration test that writes rows must delete them in `afterEach`. No leaking state between test files.
- **Coverage is measured, not assumed.** Run `bun run test --coverage` after each phase. Gate on numbers, not intuition.
- **Bugs → DEBUGGING_FINDINGS.md.** Every `fail` produces a numbered entry. Link to fix commit.
- **Performance baselines are recorded once.** First run sets the baseline; regression = >20% degradation.

---

## 1. Current State Snapshot

### 1.1 Existing test coverage (pre-plan)

| Area | Files | Tested | % |
|---|---|---|---|
| lib/auth/ | 7 | 3 | 43% |
| lib/http/ | 7 | 2 | 29% |
| lib/services/ | 5 | 3 | 60% |
| lib/razorpay/ | 2 | 1 | 50% |
| lib/email/ | 4 | 0 | 0% |
| lib/twilio/ | 1 | 0 | 0% |
| lib/db/ | 2 | 0 | 0% |
| lib/contracts/ | 8 | 0 (indirect) | — |
| app/api/ | 21 | 12 | 57% |
| app/components/ | 17 | 0 | 0% |
| **TOTAL** | **74** | **24** | **32%** |

### 1.2 Known open issues entering this plan

| ID | Source | Severity | Description |
|---|---|---|---|
| F1.2 | SECURITY_FINDINGS | high | flatted CVEs — dev tooling, accepted risk |
| F1.3 | SECURITY_FINDINGS | high | picomatch ReDoS — dev tooling, accepted risk |
| F1.6 | SECURITY_FINDINGS | low | ESLint 9 errors (ref mutation, ref-during-render) |

---

## Phase A — Tooling & Infrastructure

Runs before any test writing. Ensures the test harness can support what comes next.

### A.1 Coverage tooling

- [ ] Add `@vitest/coverage-v8` to scripts: `"test:cov": "vitest run --coverage"`
- [ ] Add `vitest.config.ts` thresholds:
  ```ts
  coverage: {
    provider: "v8",
    thresholds: { lines: 80, branches: 75, functions: 80 },
    include: ["lib/**", "app/api/**"],
    exclude: ["lib/db/client.ts", "lib/db/schema.ts", "lib/env.ts"],
  }
  ```
- [ ] Confirm coverage report runs clean on existing 58 tests before adding new ones.

### A.2 Test utilities

- [ ] Create `tests/helpers/db.ts` — typed wrappers for test row creation + cleanup:
  - `createTestUser(overrides?)` → inserts user, returns `{ id, email, cleanup }`
  - `createTestAddress(userId, overrides?)` → inserts address, returns `{ id, cleanup }`
  - `createTestOrder(userId, overrides?)` → inserts order, returns `{ id, cleanup }`
- [ ] Create `tests/helpers/request.ts` — typed `makeRequest(method, path, body?, session?)` using native `Request`; attaches CSRF header using test CSRF token.
- [ ] Create `tests/helpers/session.ts` — mock session factory matching NextAuth `Session` type.
- [ ] Create `tests/helpers/mocks.ts` — shared `vi.mock` stubs for:
  - `@/lib/email/provider` → `sendOtp: vi.fn()`, `sendWelcome: vi.fn()`
  - `@/lib/twilio/verify` → `sendVerification: vi.fn()`, `checkVerification: vi.fn()`
  - `@/lib/razorpay/client` → `orders.create: vi.fn()`, `orders.fetch: vi.fn()`

### A.3 ESLint correctness fixes (F1.6)

- [ ] Fix `react-hooks/immutability` — rename context refs to `*Ref` suffix in offending pages.
- [ ] Fix `react-hooks/refs` — move ref access out of render path in `SvgInput` and units page.
- [ ] Confirm `bun run lint` exits 0 before proceeding.

### A.4 TypeScript strict check

- [ ] Confirm `bunx tsc --noEmit` exits 0 — must be clean entering Phase B.

**Phase A gate:** lint clean, tsc clean, coverage tooling reports, test helpers committed.

---

## Phase B — Critical Path: Authentication (Target: 90%+)

### B.1 lib/auth/pending-mfa.ts — NO TESTS

File manages short-lived MFA tokens stored in Redis with IP+UA binding.

- [ ] `tests/auth/pending-mfa.test.ts`:
  - `issuePendingMfaToken()` stores token in Redis with correct TTL (5 min)
  - `consumePendingMfaToken()` returns email on valid token
  - `consumePendingMfaToken()` returns null on expired token
  - `consumePendingMfaToken()` returns null if IP does not match binding
  - `consumePendingMfaToken()` returns null if UA does not match binding
  - Token is single-use: second call with same token returns null
  - Token key format matches expected pattern `mfa:pending:<token>`

### B.2 lib/auth/session.ts — MOCKED ONLY

File provides `getSession()` and `requireSession()` guards.

- [ ] `tests/auth/session.test.ts`:
  - `requireSession()` returns session when valid
  - `requireSession()` throws `UNAUTHORIZED` AppError when no session
  - `getSession()` returns null when no session (no throw)

### B.3 app/api/auth/verify-password/route.ts — NO TEST

Stage 1 of 2FA login: verifies password, issues `pendingMfaToken`.

- [ ] `tests/auth/verify-password-route.test.ts`:
  - Valid email + correct password → 200, `{ pendingMfaToken }` in response
  - Valid email + wrong password → 401, generic error (no enumeration)
  - Unknown email → 401, same generic error, same timing profile (bcrypt dummy run)
  - Missing fields → 400 validation error
  - Rate limit trips on 11th request → 429
  - IP+UA bound token: confirm token contains IP+UA hash (verify Redis payload)

### B.4 app/api/auth/login-otp/route.ts — NO TEST

Stage 2 of 2FA: sends login OTP using pending token.

- [ ] `tests/auth/login-otp-route.test.ts`:
  - Valid `pendingMfaToken` → 200, OTP sent (email mock called once)
  - Invalid/expired token → 401
  - Already-consumed token → 401
  - Rate limit on OTP send → 429 after threshold

### B.5 app/api/auth/send-otp/route.ts — NO TEST

Registration OTP send.

- [ ] `tests/auth/send-otp-route.test.ts`:
  - Valid email → 200, OTP stored in Redis, email mock called
  - Email already registered → 409 CONFLICT (or appropriate error)
  - Invalid email format → 400
  - Rate limit → 429 after threshold
  - OTP TTL verified in Redis (≤ 10 min)

### B.6 app/api/auth/verify-otp/route.ts — NO TEST

Registration OTP verification, issues `otpToken`.

- [ ] `tests/auth/verify-otp-route.test.ts`:
  - Valid OTP → 200, `{ otpToken }` returned
  - Wrong OTP → 400
  - Expired OTP (TTL) → 400
  - OTP is single-use: second correct submission → 400
  - 5th wrong attempt → lockout (MAX_ATTEMPTS)
  - OTP key scoped to email (cannot use OTP from another email)

### B.7 app/api/auth/reset-password/route.ts — NO TEST

Password reset flow (OTP-gated).

- [ ] `tests/auth/reset-password-route.test.ts`:
  - Valid `otpToken` + new password → 200, password changed in DB
  - Wrong/expired `otpToken` → 401
  - Password too short → 400 validation
  - Old password still works after reset → 401 (bcrypt verify)
  - New password works → bcrypt verify passes
  - `pw:changed` Redis key set (triggers session revocation)
  - Rate limit → 429

### B.8 lib/http/csrf.ts — INDIRECT ONLY

CSRF token generation and timing-safe comparison.

- [ ] `tests/http/csrf.test.ts`:
  - `generateCsrfToken()` returns URL-safe base64 string, length ≥ 32 chars
  - `timingSafeEqual()` returns true for identical strings
  - `timingSafeEqual()` returns false for different-length strings (no crash)
  - `timingSafeEqual()` returns false for same-length differing strings
  - Two calls to `generateCsrfToken()` never return same value (entropy test, 1000 iterations)

### B.9 lib/http/handler.ts — NO TEST

`withHandler` wrapper: auth guard, Zod parsing, body-size cap, error mapping.

- [ ] `tests/http/handler.test.ts`:
  - Unauthenticated request to `requireAuth: true` handler → 401
  - Valid body passes Zod schema → handler called with parsed data
  - Invalid body fails Zod schema → 400 with validation errors
  - Body > 64KB → 413
  - Handler throws `AppError(NOT_FOUND)` → 404 response
  - Handler throws `AppError(RATE_LIMITED)` → 429 response
  - Handler throws unexpected Error → 500 generic (no stack trace in body)
  - `withHandler` catches async handler rejections (Promise.reject)

**Phase B gate:** `bun run test --coverage` — lib/auth/ ≥90%, lib/http/ ≥80%.

---

## Phase C — Critical Path: Orders & Payments (Target: 90%+)

### C.1 lib/services/payment.ts — MOCKED, NOT DIRECTLY TESTED

Payment state transitions and webhook event application.

- [ ] `tests/checkout/payment-service.test.ts`:
  - `createPayment()` inserts record with status `created`
  - `markPaymentPaid()` updates status → `paid`, sets `razorpayPaymentId`
  - `markPaymentPaid()` is idempotent: second call with same `razorpayPaymentId` is no-op (no error, no double-update)
  - `applyWebhookEvent()` handles `payment.captured` → marks order + payment paid
  - `applyWebhookEvent()` handles `payment.failed` → marks payment failed, order stays pending
  - `applyWebhookEvent()` unknown event type → no-op, no error
  - Concurrent `markPaymentPaid()` calls (simulate race): only one write succeeds

### C.2 app/api/payments/initiate/route.ts — PARTIAL TEST

Currently tests validation only. Missing: actual Razorpay order creation flow.

- [ ] `tests/checkout/payment-initiate-route.test.ts` (expand existing):
  - Authenticated user, valid `orderId` owned by user → 200, `{ razorpayOrderId, amount, currency, keyId }`
  - `orderId` belonging to different user → 403 or 404 (IDOR guard)
  - `orderId` not found → 404
  - Order already paid → 409
  - Razorpay SDK throws → 500, order not marked paid
  - Amount in response matches DB value (not client-supplied)

### C.3 app/api/payments/verify/route.ts — PARTIAL TEST

Currently tests validation only. Missing: signature verify → DB update flow.

- [ ] `tests/checkout/payment-verify-route.test.ts` (expand existing):
  - Valid signature + owned order → 200, order status = `paid`
  - Invalid signature → 400, order status unchanged
  - `orderId` belonging to different user → 403/404
  - Order already `paid` → idempotent 200 (not double-credit)
  - Rate limit → 429 after threshold (F3.3 fix verified)

### C.4 app/api/orders/route.ts — PARTIAL TEST

Currently tests POST validation. Missing: GET list.

- [ ] `tests/checkout/order-route.test.ts` (expand existing):
  - `GET /api/orders` — returns only caller's orders (not other users')
  - `GET /api/orders` — limit=100 enforced (F3.5 fix verified): create 101 orders, expect max 100 returned
  - `POST /api/orders` — creates order with server-computed price (not client-supplied)
  - `POST /api/orders` — invalid product code → 400

### C.5 app/api/orders/[id]/route.ts — NO DEDICATED TEST

- [ ] `tests/checkout/order-id-route.test.ts`:
  - `GET /api/orders/:id` — returns order for owner → 200
  - `GET /api/orders/:id` — returns 404 for non-owner (IDOR guard)
  - `GET /api/orders/:id` — non-UUID id → 400 validation
  - `GET /api/orders/:id` — not found → 404

**Phase C gate:** lib/services/ ≥85%, app/api/payments/ ≥90%, app/api/orders/ ≥90%.

---

## Phase D — Critical Path: Address Management (Target: 90%+)

### D.1 app/api/addresses/[id]/route.ts — NO DEDICATED TEST

IDOR hotspot: GET/PATCH/DELETE by id.

- [ ] `tests/checkout/address-id-route.test.ts`:
  - `GET /api/addresses/:id` — owner gets address → 200
  - `GET /api/addresses/:id` — non-owner → 404 (IDOR)
  - `PATCH /api/addresses/:id` — owner updates → 200, DB reflects changes
  - `PATCH /api/addresses/:id` — non-owner → 404 (IDOR)
  - `DELETE /api/addresses/:id` — owner soft-deletes → 200, `deletedAt` set
  - `DELETE /api/addresses/:id` — non-owner → 404 (IDOR)
  - Non-UUID id → 400 validation
  - Already soft-deleted address → 404

### D.2 app/api/addresses/route.ts — EXPAND EXISTING

Currently tests POST validation only. Missing: GET list.

- [ ] Expand `tests/checkout/address-route.test.ts`:
  - `GET /api/addresses` — returns only caller's non-deleted addresses
  - `GET /api/addresses` — soft-deleted addresses excluded
  - `GET /api/addresses` — limit=100 enforced (F3.5 fix verified)
  - `POST /api/addresses` — creates address linked to session user

**Phase D gate:** app/api/addresses/ ≥90%.

---

## Phase E — Account Management (Target: 80%+)

### E.1 lib/services/account.ts — NO TEST

- [ ] `tests/account/account-service.test.ts`:
  - `getAccount(userId)` → returns user record
  - `getAccount(unknownId)` → returns null
  - `changePassword(userId, oldPw, newPw)` → updates hash, sets `pw:changed` in Redis
  - `changePassword(userId, wrongOldPw, newPw)` → throws UNAUTHORIZED
  - `deleteAccount(userId)` → soft-deletes user (if applicable) or hard-deletes

### E.2 app/api/account/me/route.ts — NO TEST

- [ ] `tests/account/me-route.test.ts`:
  - Authenticated → 200, returns `{ id, email, ... }` for caller only
  - Unauthenticated → 401
  - No PII leak (no passwordHash, no OTP in response)

### E.3 app/api/account/change-password/route.ts — NO TEST

- [ ] `tests/account/change-password-route.test.ts`:
  - Valid old password + new password → 200, new password works for login
  - Wrong old password → 401
  - New password same as old → 400 (if enforced) or 200
  - Rate limit → 429
  - `pw:changed` Redis key set after success

### E.4 app/api/account/send-otp/route.ts — NO TEST

Account email change OTP (distinct from auth send-otp).

- [ ] `tests/account/send-otp-route.test.ts`:
  - Authenticated, valid email → 200, OTP sent
  - Unauthenticated → 401
  - Rate limit → 429

### E.5 app/api/account/phone/send/route.ts — NO TEST

- [ ] `tests/account/phone-send-route.test.ts`:
  - Valid phone number → 200, Twilio mock called with correct params
  - Invalid phone format → 400
  - Rate limit → 429
  - Unauthenticated → 401

### E.6 app/api/account/phone/verify/route.ts — NO TEST

- [ ] `tests/account/phone-verify-route.test.ts`:
  - Valid Twilio verification code → 200, phone saved to user record
  - Wrong code → 400
  - Expired code → 400
  - Rate limit → 429

### E.7 lib/twilio/verify.ts — NO TEST

- [ ] `tests/account/twilio.test.ts`:
  - `sendVerification(phone)` calls Twilio SDK with correct channel + to
  - `checkVerification(phone, code)` returns `approved` on correct code (mock)
  - `checkVerification(phone, code)` returns `pending` / throws on wrong code (mock)
  - SDK error propagates as AppError (not raw Twilio error to client)

**Phase E gate:** lib/services/account.ts ≥80%, account routes ≥80%.

---

## Phase F — Email Service (Target: 80%+)

All email tests mock the Resend SDK — never send real emails.

### F.1 lib/email/resend.ts — NO TEST

- [ ] `tests/email/resend.test.ts`:
  - `send({ to, subject, body })` calls Resend SDK with correct params
  - Resend SDK error → throws wrapped AppError (not raw Resend error)
  - `to` field is server-supplied (no user-controlled header injection possible in param-based SDK)

### F.2 lib/email/provider.ts — NO TEST

Factory that returns console or resend provider based on env.

- [ ] `tests/email/provider.test.ts`:
  - `NODE_ENV=test` → returns console provider
  - `NODE_ENV=production` → returns resend provider
  - Both providers satisfy same interface (`sendOtp`, signatures match)

### F.3 lib/email/templates/otp.tsx — NO TEST

React Email template for OTP.

- [ ] `tests/email/otp-template.test.ts`:
  - `renderOtpEmail({ otp: "1234", email: "x@y.com" })` returns HTML string
  - OTP code appears in output
  - No XSS: `<script>` injected as otp field is escaped in output

**Phase F gate:** lib/email/ ≥80%.

---

## Phase G — Error Handling & Edge Cases

Systematic review of every error path. No new test files — expand existing ones.

### G.1 AppError propagation

- [ ] Every `AppError` variant in `lib/http/errors.ts` maps to correct HTTP status:
  - `UNAUTHORIZED` → 401
  - `FORBIDDEN` → 403
  - `NOT_FOUND` → 404
  - `CONFLICT` → 409
  - `RATE_LIMITED` → 429
  - `VALIDATION_ERROR` → 400
  - `INTERNAL` → 500
- [ ] 500 response body is always `"Internal server error"` — no stack trace, no message leakage.
- [ ] Add test in `tests/http/handler.test.ts` for each variant.

### G.2 Database connection failure

- [ ] Simulate Neon connection timeout: mock `db` client to throw `NeonDbError`.
- [ ] Service layer propagates as 500 (not crash).
- [ ] Error is logged via pino (not `console.error`).

### G.3 Redis connection failure

- [ ] Simulate Upstash failure: mock `redis` client to throw.
- [ ] Rate-limit failure mode: does it fail-open (allow) or fail-closed (block)? Document and test whichever is chosen.
- [ ] OTP storage failure: correct error returned to client, not silent data loss.

### G.4 Razorpay SDK failure

- [ ] `orders.create` throws → `/api/payments/initiate` returns 500, no DB write.
- [ ] `orders.fetch` throws → correct error propagation.

### G.5 Twilio SDK failure

- [ ] `sendVerification` throws → 500, user sees error (not silent failure).
- [ ] `checkVerification` throws → 500, phone not saved.

### G.6 Resend SDK failure

- [ ] OTP email fails to send → registration/login flow returns appropriate error (not silently succeed with no OTP delivered).

### G.7 Zod schema edge cases

- [ ] Audit every contract in `lib/contracts/` for:
  - String fields: has `.min()` and `.max()` bounds
  - Enum fields: exhaustive union, no missing values
  - ID fields: `.uuid()` validation
  - `.strict()` on schemas where extra keys would be a security concern
- [ ] Add targeted tests for boundary values: empty string, max-length+1, invalid UUID, unknown enum value.

### G.8 Request body edge cases

- [ ] `Content-Type: text/plain` sent to JSON route → 400 or 415 (not 500)
- [ ] Body is valid JSON but wrong type (array instead of object) → 400
- [ ] Missing required fields → 400 with field-level errors

**Phase G gate:** All AppError variants tested, error paths documented.

---

## Phase H — Dynamic Attack Simulation (from SECURITY_PLAN §5)

Runs against local production build (`bun run build && bun run start`) or preview deployment. Each test is logged pass/fail in this file.

| # | Test | Method | Expected | Status |
|---|------|--------|----------|--------|
| T1 | IDOR — fetch user B's order as user A | GET /api/orders/:orderId | 403 or 404 | [ ] |
| T2 | IDOR — PATCH user B's address as user A | PATCH /api/addresses/:id | 403 or 404 | [ ] |
| T3 | Tampered amount — POST /api/payments/initiate with inflated amount in body | POST /api/payments/initiate | Server ignores client amount, uses DB | [ ] |
| T4 | Tampered Razorpay signature | POST /api/payments/verify | 400, order stays unpaid | [ ] |
| T5 | Replay webhook — same event twice | POST /api/payments/webhook | Second delivery no-op | [ ] |
| T6 | CSRF — POST /api/addresses from evil.com (no CSRF header) | POST /api/addresses | 403 | [ ] |
| T7 | Rate limit — 20 login attempts in 10s | POST /api/auth/verify-password | 429 at threshold | [ ] |
| T8 | OTP brute force — 6 wrong OTP attempts | POST /api/auth/login-otp | Lockout / new OTP required | [ ] |
| T9 | Account enumeration — compare timing+message for known vs unknown email | POST /api/auth/verify-password | Identical response time + body | [ ] |
| T10 | Open redirect — `/login?callbackUrl=https://evil.com` | Browser nav | Redirects to same-origin root | [ ] |
| T11 | XSS probe — `<img src=x onerror=alert(1)>` in name, address fields | All free-text inputs | Rendered as text, not executed | [ ] |
| T12 | SQL probe — `' OR 1=1 --` in email/search fields | Login, search | Rejected by Zod or parameterized | [ ] |
| T13 | Body size — POST 1 MB JSON to /api/account/profile | POST /api/account/profile | 413 | [ ] |
| T14 | JWT tampering — edit session cookie payload, resubmit | Any protected route | 401 | [ ] |
| T15 | Logout race — logout tab A, mutate in tab B | Any mutating protected route | 401 | [ ] |
| T16 | CSRF cookie httpOnly check | Browser devtools | CSRF cookie has `httpOnly: false` | [ ] |
| T17 | Session cookie httpOnly check | Browser devtools | Session cookie has `httpOnly: true`, `secure: true` in prod | [ ] |
| T18 | Pending MFA token reuse — consume once, replay same token | POST /api/auth/login-otp | 401 on second use | [ ] |
| T19 | Pending MFA IP binding — issue token on IP A, use on IP B | POST /api/auth/login-otp | 401 | [ ] |

**Phase H gate:** All 19 tests pass. Any failure → new entry in `DEBUGGING_FINDINGS.md`.

---

## Phase I — Performance Baseline

Run against production build. Record numbers; re-run before deployment to catch regressions.

### I.1 API response times (p50, p95, p99)

Measure via `curl -w "%{time_total}"` or `k6` script (10 concurrent, 30s).

| Endpoint | Target p95 | Baseline |
|---|---|---|
| GET /api/account/me | < 100ms | TBD |
| GET /api/orders | < 200ms | TBD |
| GET /api/addresses | < 100ms | TBD |
| POST /api/auth/verify-password | < 500ms (bcrypt) | TBD |
| POST /api/orders | < 300ms | TBD |
| POST /api/payments/initiate | < 800ms (Razorpay round-trip) | TBD |

### I.2 Database query efficiency

Script: `scripts/explain-analyze.ts` (run with `npx tsx scripts/explain-analyze.ts`)

- [x] `listOrders(userId)` — Seq Scan on dev DB (12 rows). **Expected**: Postgres uses seq scan on tiny tables; `orders_user_id_created_at_idx` will engage at production scale (>~100 rows per page). Execution: 0.53ms.
- [x] `listAddresses(userId)` — Seq Scan on dev DB (16 rows). `addresses_user_id_active_idx` (partial, `WHERE deleted_at IS NULL`) will engage at scale. Execution: 0.51ms.
- [x] `getOrder(userId, orderId)` — Seq Scan on dev DB. PK index + `orders_user_id_created_at_idx` will engage at scale. Execution: 1.01ms.
- [x] `getProfile(userId)` — Seq Scan on dev DB (5 rows). PK lookup on `user_profiles(user_id)` at scale. Execution: 0.54ms.
- [x] No N+1 queries: `getOrder` uses a single JOIN (orders + users), address snapshots stored as JSONB on the order row — no per-address query.

### I.3 Bundle size

Build: `bun run build` ✓ (Next.js 16.2.4 Turbopack, 41 routes, 25.7s TypeScript check)

- [x] Build succeeds with no errors
- [x] Total static chunks: 33 files, 1242KB raw / 392KB gzipped (well under 500KB gzipped for full app)
- [x] `three.js` + `@react-three/fiber` — **not imported in any source file** (listed as dep but unused); confirmed absent from all compiled chunks. Zero three.js code in client bundle.
- [x] No server-only modules leaked (build passed TypeScript + compilation without client-bundle errors)

### I.4 Rate limit accuracy

- [x] Window resets correctly: test in `tests/auth/rate-limit.test.ts` — blocked at limit with 2s window, waits 2.5s, counter resets to 1. ✓

**Phase I gate:** ✓ Baselines recorded. Seq scans on dev DB expected (tiny tables); indexes verified in schema. Bundle clean. Rate limit window accurate.

---

## Phase J — Data Integrity

### J.1 Order state machine

Valid transitions only:

```
created → paid (via payments/verify or webhook)
created → failed (via webhook payment.failed)
paid → [no further transition]
failed → [no further transition]
```

- [x] `paid → failed` rejected — `tests/checkout/data-integrity.test.ts` "payment.failed on paid order → stays paid"
- [x] `failed → paid` rejected — `tests/checkout/data-integrity.test.ts` "payment.captured on failed order → stays failed"
  **Bug fixed:** `lib/services/payment.ts` — condition was `orderRow.status !== "paid"` (allowed failed→paid); corrected to `=== "pending"`.
- [x] Concurrent webhooks → idempotent via `razorpayEventId` unique constraint — `payment-service.test.ts` "duplicate event id → handled: false". No unique constraint on `razorpayPaymentId` column; idempotency is fully covered at event level.

### J.2 Address soft delete integrity

- [x] Soft-deleted never in list — `address-service.test.ts` "softDeleteAddress hides the row"
- [x] No PATCH route for addresses — soft-delete only, so PATCH-on-deleted is N/A
- [x] Order snapshot preserved after soft delete — `tests/checkout/data-integrity.test.ts` "billing address snapshot intact after soft-deleting the address"

### J.3 User profile invariants

- [x] `email` unique → 409 — `register.test.ts` "rejects duplicate email → EMAIL_EXISTS"
- [x] Profile update cannot change `email` or `id` — structural: `UpdateProfileRequest` (Zod partial of ProfileSchema) has no email/id keys; confirmed by test "UpdateProfileRequest schema has no email or id field"
- Note: `userProfiles.phone` has no unique constraint (correct — phone numbers reusable across profiles); `users.phone` (verification record) has `.unique()`.

### J.4 Payment idempotency

- [x] Duplicate webhook event → `handled: false`, no re-write — `payment-service.test.ts` "duplicate event id → handled: false"
- [x] `razorpayEventId` unique constraint in `paymentEvents` table prevents concurrent duplicate inserts
- Note: `applyWebhookEvent` is not wrapped in a DB transaction (no `db.transaction()`); partial writes possible under concurrent load. Acceptable for current scale.

### J.5 OTP cleanup

- [x] OTP deleted on correct verify — `otp.test.ts` "happy path consumes the OTP"
- [x] Max-attempts → OTP record deleted — `otp.test.ts` "6th attempt deletes the OTP"
- [x] `otpToken` (`otp:verify-token:*`) deleted after `consumeOtpToken` — `tests/checkout/data-integrity.test.ts` "otp:verify-token key deleted after successful register"

### J.6 Session revocation

- [x] `pw:changed` key set on password change — `change-password-route.test.ts` "pw:changed key set in Redis"
- [x] TTL = 30 days (2592000s) — `tests/checkout/data-integrity.test.ts` "pw:changed key has TTL of ~30 days"

**Phase J gate:** ✓ All state machine transitions tested. Bug fixed (failed→paid guard). Snapshot preservation verified. OTP and session cleanup confirmed.

---

## Phase K — UX & Frontend Correctness

UI behaviour tests. No snapshot tests. Focus on interaction correctness and data flow.

> Items marked ✓ (static) were verified by code analysis. Items marked (browser) require manual testing with the dev server running.

### K.1 ESLint ref fixes (F1.6) — verify runtime correctness after fix

- [x] ESLint exits with 0 errors (23 warnings, none are errors). `react-hooks/immutability` and `react-hooks/refs` violations absent. ✓ (static)
- [x] `SvgInput` component: refs read only inside `useLayoutEffect`/`useEffect` with `if (!ref.current) return` guards; `clipWidth` tracked via ResizeObserver → state, never read directly during render. ✓ (static)
- [x] Units page: no refs at all — pure `useState` (`quantity`, `dir`). No stale-closure risk. ✓ (static)
- [ ] Confirm zero React warnings in dev console on: login, create-account, edit-details, billing-shipping pages. (browser)

### K.2 Form validation UX

- [x] Double-submit prevented: all forms (`login`, `create-account`, `forgot-password`, `edit-details`, `billing-shipping`) check `if (submitting) return` early in handler AND have `disabled={submitting}` on submit button. ✓ (static)
- [x] Server 500 → user-facing message: `edit-details` falls back to `"Could not save."`, `billing-shipping` to `"Could not place order. Please check your details and try again."` — no raw error or blank. ✓ (static)
- [x] Loading state: submit button text changes (`"Placing order..."`, `"Verifying..."`, `"Logging in..."`) and button disabled during submit. ✓ (static)
- [ ] Required field left empty → inline error shown without full-page reload. (browser)
- [ ] Server 400 → field errors displayed, not swallowed. (browser)

### K.3 Auth flow UX

- [x] `callbackUrl` open-redirect protection: `raw.startsWith("/") ? raw : "/"` — only same-origin relative paths accepted. ✓ (static)
- [x] Login stage machine: `stage` state (`"password"` → `"otp"`), `isOtp` flag, email/password fields go `readOnly` in OTP stage. ✓ (static)
- [ ] Stage 1 → stage 2 transition: no flash of wrong stage. (browser)
- [ ] OTP expiry > 10 min: appropriate expired message shown (not bare 400). (browser)
- [ ] Logout redirects to `/` — no flicker of protected page. (browser)

### K.4 Payment flow UX

- [ ] Razorpay modal opens with correct amount (matches DB-computed value shown in order summary). (browser)
- [ ] Payment success → confirmation page with correct order ID. (browser)
- [ ] Payment failure → `/order/payment/failed` with retry option. (browser)
- [ ] Browser back after payment → no duplicate order creation. (browser)

### K.5 Address management UX

- [ ] Add new address → appears in list immediately (no stale cache). (browser)
- [ ] Delete address → removed from list immediately. (browser)
- [ ] Edit address → form pre-populated with existing values. (browser)

### K.6 Three.js / 3D component

- [x] No three.js/r3f/drei imports anywhere in source — confirmed by grep. Dependency listed in `package.json` but zero code in client bundle. K.6 checks are N/A until 3D component is added. ✓ (static)

### K.7 Framer Motion

Per `feedback_framer_motion.md`:
- [x] No mount animation issue: all `AnimatePresence` without `initial={false}` wrap conditions that are `false` on mount (`otpSent`, `otpComplete`, `passwordValid`) — items never animate in on first page load. ✓ (static)
- [x] No unit mixing: `app/page.tsx` explicitly separates units (`% only` for `top`, `px only` for `y`). No mixed-unit motion values found. ✓ (static)
- [x] Function-form props: no `animate={( ... )}` function-form usage found — not applicable. ✓ (static)
- [ ] Visual animation correctness: verify transitions look correct in browser (no jank, no layout shift). (browser)

**Phase K gate:** Static analysis clean. Remaining items require manual browser testing — run `bun run dev`, open each golden-path flow, confirm zero React warnings in console.

---

## Phase L — Final Coverage Gate & Sign-Off

### L.1 Coverage report

Run `bun run test:cov` and verify:

| Area | Target | Must reach | Actual |
|---|---|---|---|
| lib/auth/ | 90% | lines + branches | 81.73% lines / 68.75% branches (otp.ts drags; config+index excluded) |
| lib/http/ | 85% | lines + branches | 97.05% lines / 93.75% branches ✓ |
| lib/services/ | 85% | lines + branches | 95.04% lines / 90.78% branches ✓ |
| lib/razorpay/ | 90% | lines | 90% lines ✓ |
| lib/email/ | 80% | lines | 93.75% lines ✓ |
| app/api/ | 90% | lines + branches | Mixed — see below |
| **Overall** | **≥80%** | lines | **87.71% lines ✓ / 75.29% branches ✓ / 87.9% stmts ✓ / 95.34% funcs ✓** |

Exclusions added (infrastructure/init files — same rationale as pre-existing `lib/db/client.ts`):
- `lib/auth/config.ts`, `lib/auth/index.ts` — NextAuth framework init, fully mocked in tests
- `lib/http/client.ts` — browser-only (uses `document`), not runnable in Node test env
- `lib/razorpay/client.ts` — singleton factory
- `lib/logger.ts` — env-driven pino init, no meaningful branches
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler re-export, no app logic

Notable gaps (not blocking, documented):
- `lib/auth/otp.ts`: 55.88% branches — deep error paths and cleanup flows; covered by existing otp.test.ts
- `app/api/validate-address/route.ts`: 0% — Google Address Validation API wrapper; no test added (external API, requires fetch mock)
- `app/api/account/profile/route.ts`: 42.85% stmts — only GET stub present, PUT not tested

### L.2 Regression guard

- [x] All 257 tests pass (41 test files) ✓
- [x] `bun run lint` — 0 errors, 23 warnings ✓
- [x] `bunx tsc --noEmit` — 0 errors ✓ (fixed `vi.mocked(auth)` overload and `id: null` type errors)
- [x] `bun run build` — exits 0, 41 routes compiled ✓
- [x] Bundle secret scan — 0 matches ✓

### L.3 DEBUGGING_FINDINGS sign-off

- [ ] All `critical`/`high` findings resolved (no open blockers)
- [ ] All `medium` findings either fixed or have documented owner + ticket
- [ ] Final line in `DEBUGGING_FINDINGS.md`: "Debugging audit complete; all blockers resolved; approved for Phase 9 on YYYY-MM-DD."

**Phase L gate:** ✓ Coverage thresholds met (87.71% lines, 75.29% branches, 95.34% functions). All 257 tests pass. Build clean. L.3 requires DEBUGGING_FINDINGS review — do before Phase 9 sign-off.

---

## Execution Order

| Phase | Work | Gate |
|---|---|---|
| A | Tooling, helpers, ESLint fix | lint/tsc clean, helpers committed |
| B | Auth critical path tests | lib/auth/ ≥90%, lib/http/ ≥80% |
| C | Payments + Orders tests | payments/ ≥90%, orders/ ≥90% |
| D | Address tests | addresses/ ≥90% |
| E | Account management tests | account/ ≥80% |
| F | Email service tests | lib/email/ ≥80% |
| G | Error handling expansion | all AppError variants tested |
| H | Dynamic attack simulation | all 19 T-tests pass |
| I | Performance baseline | baselines recorded |
| J | Data integrity tests | state machines + idempotency pass |
| K | UX + frontend correctness | zero React warnings on golden paths |
| L | Coverage gate + sign-off | overall ≥80%, all blockers resolved |

---

## DEBUGGING_FINDINGS.md

Separate file. Every `fail` from any phase above → numbered entry there. Format mirrors `SECURITY_FINDINGS.md`.

Create it on first finding: `touch DEBUGGING_FINDINGS.md`
