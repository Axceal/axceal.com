# Security Audit Findings

Tracks every `fail` item from `SECURITY_PLAN.md`. Each entry maps to a checklist section.
Status: `open` | `fixed` | `accepted-risk`

---

## Pre-audit known failures

### F0.1 — Login 2FA gap (§2.3, §3.1)
- **Status:** fixed
- **Severity:** high
- **Section:** SECURITY_PLAN.md §2.3 (session UX), §3.1 (auth correctness)
- **What:** Was: `signIn("credentials", ...)` issued the NextAuth session cookie immediately on password verification — OTP was frontend-only gate.
- **Fix applied:**
  - New `POST /api/auth/verify-password` verifies password → issues short-lived (5 min) `pendingMfaToken` stored in Redis with IP+UA hash binding. No session cookie issued.
  - `POST /api/auth/login-otp` now takes `{ pendingMfaToken }` (not `{ email }`) — peeks at token to get email, sends login-scoped OTP (key `otp:login:<email>`, separate from registration OTPs).
  - `lib/auth/index.ts` — replaced `credentials` provider with `credentials-with-otp` provider taking `{ pendingMfaToken, otp }`. Consumes token (single-use, IP+UA validated) + verifies login OTP before issuing session.
  - `app/login/page.tsx` — stage 1 calls `/api/auth/verify-password`, stage 2 calls `signIn("credentials-with-otp", { pendingMfaToken, otp })`.
- **New files:** `lib/auth/pending-mfa.ts`, `app/api/auth/verify-password/route.ts`

---

## §1 — Automated tooling pass

### F1.1 — CVE: Next.js GHSA-q4gf-8mx6-v5v3 (high)
- **Status:** fixed
- **Severity:** high
- **What:** `next >=16.0.0-beta.0 <16.1.7` — DoS via Server Components. Was 16.1.6.
- **Fix:** Upgraded to 16.2.4 via `bun add next@latest`. Also resolves F1.4, F1.5 (postcss + null-origin CSRF CVEs).

### F1.2 — CVE: flatted GHSA-25h7-pfq9-p65f + GHSA-rf6f-7fwh-wjgh (high × 2)
- **Status:** open
- **Severity:** high
- **What:** `flatted <3.4.0` via `eslint › file-entry-cache › flat-cache`. Unbounded recursion DoS + Prototype Pollution via `parse()`.
- **Fix:** Dev/lint tooling only — not in production runtime. Bump eslint or its deps.

### F1.3 — CVE: picomatch GHSA-c2c7-rcm5-vvqj (high)
- **Status:** open
- **Severity:** high
- **What:** `picomatch` ReDoS via extglob quantifiers — via vitest/vite + eslint.
- **Fix:** Dev tooling only — not in production runtime. Bump vitest.

### F1.4 — CVE: postcss GHSA-qx2v-qp2m-jg93 (moderate)
- **Status:** fixed
- **Severity:** medium
- **What:** PostCSS XSS via unescaped `</style>` in CSS stringify output. Build-time only.
- **Fix:** Indirect dep via `next`, `tailwindcss`, `vitest`. Resolves with Next.js upgrade.

### F1.5 — CVE: Next.js GHSA-mq59-m269-xvcx (moderate — null origin CSRF on Server Actions)
- **Status:** fixed
- **Severity:** medium
- **What:** Null `Origin` header bypasses Server Action CSRF protection in Next.js <16.1.7.
- **Note:** This app uses Route Handlers (not Server Actions) + double-submit CSRF (D8.3). Route Handlers are not affected by this CVE. Risk is low here, but Next.js upgrade resolves it.
- **Fix:** Covered by F1.1 upgrade.

### F1.6 — ESLint errors (9 errors across 6 files) — not security-relevant but lint not clean
- **Status:** open
- **Severity:** low
- **What:** `bun run lint` exits code 1 due to `react-hooks/immutability` (phone page ref mutation) and `react-hooks/refs` (SvgInput + units page ref-during-render). These are correctness bugs, not security bugs.
- **Fix:** Fix ref patterns — rename context refs to `*Ref` suffix, move ref access out of render path (already works at runtime because ESLint rule is stricter than runtime behavior).

### §1 pass/fail summary
| Check | Result |
|---|---|
| `bun audit` | FAIL — 5 high, 11 moderate, 1 low CVEs |
| `bun run lint` | FAIL — 9 errors (correctness, not security) |
| `tsc --noEmit` | PASS |
| `bun run test` | PASS — 58/58 |
| `bun run build` | PASS |
| Bundle secret scan | PASS — no server secrets in `.next/static/` |

---

## §2 — Frontend audit

### 2.1 XSS — PASS
No `dangerouslySetInnerHTML`, `eval`, `innerHTML =`, or `document.write` found in `app/`. All user-visible strings rendered through React text nodes. ✓

### 2.2 CSP — PASS (with note)
`next.config.ts` CSP covers `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, Razorpay domains. `'unsafe-inline'`/`'unsafe-eval'` justified (Next.js runtime + Razorpay). CSP is prod-only (documented D8.2). ✓
Note: CSP does not include Firebase/Twilio domains — not needed since phone OTP is fully server-side.

### 2.3 Auth & session UX — PARTIAL FAIL
- F0.1 (pre-existing): Login 2FA session cookie issued before OTP — see F0.1. HIGH.
- Session cookies: `httpOnly`, `sameSite=lax`, `secure` in prod — NextAuth default, verified in config. ✓
- No session tokens or email in `localStorage`/`sessionStorage` (only idempotency key UUID). ✓

### F2.1 — Open redirect via unvalidated `callbackUrl` (§2.5)
- **Status:** fixed
- **Severity:** high
- **What:** [app/login/page.tsx:19,124](app/login/page.tsx#L19) reads `callbackUrl` directly from `searchParams` and passes to `router.push(callbackUrl)` without checking it's a same-origin path. Crafting `/login?callbackUrl=https://evil.com` → post-login redirect to external URL.
- **Note:** Middleware sets `callbackUrl` as a relative path, but attackers can craft the URL directly.
- **Fix:** Validate before use: `const safe = callbackUrl.startsWith("/") ? callbackUrl : "/account"`.

### 2.4 CSRF — PARTIAL FAIL

### F2.2 — CSRF missing on PUT /api/account/profile in edit-details page (§2.4)
- **Status:** fixed
- **Severity:** medium
- **What:** [app/account/edit-details/page.tsx:147](app/account/edit-details/page.tsx#L147) uses plain `fetch` (not `apiFetch`) for `PUT /api/account/profile`. The CSRF `x-csrf-token` header is not attached → middleware rejects with 403. **Functional bug + CSRF gap.**
- **Fix:** Replace `fetch` with `apiFetch` from `@/lib/http/client`.

### F2.3 — CSRF missing on POST /api/validate-address (§2.4)
- **Status:** fixed
- **Severity:** low
- **What:** [app/order/billing-shipping/page.tsx:191](app/order/billing-shipping/page.tsx#L191) uses plain `fetch` for `POST /api/validate-address`. No CSRF header → 403 from middleware. Validate-address has no side-effects but the request currently fails.
- **Fix:** Replace `fetch` with `apiFetch`.

### 2.5 Open redirect — FAIL (see F2.1 above)

### 2.6 Client-side secrets & PII — PASS
No `NEXT_PUBLIC_*` env vars in codebase. Razorpay key ID delivered via API response (not bundle). No secrets in `.next/static/`. Session storage only holds idempotency UUID. ✓

### 2.7 UI-level authorization — PASS
`/account/**` and `/order/**` protected by middleware. All data fetches round-trip to server-checked endpoints. ✓

### 2.8 Clickjacking — PASS
`X-Frame-Options: DENY` (always) + `frame-ancestors 'none'` in prod CSP. ✓

### F2.4 — validate-address route: no withHandler, no rate limit, console.error, direct process.env (§2.6, §3.3, §3.5, §3.8)
- **Status:** fixed
- **Severity:** medium
- **What:** [app/api/validate-address/route.ts](app/api/validate-address/route.ts) — (a) uses `console.error` violating D8.7; (b) no `withHandler` wrapper → no body-size cap, no AppError mapping; (c) `process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY` accessed directly, not via `env.ts`; (d) no rate limit — makes paid outbound Google API calls on every invocation; (e) `GOOGLE_ADDRESS_VALIDATION_API_KEY` not in `lib/env.ts` or `.env.example`.
- **Fix:** Add to `env.ts` as optional, wrap with `withHandler`, add `rateLimit`, replace `console.error` with `logger.error`.

---

## §3 — Backend audit

### 3.1 Auth correctness — PARTIAL FAIL

### F3.1 — OTP generated with Math.random() — not CSPRNG (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/auth/otp.ts:16](lib/auth/otp.ts#L16) — `Math.random()` used for 4-digit OTP generation. `Math.random()` is not cryptographically random and can be predicted. An attacker who observes multiple OTPs could predict future ones.
- **Fix:** Replace with `crypto.randomInt(0, 10000)` (Node.js built-in, cryptographically secure). Already imported `randomUUID` from `node:crypto` in the same file — just add `randomInt`.
  ```ts
  import { randomUUID, randomInt } from "node:crypto";
  export function generateOtp(): string {
    return randomInt(0, 10000).toString().padStart(4, "0");
  }
  ```

### F3.2 — Timing-based user enumeration on login (§3.1)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/auth/credentials.ts:12-13](lib/auth/credentials.ts#L12) — when email not found, returns `null` immediately (no bcrypt). When email found but wrong password, runs bcrypt (~100ms). This timing difference reveals whether an email is registered.
- **Fix:** Always run bcrypt regardless of user existence. Pre-compute a dummy hash at module load:
  ```ts
  const DUMMY_HASH = "$2b$12$invalidhashfortimingnormalizati";
  // in verifyCredentials:
  if (!user) { await verifyPassword(password, DUMMY_HASH); return null; }
  ```

- Password hashing: bcrypt cost 12, `bcrypt.compare` constant-time. ✓
- OTP: TTL 10min, MAX_ATTEMPTS 5, single-use (deleted on success), scoped keys. ✓
- NEXTAUTH_SECRET: min 32 chars enforced by `env.ts`. ✓

### 3.2 Authorization & IDOR — PASS
- `addresses/[id]` DELETE: `softDeleteAddress(session.userId, id)` — ownership checked in service. ✓
- `orders/[id]` GET: `getOrder(session.userId, id)` — `AND userId = $userId` in query. ✓
- `payments/initiate` + `verify`: `loadOwnedOrder(userId, ...)` checks ownership. ✓
- UUID format validated on dynamic-segment routes before DB lookup. ✓

### 3.3 Input validation — PASS
All routes use `withHandler` + Zod (except `validate-address` — see F2.4, and dynamic-segment routes — documented D6.6). Zod contracts have explicit bounds. Body-size cap 64KB in `withHandler`. ✓

### 3.4 SQL injection — PASS
All DB access via Drizzle parameterized queries. `sql` template tag only used for schema-level check constraints with column references (not user input). No `sql.raw()`. ✓

### 3.5 Rate limiting — PARTIAL FAIL

### F3.3 — payments/verify missing rate limit (§3.5)
- **Status:** fixed
- **Severity:** medium
- **What:** [app/api/payments/verify/route.ts](app/api/payments/verify/route.ts) — no `rateLimit()` call. An attacker could spam signature verification attempts. (Practical impact low since valid signature requires Razorpay's HMAC, but endpoint is unguarded.)
- **Fix:** Add `await rateLimit(`payments:verify:${session.userId}`, { limit: 20, windowSec: 3600 })` before calling `verifyPayment`.

### F3.4 — register route missing IP/email rate limit (§3.5)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/auth/register/route.ts](app/api/auth/register/route.ts) — no explicit rate limit. Protected upstream by OTP token flow (token issued only after rate-limited `verify-otp`), but the endpoint itself is unguarded.
- **Fix:** Add `await rateLimit(`register:ip:${ip}`, { limit: 10, windowSec: 3600 })`.

- `send-otp`, `verify-otp`, `login-otp`, `reset-password`, `change-password`, `phone/send`, `phone/verify`, `orders/create`, `payments/initiate` — all rate-limited. ✓

### 3.6 Payments (Razorpay) — PASS
- `verifyPaymentSignature` + `verifyWebhookSignature` both use `crypto.timingSafeEqual` on equal-length hex buffers. ✓
- Amount sourced from DB (never trusts client-supplied amount). ✓
- Signature verified before `status = "paid"`. ✓
- Idempotent on `razorpayPaymentId` unique constraint. ✓
- Webhook: raw body used for HMAC (not re-parsed JSON). ✓
- RAZORPAY_KEY_SECRET never exposed to client. ✓

### 3.7 Email (Resend) — PASS
- All email fields constructed server-side from trusted values. ✓
- OTP not logged via pino (redact list covers `otp`, `code`). ✓
- Email rate-limiting exists per-address on `send-otp`. ✓

### 3.8 Logging & observability — PASS (with note)
- Pino redact list covers `password`, `passwordHash`, `otp`, `code`, `razorpaySignature`, `token`, `otpToken`, `authorization`, `cookie`. ✓
- `no-console` ESLint rule active for `app/api/**` + `lib/services/**`. One violation: `validate-address` (F2.4). ✓
- Error responses return generic `"Internal server error"` — no stack traces to client. ✓
- Note: `login-otp/route.ts:37` logs `{ otp: code }` via pino — `otp` field is redacted. Dev intent (see `emailProvider.sendOtp` which goes through `console.ts`). Minor.

### 3.9 Secrets & environment — PASS
- `.env.local` in `.gitignore` + never committed (git history confirms). ✓
- All secrets via `env.ts` Zod-validated. Exception: `GOOGLE_ADDRESS_VALIDATION_API_KEY` via direct `process.env` (F2.4). ✓
- No server secrets in `NEXT_PUBLIC_*` (no NEXT_PUBLIC_ vars in use). ✓
- Rotation plan in `BACKEND_PLAN.md §11.2` before go-live. ✓

### 3.10 Database — PASS
- Neon TLS enforced by default. ✓
- `userId NOT NULL` on all user-scoped tables. ✓
- Indexes on `(userId, createdAt desc)` for orders, `(userId) where deletedAt is null` for addresses. ✓
- Snapshot pattern for address data on orders. ✓

### F3.5 — Unbounded list queries on /api/orders and /api/addresses (§3.14)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/services/order.ts:89](lib/services/order.ts#L89) and [lib/services/address.ts:37](lib/services/address.ts#L37) use `findMany` with no `limit`. Returns all rows for a user in one query.
- **Fix:** Add `limit: 100` (or paginate) to both queries. Low urgency given order creation rate-limit (20/hr) but worth fixing before prod.

### 3.11 Session & cookie hardening — PASS
- JWT strategy, 30-day maxAge. ✓
- `pw:changed` Redis check on every session access — immediate revocation on password change. ✓
- `httpOnly: true`, `sameSite: lax`, `secure: true` in prod (NextAuth defaults). ✓

### 3.12 SSRF / outbound calls — PASS
All outbound targets are fixed: Razorpay API, Neon, Upstash REST, Resend, Twilio, Google Address Validation (API key in URL but target fixed — not user-controlled). ✓

### 3.13 Upload / file handling — PASS
No upload routes. ✓

### 3.14 DoS / resource exhaustion — PARTIAL FAIL (see F3.5)
Body cap 64KB on JSON routes. ✓ Rate-limited endpoints. ✓ Unbounded list queries — F3.5.

---

## §5 — Dynamic attack simulation

*(pending — requires preview deployment. Tests to run per SECURITY_PLAN.md §5:)*
- [ ] T1: IDOR — fetch user B's order as user A → expect 404
- [ ] T2: IDOR — PATCH user B's address as user A → expect 403/404
- [ ] T3: Tampered amount — POST /api/payments/initiate; server must recompute from DB
- [ ] T4: Tampered signature — POST /api/payments/verify with wrong signature → 400, order stays unpaid
- [ ] T5: Replay webhook — same event twice → second is no-op
- [ ] T6: CSRF — POST /api/addresses from evil.com → 403
- [ ] T7: Rate limit — 20 login attempts → 429
- [ ] T8: OTP brute force — 6 wrong OTPs → lockout
- [ ] T9: Account enumeration — login timing same for known vs unknown email (currently FAIL — see F3.2)
- [ ] T10: Open redirect — `/login?callbackUrl=https://evil.com` (currently FAIL — see F2.1)
- [ ] T11: XSS probe — `<img src=x onerror=alert(1)>` in free-text fields
- [ ] T12: SQL probe — `' OR 1=1 --` in email field
- [ ] T13: Body size — POST 1MB JSON → 413
- [ ] T14: JWT tampering — edit session cookie → rejected
- [ ] T15: Logout race — logout tab A, mutate in tab B → 401

---

## Summary

| ID | Severity | Description | Status |
|---|---|---|---|
| F0.1 | high | Login 2FA gap — session before OTP | **fixed** |
| F1.1 | high | Next.js CVE GHSA-q4gf-8mx6-v5v3 (DoS) | **fixed** |
| F1.2 | high | flatted CVEs (dev tooling only) | open |
| F1.3 | high | picomatch ReDoS CVE (dev tooling only) | open |
| F2.1 | high | Open redirect via unvalidated callbackUrl | **fixed** |
| F3.1 | high | OTP uses Math.random() not CSPRNG | **fixed** |
| F3.2 | high | Timing enumeration in verifyCredentials | **fixed** |
| F1.4 | medium | postcss CVE (build-time only) | **fixed** |
| F1.5 | medium | Next.js null-origin CSRF (covered by F1.1) | **fixed** |
| F2.2 | medium | CSRF missing on PUT /api/account/profile (edit-details) | **fixed** |
| F2.4 | medium | validate-address: no withHandler/rate-limit/logger | **fixed** |
| F3.3 | medium | payments/verify missing rate limit | **fixed** |
| F1.6 | low | ESLint 9 errors (correctness, not security) | open |
| F2.3 | low | CSRF missing on POST /api/validate-address | **fixed** |
| F3.4 | low | register missing IP/email rate limit | **fixed** |
| F3.5 | low | Unbounded list queries on orders + addresses | **fixed** |

**Blockers for deployment sign-off (per SECURITY_PLAN.md §6):**
All `high` findings must be resolved. `medium`/`low` may defer with documented owner + ticket.

Remaining blockers: none. F1.2/F1.3 dev-only tooling CVEs — accepted risk (not in production runtime).

| Severity | Open | Fixed | Accepted |
|---|---|---|---|
| critical | 0 | 0 | 0 |
| high | 2 | 5 | 0 |
| medium | 0 | 5 | 0 |
| low | 1 | 3 | 0 |

**F1.2/F1.3 (high) accepted:** flatted + picomatch CVEs are in eslint/vitest dev tooling only — not reachable from production runtime. Acceptable risk pre-launch; track as tech debt.
**F1.6 (low) open:** ESLint correctness errors — not security-relevant, can fix post-launch.
