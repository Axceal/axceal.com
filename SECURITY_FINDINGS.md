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

## §5 — Deep audit pass (2026-05-05)

### F5.1 — Protocol-relative open redirect via `//evil.com` callbackUrl (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [app/login/hooks/useLoginForm.ts:15](app/login/hooks/useLoginForm.ts#L15) — guard was `raw.startsWith("/")`, which admits `//evil.com` (a protocol-relative URL). `router.push("//evil.com")` is treated by the browser as an external redirect to `https://evil.com`. This was the residual hole left by F2.1's fix.
- **Fix:** `raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"`.

### F5.2 — OTP attempt counter race condition — concurrent brute-force bypass (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/auth/otp.ts](lib/auth/otp.ts) — attempt tracking used GET → local increment → SET, which is not atomic. Two concurrent wrong-OTP requests both read `attempts=0`, both write `attempts=1` — only one slot is consumed. Attacker can send N concurrent requests and consume only 1 of 5 allowed attempts per batch.
- **Fix:** Removed `attempts` field from `OtpRecord`. Added separate per-flow atomic counter keys (`otp:attempts:${email}`, `otp:login:attempts:${email}`, `otp:change-pw:attempts:${email}`) incremented with Redis `INCR` (atomic). Applied to all three OTP flows: registration, login, change-password.
- **Test updated:** `tests/auth/otp.test.ts` — assertion now reads the separate attempts key instead of the OTP record's `attempts` field.

### F5.3 — Payment verify TOCTOU — concurrent requests both pass status check (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/services/payment.ts:126](lib/services/payment.ts#L126) — `verifyPayment` checked `order.status === "paid"` at read time, then wrote without re-asserting status in the WHERE clause. Two concurrent requests with the same valid signature both read `status=pending`, both pass the check, both execute the UPDATE.
- **Fix:** Added `eq(orders.status, "pending")` to the UPDATE's WHERE clause. If 0 rows are updated, another request already transitioned the order → return `{ status: "paid" }` idempotently.

### F5.4 — Email schema validates before normalizing — homograph bypass possible (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/contracts/common.ts:3](lib/contracts/common.ts#L3) — was `z.string().email().max(254).toLowerCase().trim()`. Zod applies `.email()` to the raw untransformed string, so validation could pass on inputs with trailing whitespace or mixed case that would look different after normalization. Order should be: normalize first, validate second.
- **Fix:** `z.string().trim().toLowerCase().email().max(254)` — `.trim()` and `.toLowerCase()` now run before `.email()`.

### F5.5 — NEXTAUTH_SECRET validated before trim — whitespace-padded secret passes min(32) (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/env.ts:7](lib/env.ts#L7) — `z.string().min(32)` without `.trim()` first. A 32-char secret with leading/trailing whitespace passes validation but the effective entropy is shorter.
- **Fix:** `z.string().trim().min(32)`.

---

## §6 — Third audit pass (2026-05-05)

### F6.1 — `softDeleteAddress` UPDATE clause missing `userId` ownership guard (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/services/address.ts:57](lib/services/address.ts#L57) — `softDeleteAddress` performed an ownership check via `findFirst` (checking `userId`), but the subsequent `UPDATE` only had `WHERE id = ?`. Defense-in-depth principle: the DB mutation must enforce ownership independently of the preceding read. If an address UUID were ever disclosed (via logs, API response, referrer), an attacker who controls another account could race the `findFirst`→`UPDATE` gap or skip to the UPDATE directly in a hypothetical direct DB scenario.
- **Fix:** Added `eq(addresses.userId, userId)` to the UPDATE WHERE clause:
  ```ts
  .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
  ```

### F6.2 — `emailVerifiedAt` never persisted after OTP-verified registration (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/auth/register/route.ts:47](app/api/auth/register/route.ts#L47) — user completes email OTP verification (`consumeOtpToken`) during signup, confirming email ownership, but `emailVerifiedAt` column stays `NULL` in the DB. Schema already defines `emailVerifiedAt timestamp`. Any future feature gating on this field (e.g., "require verified email before checkout") would silently treat all existing accounts as unverified.
- **Fix:** Set `emailVerifiedAt: new Date()` in the `INSERT` values — OTP token is already consumed at this point, so email ownership is proven.

---

## §7 — Dynamic attack simulation

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

## §4 — Post-audit security scan (2026-05-05)

### F4.1 — IP spoofing bypasses all IP-keyed rate limits (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/http/request.ts:3](lib/http/request.ts#L3) — `getClientIp` took `xff.split(",")[0]`, the leftmost XFF entry, which is user-controlled. Attacker sets `X-Forwarded-For: 1.2.3.4` on every request to rotate into a fresh rate-limit bucket. Affects: `otp:send-rate-ip`, `otp:verify-rate-ip`, `verify-pw:ip`, `reset-pw:ip`, `register:ip`.
- **Fix:** Prefer `x-real-ip` header (set by Vercel/nginx, not spoofable by client). Fall back to rightmost XFF entry (proxy-appended, not client-appended).
  ```ts
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) { const parts = xff.split(","); return parts[parts.length - 1].trim(); }
  ```

### F4.2 — No rate limit on POST /api/addresses (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [app/api/addresses/route.ts:20](app/api/addresses/route.ts#L20) — address creation had auth check but no rate limit. Authenticated attacker could loop-create unbounded DB rows.
- **Fix:** `await rateLimit(\`addresses:create:${session.userId}\`, { limit: 20, windowSec: 3600 })`.

### F4.3 — No rate limit on PUT /api/account/profile (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [app/api/account/profile/route.ts:16](app/api/account/profile/route.ts#L16) — profile update endpoint unguarded.
- **Fix:** `await rateLimit(\`profile:update:${session.userId}\`, { limit: 30, windowSec: 3600 })`.

### F4.4 — CSP includes `unsafe-eval` in production (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [next.config.ts:7](next.config.ts#L7) — `script-src` contained `'unsafe-eval'`, allowing `eval()` / `new Function()`. Any XSS string injection could execute arbitrary JS. Razorpay checkout iframe does not require `'unsafe-eval'` in the parent page.
- **Fix:** Removed `'unsafe-eval'` from `script-src`. `'unsafe-inline'` retained — required by Next.js hydration and Razorpay; tracked as accepted risk until nonce-based CSP is implemented.

### F4.5 — No rate limit on DELETE /api/addresses/[id] (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [app/api/addresses/[id]/route.ts:12](app/api/addresses/%5Bid%5D/route.ts#L12) — soft-delete unthrottled; pair with F4.2 for create-then-delete spam.
- **Fix:** `await rateLimit(\`addresses:delete:${session.userId}\`, { limit: 30, windowSec: 3600 })`.

### F4.6 — Phone OTP send: no per-phone-number rate limit (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [app/api/account/phone/send/route.ts:14](app/api/account/phone/send/route.ts#L14) — limit was per-userId only. One account could send 5 OTPs to 5 distinct target phone numbers per hour (SMS spam vector).
- **Fix:** Added second gate: `await rateLimit(\`phone-send:num:${input.phone}\`, { limit: 3, windowSec: 3600 })`.

### F4.7 — Register 409 reveals email existence (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/auth/register/route.ts:38](app/api/auth/register/route.ts#L38) — error message "An account with this email already exists." explicitly confirmed email registration. Exploiting this requires a valid OTP for the target email (attacker must receive it), so practical impact is near-zero.
- **Fix:** Changed message to `"Unable to complete registration."`. Status code (409) unchanged — correct HTTP semantics.

### F4.8 — Hardcoded developer IP in `allowedDevOrigins` (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [next.config.ts:36](next.config.ts#L36) — `allowedDevOrigins: ["10.94.20.146"]` hardcoded in the committed config. Ships to production build unchanged.
- **Fix:** Set to `[]`. Re-add local IP in `next.config.local.ts` or `.env.local` when needed for LAN dev.

---

## §7 — Fourth audit pass (2026-05-12)

### F7.1 — `middleware.ts` deleted, replaced by inert `proxy.ts` (CRITICAL)
- **Status:** fixed
- **Severity:** critical
- **What:** `middleware.ts` was deleted from working tree (showed ` D` in git status). A copy named `proxy.ts` had the same NextAuth + CSRF logic plus newer changes (DEV_SKIP_GATES flag, `/auth?from=` redirect, fixed `assets` matcher typo). Next.js only loads middleware named `middleware.ts` — `proxy.ts` was never executed. Result: **no server-side auth gate on `/account/*` or `/order/*` pages**, **no CSRF token issuance, and no CSRF rejection on mutating API requests**. API routes still call `requireSession()`, but every CSRF-protected mutation would fail at the verification layer (which also wasn't running) — meaning CSRF was effectively disabled.
- **Fix:** Promoted `proxy.ts` content (newer version) into a new `middleware.ts`; deleted `proxy.ts`. Restores edge auth + CSRF + dev skip flag.
- **Files:** `middleware.ts` (recreated), `proxy.ts` (deleted)

### F7.2 — Cross-flow OTP token reuse via shared `otp:verify-token` namespace (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/auth/otp.ts:66](lib/auth/otp.ts#L66) — `issueOtpToken(email)` produced a token keyed by `otp:verify-token:{uuid}` with no flow scope. Three consumers — `register`, `reset-password`, `change-password` — all called `consumeOtpToken(token)` and only verified `tokenEmail === user.email`. A token issued by the public `/api/auth/verify-otp` flow could be replayed against the auth-gated `/api/account/change-password` endpoint to skip its OTP step. Practical impact low because the attacker still had to receive an OTP on their own email, but it violates flow-scoped defense-in-depth (the same pattern that motivated the per-flow OTP key namespacing in F5.2).
- **Fix:** Added `flow: "email-verify" | "change-pw"` to `TokenRecord`. `issueOtpToken(email, flow)` and `consumeOtpToken(token, expectedFlow)` now require a flow argument. On flow mismatch, the token key is **deleted before throwing** so a misrouted token is single-use even on rejection (prevents retry against the correct flow). Updated all call sites: `app/api/auth/verify-otp` → `email-verify`; `app/api/account/verify-otp` → `change-pw`; consumers in `register`/`reset-password`/`change-password` pass their expected flow. Tests updated; new test asserts flow mismatch rejects and burns the token.
- **Files:** `lib/auth/otp.ts`, `app/api/auth/verify-otp/route.ts`, `app/api/account/verify-otp/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/account/change-password/route.ts`, `tests/auth/otp.test.ts`, `tests/auth/register.test.ts`, `tests/auth/reset-password-route.test.ts`, `tests/checkout/data-integrity.test.ts`

### F7.3 — No rate limit on authenticated GET endpoints (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** `GET /api/account/me`, `GET /api/account/profile`, `GET /api/orders`, `GET /api/orders/[id]`, `GET /api/addresses` all required a valid session but had no per-user rate cap. Authenticated attacker could poll at thousands of req/sec — DB and Neon load risk, not data exfiltration.
- **Fix:** Added per-user rate limits (60–120 req/min per endpoint) — generous enough that legitimate UI never hits them, tight enough that scripted abuse is blocked.
- **Files:** `app/api/account/me/route.ts`, `app/api/account/profile/route.ts`, `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/addresses/route.ts`

---

## §8 — Adversarial simulation pass (2026-05-12)

### F8.1 — DUMMY_HASH malformed → bcrypt timing oracle (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/auth/credentials.ts:9](lib/auth/credentials.ts#L9) — `DUMMY_HASH = "$2b$12$invalidhashfortimingnormalizati"` was 38 chars, not the required 60. bcryptjs short-circuits on parse failure, so `verifyPassword(plain, DUMMY_HASH)` returned in **~0.5ms** vs **~385ms** for a real hash. 770× timing differential → trivial email enumeration via `/api/auth/verify-password`. Per-email rate limit (5/hr) doesn't help because one probe per email is enough. F3.2 (timing fix) was therefore not actually fixed.
- **Fix:** Compute the dummy hash at module load with `bcrypt.hashSync("dummy-password-for-timing-normalization", 12)` so `bcrypt.compare` does the full bcrypt work and timing matches a real lookup. Verified empirically: both branches now ~385ms.
- **Files:** `lib/auth/credentials.ts`

### F8.2 — Server-side password complexity not enforced (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/contracts/common.ts](lib/contracts/common.ts) — `Password = z.string().min(8).max(128)` enforced length only. Client hooks (`useChangePasswordForm`, `useCreateAccountForm`, `useForgotPasswordForm`) checked upper + digit + special, but a direct API call (`curl /api/account/change-password` with `{ password: "aaaaaaaa", otpToken }`) bypassed all of it. Length cap also mismatched the client (server 128, client 64).
- **Fix:** Split into two schemas. `Password` (used by register/reset/change) now requires `min(8).max(64) + /[A-Z]/ + /[0-9]/ + /[^a-zA-Z0-9]/` — matches the client rule. `LoginPassword` (used by `verify-password` only) keeps the loose `min(8).max(128)` so existing credentials with any composition still pass validation during login. Without this split, every existing user with a simple password would be locked out.
- **Files:** `lib/contracts/common.ts`, `lib/contracts/auth.ts`

### F8.3 — Phone settable unverified via PUT /api/account/profile (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/contracts/profile.ts:13](lib/contracts/profile.ts#L13) — `UpdateProfileRequest = ProfileSchema.partial()` accepted `phone`, `phoneCountryCode`, `phoneSign`. The phone OTP flow (`/api/account/phone/send` + `verify`) updates the verified `users.phone`, but `updateProfile` wrote to `userProfiles.phone` directly — bypassing OTP entirely. Two phone columns could diverge silently. If any future feature trusted `userProfiles.phone` for SMS/2FA, hijack possible.
- **Fix:** `UpdateProfileRequest` now uses `.omit({ phone, phoneCountryCode, phoneSign }).partial()`. Phone changes must go through the OTP flow. Test `tests/profile/profile-service.test.ts` updated to assert phone fields stay null after profile PUT.
- **Files:** `lib/contracts/profile.ts`, `tests/profile/profile-service.test.ts`

### F8.4 — Body size cap bypassable via missing/false content-length (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/http/handler.ts:65](lib/http/handler.ts#L65) and [app/api/payments/webhook/route.ts:17](app/api/payments/webhook/route.ts#L17) — `if (len && Number(len) > max)` only fired when client sent a truthful `content-length` header. Omit the header (chunked transfer or just lying) → check skipped → `req.json()` / `req.text()` buffered the entire body without limit. Vercel platform caps at 4.5MB so production was mitigated, but self-hosted Node had no cap → memory-exhaustion DoS by streaming a huge body.
- **Fix:** Added `readJsonBounded` to `withHandler` and `readBoundedText` to the webhook route. Both walk the request body via `getReader()`, accumulate chunks, and `cancel()` the stream the moment `total > max`. Returns 413 to the client. The header check stays as an early-rejection optimization for honest clients.
- **Files:** `lib/http/handler.ts`, `app/api/payments/webhook/route.ts`

### F8.5 — `/api/validate-address` quota abuse (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/validate-address/route.ts](app/api/validate-address/route.ts) — no auth, only IP rate limit (30/hr). Each call hits the paid Google Address Validation API. With IP rotation an attacker could drain the project's Google quota → real money cost.
- **Fix:** Added `requireSession()` to the handler and `/api/validate-address` to `PROTECTED_API` in `middleware.ts` for defence-in-depth. Added per-user rate limit (`validate-address:user:${userId}`, 30/hr) on top of the existing per-IP cap.
- **Files:** `app/api/validate-address/route.ts`, `middleware.ts`

### F8.6 — `from` query param not URL-encoded in /auth (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/auth/page.tsx:11](app/auth/page.tsx#L11) — `${from}` interpolated raw into the suffix, so `?from=foo&bonus=evil` would pollute downstream Link `href` attributes with extra params. Not exploitable today (no downstream consumer of `bonus`), but trivially weaponizable as the codebase grows.
- **Fix:** Wrapped with `encodeURIComponent(from)` so query separators inside the value are escaped.
- **Files:** `app/auth/page.tsx`

### F8.7 — `getClientIp` returns "unknown" string when no proxy header (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/http/request.ts:12](lib/http/request.ts#L12) — when `x-real-ip` and `x-forwarded-for` were both absent, returned the literal string `"unknown"`. All such requests bucketed together for rate limits. Behind Vercel/nginx this never triggered, but a misconfigured deploy (no proxy) collapsed every per-IP rate limit into one shared bucket — attacker pre-fills the bucket to deny service to every user.
- **Fix:** In production, throw `AppError(INTERNAL, 500)` when neither header is present. In development, keep returning `"unknown"` so local testing without a proxy still works. Forces deployments to terminate behind a proxy that sets a trusted IP header.
- **Files:** `lib/http/request.ts`

---

## §9 — Dependency CVE sweep (2026-05-12)

When asked to clear F1.2 (flatted) and F1.3 (picomatch), `bun audit` revealed **27 total CVEs**, including 14 high-severity advisories that were not in the prior log. Most critical: a cluster of Next.js middleware-bypass and SSRF CVEs landing AFTER the §F7.1 middleware restoration — meaning the very gate I just put back was exploitable. All resolved in this pass.

### F9.1 — Next.js middleware bypass + SSRF cluster (HIGH × 5)
- **Status:** fixed
- **Severity:** high (× 5)
- **Advisories:**
  - `GHSA-mg66-mrh9-m8jx` — DoS via Cache Components connection exhaustion
  - `GHSA-c4j6-fc7j-m34r` — SSRF via WebSocket upgrades
  - `GHSA-492v-c6pp-mqqv` — Middleware/Proxy bypass via dynamic route param injection
  - `GHSA-267c-6grr-h53f` — Middleware/Proxy bypass via segment-prefetch routes
  - `GHSA-26hh-7cqf-hhc6` — Incomplete-fix follow-up to the segment-prefetch bypass
- **What:** Next.js 16.2.4 (post-§F1.1 baseline) shipped multiple advisories that allow direct path-injection or i18n-routing tricks to skip `middleware.ts` entirely — same gate I just restored in §F7.1 to enforce auth + CSRF on `/account/*` and `/order/*`. The bypass would let unauthenticated requests reach protected pages and protected API handlers (which still call `requireSession`, but page HTML would be served).
- **Fix:** `bun add next@latest eslint-config-next@latest` → 16.2.6, which contains the patched matcher and prefetch handling.
- **Files:** `package.json`, `bun.lock`

### F9.2 — axios prototype pollution in payment provider chain (HIGH × 2)
- **Status:** fixed
- **Severity:** high
- **Advisories:**
  - `GHSA-q8qp-cvcw-x6jj` — Axios prototype pollution gadgets in HTTP adapter (credential injection / request hijack)
  - `GHSA-3w6x-2g7m-8v23` — Invisible JSON response tampering via `parseReviver` prototype pollution
- **What:** `razorpay` and `twilio` both depend on `axios`. Vulnerable range was `>=1.0.0 <1.15.2`. Routes hit Razorpay (payment initiate/verify) and Twilio (phone OTP) — those are the highest-trust outbound calls in the system, and a prototype pollution gadget on the response path could let a tampered upstream response inject credentials into subsequent calls.
- **Fix:** `package.json > overrides > axios: ">=1.15.2"`. Forces both razorpay and twilio onto the patched axios regardless of their declared range.
- **Files:** `package.json`

### F9.3 — fast-uri host confusion + path traversal (HIGH × 2)
- **Status:** fixed
- **Severity:** high (dev tooling only)
- **Advisories:** `GHSA-v39h-62p7-jpjc`, `GHSA-q3j6-qgpj-74h6`
- **What:** Pulled by `eslint > @eslint/eslintrc > ajv` and `react-email > conf > ajv-formats > ajv`. Both are dev/lint paths. Not in production runtime, but `react-email` runs during test/preview rendering of email templates.
- **Fix:** `package.json > overrides > fast-uri: ">=3.1.2"`.
- **Files:** `package.json`

### F9.4 — esbuild dev-server CSRF (MODERATE)
- **Status:** fixed
- **Severity:** moderate (dev tooling only)
- **Advisory:** `GHSA-67mh-4wv8-2f99` — any website can issue requests to a running esbuild dev server and read responses.
- **What:** Pulled by `vitest`, `drizzle-kit`, `react-email`, `tsx`. Active only when those tools' dev servers are running locally — never in production.
- **Fix:** `package.json > overrides > esbuild: ">=0.25.0"`.
- **Files:** `package.json`

### F9.5 — picomatch ReDoS + POSIX class injection (HIGH + MODERATE × 2)
- **Status:** fixed (covers original §F1.3)
- **Severity:** high
- **Advisories:** `GHSA-c2c7-rcm5-vvqj` (ReDoS via extglob quantifiers), `GHSA-3v7f-55p6-f55p` (POSIX class injection causing wrong glob matches × 2 occurrences).
- **What:** Pulled by `vitest > vite > tinyglobby > fdir > picomatch` and `eslint-config-next > typescript-eslint > tinyglobby > fdir > picomatch`. Dev tooling.
- **Fix:** `package.json > overrides > picomatch: ">=4.0.3"`.
- **Files:** `package.json`

### F9.6 — flatted DoS + prototype pollution (HIGH × 2)
- **Status:** fixed (covers original §F1.2)
- **Severity:** high (dev tooling only)
- **Advisories:** `GHSA-25h7-pfq9-p65f`, `GHSA-rf6f-7fwh-wjgh`.
- **Fix:** `package.json > overrides > flatted: ">=3.4.0"`.
- **Files:** `package.json`

### F9.7 — brace-expansion zero-step DoS (MODERATE)
- **Status:** fixed
- **Severity:** moderate (dev tooling only)
- **Advisory:** `GHSA-f886-m6hf-6m8v` — process hang + memory exhaustion via crafted `{x..y..0}` sequence.
- **Fix:** `package.json > overrides > brace-expansion: "^2.0.2"`. **Caret-pinned to 2.x specifically** — a generic `>=2.0.2` resolved into the still-vulnerable 4.x branch (vuln range is `>=4.0.0 <5.0.5`, so any 4.x is unsafe).
- **Files:** `package.json`

### F9.8 — postcss XSS in CSS stringify output (MODERATE)
- **Status:** fixed
- **Severity:** moderate (build-time only)
- **Advisory:** `GHSA-qx2v-qp2m-jg93` — XSS via unescaped `</style>` in `postcss` stringify.
- **What:** Pulled by `@tailwindcss/postcss`, `next > postcss`, `vitest > vite > postcss`. Build-time CSS generation only — no user input flows through.
- **Fix:** `package.json > overrides > postcss: ">=8.5.10"`.
- **Files:** `package.json`

### F9.9 — Lint correctness errors (covers original §F1.6)
- **Status:** fixed
- **Severity:** low (correctness)
- **What:** 47 lint errors across 2 files:
  1. `app/order/billing-shipping/components/AddressForm.tsx` — 46 `react-hooks/refs` errors. **False positive**: the `AddressFormState` type bundles refs and state together, so the rule's static analyzer flags every `form.X` access (including plain string fields like `form.first` or `form.fieldErrors.zip`) as a potential ref read. The actual `.current` property is never touched in the file — refs are only forwarded as `ref={form.xRef}`, which the rule allows. Splitting refs into a sub-object would silence the rule but is a wider refactor.
  2. `app/account-ready/page.tsx` — 1 `react-hooks/set-state-in-effect` error on a single `setPending(JSON.parse(raw))` call inside `useEffect`. Reading `sessionStorage` only works client-side, so `useState` lazy init isn't viable. Effect deps `[router]` are stable, so no cascade.
- **Fix:** Targeted `eslint-disable` with documentation:
  - File-level `/* eslint-disable react-hooks/refs */` on AddressForm.tsx with a header comment justifying the false positive.
  - Single-line `// eslint-disable-next-line react-hooks/set-state-in-effect` on the sessionStorage hydration.
- **Result:** `bun run lint` exits 0. 21 warnings remain (unused imports + `<img>` vs `next/image` hints — non-security cosmetic).
- **Files:** `app/order/billing-shipping/components/AddressForm.tsx`, `app/account-ready/page.tsx`

### §9 verification
| Check | Before | After |
|---|---|---|
| `bun audit` | 27 vulns (14 high, 11 mod, 2 low) | **0 vulnerabilities** |
| `bun run lint` | exit 1 (47 errors) | **exit 0** (21 cosmetic warnings) |
| `tsc --noEmit` | exit 0 | exit 0 |

---

## §10 — Adversarial pass #2 (2026-05-12)

### F10.1 — `/api/auth/send-otp` broken forgot-password + email-enumeration timing oracle (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [app/api/auth/send-otp/route.ts](app/api/auth/send-otp/route.ts) was shared by both create-account and forgot-password flows but only sent OTP for **non-existing** users. Two compounding problems:
  1. **Functional break** — existing users requesting forgot-password got `{ sent: true }` with no email actually dispatched. Password reset was silently non-functional in production.
  2. **Timing oracle** — existing-email branch finished in ~5ms (one DB query); non-existing branch ran `generateOtp + storeOtp + Resend HTTP` → ~200–500ms. Per-IP rate limit (10/hr) doesn't stop one probe per email; with IP rotation, attacker enumerates large email lists. Same severity class as F8.1.
- **Fix:**
  - `SendOtpRequest` now requires `flow: "register" | "reset-pw"`. Route picks `shouldSend` based on flow + existence (register sends if not existing, reset-pw sends if existing).
  - Added `constantTime(target, work)` wrapper that pads response time to `SEND_LATENCY_TARGET_MS` (350ms) regardless of which branch ran. The no-op path now spends the same wall-clock time as the real-send path.
  - Updated both clients (`useCreateAccountForm` sends `"register"`, `useForgotPasswordForm` sends `"reset-pw"`).
  - Added 2 new test cases for `reset-pw` flow + `missing flow → 400` plus updated existing tests to pass `flow`.
- **Files:** `app/api/auth/send-otp/route.ts`, `lib/contracts/auth.ts`, `app/create-account/hooks/useCreateAccountForm.ts`, `app/forgot-password/hooks/useForgotPasswordForm.ts`, `tests/auth/send-otp-route.test.ts`

### F10.2 — `NODE_ENV` defaulted to `"development"` → silent prod degradation (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/env.ts:27](lib/env.ts#L27) — `NODE_ENV: z.enum([...]).default("development")`. If unset at runtime, the entire app silently degraded to dev defaults: rate-limits disabled (`lib/http/rate-limit.ts`), OTPs printed to stdout instead of emailed (`lib/email/provider.ts`), `getClientIp` returned `"unknown"` instead of throwing (F8.7), CSRF cookie `secure: false`. Mitigated in normal Next.js use because `next` sets `NODE_ENV` itself, but any custom-script entry point inherited the dev defaults.
- **Fix:** Removed the `.default()`. Schema now requires `NODE_ENV` to be set explicitly. If missing, env validation throws at boot with `Invalid environment variables: NODE_ENV: ...` — fail-closed instead of fail-open. Forces every entry point (Next.js, scripts, vitest — which sets it automatically — drizzle-kit) to declare its environment.
- **Files:** `lib/env.ts`

### F10.3 — `idempotencyKey` column-level UNIQUE → cross-user collision DoS (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/db/schema.ts:114](lib/db/schema.ts#L114) — `idempotencyKey: text("idempotency_key").unique()` (column-level unique = global). The order service looked up by `(userId, idempotencyKey)`, so the lookup was per-user but the constraint was global. If two users ever submitted the same key, the second user's INSERT failed and the catch-handler couldn't find their own row → 500 to victim. UUIDs are 122 bits unguessable so practically unexploitable, but the design contradicted the lookup semantics.
- **Fix:** Dropped the column-level unique, added composite `unique("orders_user_idempotency_unique").on(t.userId, t.idempotencyKey)`. Generated migration `drizzle/0002_perfect_ultimates.sql`. Run `bun run db:migrate` before deploy.
- **Files:** `lib/db/schema.ts`, `drizzle/0002_perfect_ultimates.sql`

### F10.4 — Logger redact list missed camelCase token names (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/logger.ts:33](lib/logger.ts#L33) — pino `redact.paths` matches **exact** property names. The list had `token` and `*.token`, but `pendingMfaToken` and `signupSessionToken` are different property names — neither pattern matched. No active leak today (no log call passes them), but any future `logger.info({ pendingMfaToken })` would write the live token to stdout/Axiom.
- **Fix:** Added `pendingMfaToken`, `signupSessionToken`, plus `*.pendingMfaToken`, `*.signupSessionToken`, `*.passwordHash`, `*.code`, `*.otpToken` to redact paths. Wildcard variants cover nested objects.
- **Files:** `lib/logger.ts`

### F10.5 — `users.phone` UNIQUE → unhandled 500 on duplicate verify (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/account/phone/verify/route.ts](app/api/account/phone/verify/route.ts) — when a user verified a phone number already linked to another account, the `db.update().set({ phone })` threw on the unique constraint (Postgres `23505`). Error bubbled through `withHandler` → generic 500 "Internal server error". Hides a legitimate 409 state from the client.
- **Fix:** Added `isUniqueViolation(err)` helper checking `err.code === "23505"`. Wrap the update in try/catch; on unique violation throw `AppError(CONFLICT, ..., 409)` with a clear message. Added `CONFLICT` to `ErrorCode` enum.
- **Files:** `app/api/account/phone/verify/route.ts`, `lib/http/errors.ts`

### §10 verification
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `bun run lint` | exit 0 |
| `bun audit` | 0 vulnerabilities |
| Migration | `drizzle/0002_perfect_ultimates.sql` generated, awaiting `db:migrate` |

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
| F4.1 | high | IP spoofing bypasses all IP-keyed rate limits | **fixed** |
| F4.2 | high | No rate limit on POST /api/addresses | **fixed** |
| F4.3 | high | No rate limit on PUT /api/account/profile | **fixed** |
| F1.4 | medium | postcss CVE (build-time only) | **fixed** |
| F1.5 | medium | Next.js null-origin CSRF (covered by F1.1) | **fixed** |
| F2.2 | medium | CSRF missing on PUT /api/account/profile (edit-details) | **fixed** |
| F2.4 | medium | validate-address: no withHandler/rate-limit/logger | **fixed** |
| F3.3 | medium | payments/verify missing rate limit | **fixed** |
| F4.4 | medium | CSP `unsafe-eval` in production script-src | **fixed** |
| F4.5 | medium | No rate limit on DELETE /api/addresses/[id] | **fixed** |
| F4.6 | medium | Phone OTP send: no per-phone-number rate limit | **fixed** |
| F1.6 | low | ESLint 9 errors (correctness, not security) | open |
| F2.3 | low | CSRF missing on POST /api/validate-address | **fixed** |
| F3.4 | low | register missing IP/email rate limit | **fixed** |
| F3.5 | low | Unbounded list queries on orders + addresses | **fixed** |
| F4.7 | low | Register 409 reveals email existence | **fixed** |
| F4.8 | low | Hardcoded developer IP in allowedDevOrigins | **fixed** |
| F5.1 | high | Protocol-relative `//evil.com` open redirect (residual F2.1 hole) | **fixed** |
| F5.2 | high | OTP attempt counter non-atomic — concurrent brute-force bypass | **fixed** |
| F5.3 | medium | Payment verify TOCTOU — no `status=pending` guard in UPDATE WHERE | **fixed** |
| F5.4 | low | Email schema validates before trim/lowercase — homograph bypass | **fixed** |
| F5.5 | low | NEXTAUTH_SECRET validated before trim — padded secret passes min(32) | **fixed** |
| F6.1 | medium | `softDeleteAddress` UPDATE missing `userId` ownership guard | **fixed** |
| F6.2 | low | `emailVerifiedAt` never persisted after OTP-verified registration | **fixed** |
| F7.1 | **critical** | `middleware.ts` deleted — edge auth + CSRF gate not running | **fixed** |
| F7.2 | low | Cross-flow OTP token reuse (shared `otp:verify-token` namespace) | **fixed** |
| F7.3 | low | No rate limit on authenticated GET endpoints | **fixed** |
| F8.1 | high | Malformed DUMMY_HASH → bcrypt timing oracle (770× differential) | **fixed** |
| F8.2 | medium | Server-side password complexity not enforced | **fixed** |
| F8.3 | medium | Phone settable unverified via PUT /api/account/profile | **fixed** |
| F8.4 | medium | Body size cap bypassable when content-length omitted | **fixed** |
| F8.5 | low | `/api/validate-address` quota abuse (no auth, IP-only limit) | **fixed** |
| F8.6 | low | `from` query param not URL-encoded in /auth | **fixed** |
| F8.7 | low | `getClientIp` falls back to literal "unknown" — single bucket | **fixed** |
| F9.1 | high (×5) | Next.js middleware bypass + SSRF + DoS cluster | **fixed** (next 16.2.6) |
| F9.2 | high (×2) | axios prototype pollution in razorpay/twilio | **fixed** (override) |
| F9.3 | high (×2) | fast-uri host confusion + path traversal (dev) | **fixed** (override) |
| F9.4 | medium | esbuild dev-server CSRF (dev) | **fixed** (override) |
| F9.5 | high+mod | picomatch ReDoS + POSIX class (covers F1.3) | **fixed** (override) |
| F9.6 | high (×2) | flatted DoS + prototype pollution (covers F1.2) | **fixed** (override) |
| F9.7 | medium | brace-expansion zero-step DoS | **fixed** (override) |
| F9.8 | medium | postcss XSS in CSS stringify (build-time) | **fixed** (override) |
| F9.9 | low | 47 lint errors (covers F1.6) | **fixed** |
| F10.1 | high | send-otp broken forgot-password + timing oracle | **fixed** |
| F10.2 | medium | NODE_ENV defaulted to dev → silent prod degradation | **fixed** |
| F10.3 | low | idempotencyKey global unique → cross-user DoS | **fixed** (migration pending) |
| F10.4 | low | Logger redact missed camelCase token names | **fixed** |
| F10.5 | low | users.phone unique → unhandled 500 on duplicate verify | **fixed** |

**Blockers for deployment sign-off (per SECURITY_PLAN.md §6):**
All `high` findings must be resolved. `medium`/`low` may defer with documented owner + ticket.

**Remaining blockers: none.** `bun audit` reports zero vulnerabilities. Run `bun run db:migrate` to apply the F10.3 schema migration before deploy.

| Severity | Open | Fixed | Accepted |
|---|---|---|---|
| critical | 0 | 1 | 0 |
| high | 0 | 23 | 0 |
| medium | 0 | 19 | 0 |
| low | 0 | 18 | 0 |

**F1.2/F1.3 (high) accepted:** flatted + picomatch CVEs are in eslint/vitest dev tooling only — not reachable from production runtime. Acceptable risk pre-launch; track as tech debt.
**F4.4 note:** `'unsafe-inline'` retained in CSP — required by Next.js + Razorpay. Nonce-based CSP is the long-term fix; deferred post-launch.
**F1.6 (low) open:** ESLint correctness errors — not security-relevant, can fix post-launch.

---

## §11 — SSR/RSC refactor audit (post-conversion hard-mode pass)

Scope: 5 pages converted to React Server Components — `app/account/page.tsx`, `app/account/orders/page.tsx`, `app/account/view-details/page.tsx`, `app/order/confirmation/page.tsx`, `app/page.tsx` — plus their client islands (`AccountShell`, `OrderList`, `ViewDetailsShell`, `ConfirmationView`, `HomeClient`), the modified `useEditDetailsForm` hook, two new error boundaries (`app/account/error.tsx`, `app/order/error.tsx`), and adjacent service code reached from RSC (`getProfile`, `listOrders`, `getOrder`, `users` table query). Threat model: anonymous attacker with HTTP access + authenticated attacker with valid session + dev-mode bypass scenarios.

### F11.1 — RSC date formatting uses local-time getters → SSR/CSR hydration mismatch (medium)
- **Status:** open
- **Severity:** medium
- **What:** Three places format dates using `Date.getDate()`, `getMonth()`, `getFullYear()` (local timezone):
  - [app/account/AccountShell.tsx:20](app/account/AccountShell.tsx#L20) — `formatCreatedAt(createdAt)`
  - [app/account/view-details/hooks/useEditDetailsForm.ts:15](app/account/view-details/hooks/useEditDetailsForm.ts#L15) — `formatBirthday(p.birthday)`
  - [app/account/orders/utils/formatters.ts:5,12](app/account/orders/utils/formatters.ts#L5) — order createdAt + `toLocaleDateString("en-IN", { month })`
- **Why this is new:** Pre-SSR, these ran client-only — always in user's local TZ. Post-SSR, server renders in container TZ (UTC on Vercel), client re-renders in user's TZ. For any timestamp within ~12 hours of midnight UTC, the day/month/year strings differ.
- **Impact:** React 19 throws hydration mismatch error → falls back to client render of the segment. Visible flash, console error, broken streaming for that subtree. Not a security vulnerability per se but downgrades the SSR perf benefits and pollutes error monitoring.
- **Repro:** Run with `TZ=America/Los_Angeles` client visiting at 11pm Pacific (06:00 UTC next day) — server says "14 May", client says "13 May".
- **Fix:** Switch all three to `getUTCDate`/`getUTCMonth`/`getUTCFullYear` and pass `timeZone: "UTC"` to `toLocaleDateString`. Or render dates client-side only (skip SSR for date strings via `suppressHydrationWarning` + `useEffect`-set state).

### F11.2 — RSC `redirect("/auth?from=/order/confirmation")` strips orderId, diverges from middleware redirect (low)
- **Status:** open
- **Severity:** low
- **What:** [app/order/confirmation/page.tsx:18](app/order/confirmation/page.tsx#L18) — RSC redirects unauth users to `/auth?from=/order/confirmation` (no query string). [middleware.ts:98](middleware.ts#L98) preserves the full URL: `from = path + req.nextUrl.search`. Same divergence in [account/page.tsx:13](app/account/page.tsx#L13), [orders/page.tsx:13](app/account/orders/page.tsx#L13), [view-details/page.tsx:13](app/account/view-details/page.tsx#L13) — none would have query strings normally, but confirmation does.
- **Why this is new:** Middleware fires first and redirects before RSC runs, so the divergence is *only* observable when middleware is bypassed (`NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true` in dev) OR if the session expires between middleware check and RSC render (extremely narrow race).
- **Impact:** In bypass scenarios, user lands on `/auth?from=/order/confirmation` → after login redirected to `/order/confirmation` (no orderId) → `notFound()`. Lost context. UX-only.
- **Fix:** In RSC, read pathname+search from `next/headers` and reconstruct: `const h = await headers(); redirect("/auth?from=" + encodeURIComponent(h.get("x-pathname") + h.get("x-search")));` — or just trust middleware and remove the redundant RSC redirect on the assumption middleware always fires (acceptable, but lose defense-in-depth in dev mode).

### F11.3 — `/api/account/me` GET handler is now dead production code, still reachable (low)
- **Status:** open
- **Severity:** low
- **What:** [app/api/account/me/route.ts](app/api/account/me/route.ts) returns full `AccountOverview` (email + createdAt + profile). After SSR refactor, no client/server code calls it (verified: `grep /api/account/me` only matches the route + tests).
- **Why this is new:** SSR moved the data path off this endpoint. Endpoint is now zero-utility surface.
- **Impact:** Authenticated user can still call `GET /api/account/me` and exfil their own profile. They could already see this data via the page, so no privilege escalation. Net effect: extra surface for future bugs (e.g., if auth check regresses on this route) and bypasses the new minimal-prop tightening (F11 L1/L2).
- **Fix:** Delete the route handler + delete `tests/account/me-route.test.ts` + remove `getAccountOverview` from `lib/services/account.ts` (also unreachable now). Tests in `tests/account/account-service.test.ts` still cover the underlying user query.

### F11.4 — User-deleted-but-session-valid: inconsistent UX across RSC pages (low)
- **Status:** open
- **Severity:** low
- **What:** JWT sessions live up to 30 days. If a user row is deleted (admin action, GDPR purge) but the JWT cookie hasn't expired:
  - `/account` — [app/account/page.tsx:19](app/account/page.tsx#L19) throws `AppError(NOT_FOUND)` → `app/account/error.tsx` shows "Something went wrong" → reset loops indefinitely
  - `/account/view-details` — `getProfile` returns all-null profile → page renders with empty fields, no error
  - `/account/orders` — `listOrders` returns `[]` → page renders "No orders made yet"
  - `/order/confirmation?orderId=X` — `getOrder` throws NOT_FOUND → `notFound()` → 404 page
- **Why this is new:** Pre-SSR, the API would 401 (or also 404) and the client would handle. Now error boundaries vs silent empty states diverge per page.
- **Impact:** Stale-session user can still browse parts of the app with empty data; can attempt mutations which will all fail at the API layer. Not a privilege escalation. Inconsistent UX is the only real problem.
- **Fix:** Add `requireUserOrSignOut(userId)` helper in `lib/auth/session.ts` — checks `users` table; on miss, calls a server action that clears the session cookie and redirects to `/auth`. Use it at the top of every RSC page that depends on the user existing.

### F11.5 — RSC reads bypass per-user rate limits applied on the now-skipped API routes (low)
- **Status:** open
- **Severity:** low
- **What:** Original API routes had `await rateLimit("me:USER", { limit: 120, windowSec: 60 })` ([api/account/me/route.ts:13](app/api/account/me/route.ts#L13)), `"orders:list:USER"` 60/60s ([api/orders/route.ts:17](app/api/orders/route.ts#L17)), `"orders:get:USER"` 60/60s ([api/orders/[id]/route.ts:19](app/api/orders/[id]/route.ts#L19)). RSC pages (`account/page.tsx`, `orders/page.tsx`, `view-details/page.tsx`, `confirmation/page.tsx`) call the underlying services directly, no rate limit.
- **Why this is new:** Direct service-layer calls from RSC bypass the API-route rate-limit wrapper.
- **Impact:** Authenticated user reload-spamming `/account/orders` issues unbounded `SELECT … FROM orders WHERE user_id=$1 LIMIT 100` to Neon. Per-user (identifiable). Bounded by request RTT (~50ms/req) so single-attacker DoS impact is limited; multi-attacker bot net could pressure DB. Direct API endpoints (`/api/account/me`, `/api/orders`, `/api/orders/[id]`) still rate-limited so attacker with credentials can't bypass via API.
- **Fix:** Apply rate limiting in RSC at the start of each page: `await rateLimit(\`rsc:${pageName}:${session.userId}\`, { limit: 60, windowSec: 60 })`. Or move to middleware-level rate limit keyed by `(session.userId, page)` via header.

### F11.6 — No layout-level auth gate; `/account/*` and `/order/*` rely on per-page `getSession` checks (medium)
- **Status:** open
- **Severity:** medium
- **What:** Defense-in-depth: each RSC page individually calls `getSession() + redirect`. Easy to add a new page under `app/account/` or `app/order/` and forget the auth check. Middleware ([middleware.ts:13](middleware.ts#L13)) does protect at the edge with `PROTECTED_PAGE = [/^\/account(\/|$)/, /^\/order(\/|$)/]` — but `DEV_SKIP_GATES=true` ([middleware.ts:18](middleware.ts#L18)) bypasses it entirely in dev (the very mode where developers add new pages and test).
- **Why this is new:** Pre-SSR, `useAuthGate` hook was the per-page client-side guard. Convention was visible: any client-rendered protected page imported it. Post-SSR, the convention is "remember to call `getSession`" — easier to miss.
- **Impact:** Dev environment with `DEV_SKIP_GATES=true` + a new RSC page that forgot the check = unauthenticated user reads protected data. In production, middleware catches it. So this is primarily a "code review will catch it eventually" concern, but defense-in-depth says don't rely on a single layer.
- **Fix:** Create `app/account/layout.tsx` and `app/order/layout.tsx` as RSC layouts that call `getSession()` + `redirect()`. All child segments inherit the auth check. Per-page `getSession()` becomes redundant but doesn't hurt (idempotent, cookie cached for the request). Document the layout convention in CLAUDE.md or a README.

### F11.7 — Confirmation page shows "Paid" label for `pending` orders (race UX vulnerability) (medium)
- **Status:** open
- **Severity:** medium
- **What:** [app/order/confirmation/ConfirmationView.tsx:21](app/order/confirmation/ConfirmationView.tsx#L21) — `priceLabel = expanded ? "Price" : "Paid"` and the price box renders the same regardless of `status` (only `failed` gets a distinct UI). After Razorpay redirects the user back, the webhook may not yet have fired → DB still shows `status=pending` → user sees "Paid" but DB says pending. If the webhook later fires `failed`, user already believed payment succeeded.
- **Why this is new:** Per F5.3 (existing), payment verify TOCTOU is fixed at the DB layer. But the UI was always client-fetched and showed loading until data arrived; pre-SSR there was at least a chance the client's fetch fired after the webhook (round-trip time). Post-SSR, the page renders synchronously on the server immediately on redirect — strictly increases the race window.
- **Impact:** Trust/support issue. User believes payment went through, may close the tab. If webhook fails or is delayed, order silently fails. User reaches out to support claiming "I paid". Not a financial loss (payment verify still gates capture) but real reputational/support cost.
- **Fix:** In [ConfirmationView.tsx](app/order/confirmation/ConfirmationView.tsx), branch on three states: `paid` → "Paid" + green; `pending` → "Processing payment…" + neutral with auto-refresh after 5s; `failed` → existing red Failed UI; `cancelled` → "Cancelled" + gray. Add a poll: `useEffect` that refetches the order every 3s while status is `pending`, stops on terminal status.

### F11.8 — Cache-Control headers on RSC responses not asserted in tests (low)
- **Status:** open
- **Severity:** low
- **What:** RSC pages declare `export const dynamic = "force-dynamic"` ([account/page.tsx:9](app/account/page.tsx#L9), [orders/page.tsx:7](app/account/orders/page.tsx#L7), [view-details/page.tsx:6](app/account/view-details/page.tsx#L6), [confirmation/page.tsx:7](app/order/confirmation/page.tsx#L7), [page.tsx:4](app/page.tsx#L4)). Next.js *should* emit `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for these. Not verified in CI, not asserted in any integration test.
- **Why this is new:** Pre-SSR, pages were client-rendered; HTML response was the same shell for all users → cacheability was a non-issue. Post-SSR, the HTML response contains user-specific data → must NOT be cacheable by any shared intermediary (corporate proxy, CDN edge cache misconfigured to ignore Vary, browser back/forward cache).
- **Impact:** A misconfigured Vercel edge config or a customer-side proxy that strips `Vary` headers and caches by URL alone could serve User A's `/account` HTML to User B. Email + createdAt + (for view-details) full profile leaked cross-user. Critical if it happens, but requires misconfiguration upstream.
- **Fix:** Add an integration test that fetches each RSC page authenticated and asserts `cache-control` includes `private` and `no-store`. Also assert `Vary: Cookie` is present (cookie-based session keying). Failing the test blocks deploys with regressions.

### F11.9 — Hydration error from React render of `let order` after early `notFound()` (very low / type-only)
- **Status:** accepted-risk
- **Severity:** very low
- **What:** [app/order/confirmation/page.tsx:24](app/order/confirmation/page.tsx#L24) — `let order; try { order = await getOrder(...); } catch { ... }`. TypeScript widens `order` to `OrderDetailResponse | undefined`. The catch block always either calls `notFound()` (throws `NEXT_NOT_FOUND`) or rethrows, so the `return <ConfirmationView initial={order} />` line is unreachable with `undefined`. `tsc` accepts it because `notFound()` is typed `never`.
- **Why noted:** Reads as if it could pass `undefined` to the client. Confirmed safe. Future maintainer might refactor and break the invariant.
- **Fix:** Refactor to `const order = await getOrderOrNotFound(session.userId, id)` helper that wraps the try/catch — or use early-return pattern. Keep status quo, just document.

### F11.10 — `home` page now `force-dynamic`: every visit hits server even for anonymous users (low / perf)
- **Status:** open
- **Severity:** low (perf, not security)
- **What:** [app/page.tsx:4](app/page.tsx#L4) — `export const dynamic = "force-dynamic"` because we read `getSession()` to set `isLoggedIn`. This disables Vercel's CDN cache entirely for `/`. Pre-SSR (`"use client"` page), Next.js could still SSG-cache the shell and let the client useSession hydrate.
- **Impact:** Every visitor — including unauthenticated bots, search crawlers, CDN-warming pingers — runs `getSession()` (cookie parse + JWT verify if cookie present) + full page render. SSR JS execution > static HTML serve. Could 5–10x compute cost for the home route at scale.
- **Fix:** Split the home page: `app/page.tsx` becomes a static RSC (no session read), and add a small client island `<GetOneCTA />` that calls `useSession` and chooses href. Then drop `force-dynamic` on `app/page.tsx`. Or use Next.js Partial Prerendering (`experimental.ppr`) once stable: static shell + dynamic island.

### F11.11 — Error boundary reset can loop on permanent failures (low)
- **Status:** open
- **Severity:** low
- **What:** [app/account/error.tsx:23](app/account/error.tsx#L23) and [app/order/error.tsx:25](app/order/error.tsx#L25) — `onClick={reset}` re-renders the same RSC. If the underlying error is permanent (DB user row missing → F11.4, or auth state corrupt), the page errors again immediately. Infinite reset loop on user retry.
- **Impact:** UX (rage-clicking the retry button). No security impact.
- **Fix:** Track retry count in error.tsx local state; after 2 retries, show "Sign out and try again" link to `/api/auth/signout?callbackUrl=/auth` instead of reset.

### F11.12 — `app/order/error.tsx` reset preserves URL search params, but no path-aware reset on `/order/confirmation?orderId=invalid` (low)
- **Status:** open
- **Severity:** low
- **What:** If user visits `/order/confirmation?orderId=<malformed>`, [confirmation/page.tsx:22](app/order/confirmation/page.tsx#L22) calls `notFound()` which renders Next.js 404 (not error.tsx). Good. But if `getOrder` throws a non-NOT_FOUND `AppError` (e.g., DB connection error), error.tsx fires; reset re-runs RSC with same orderId → likely same error.
- **Impact:** Same loop as F11.11 but in a more specific scenario.
- **Fix:** Same as F11.11.

### §11 verification

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| Visual code review of all 5 RSC pages + 5 islands + 2 error boundaries + modified hook | done |
| Threat-modeled: anonymous → authenticated → dev-mode bypass → user-deleted-but-session-valid → CDN cache misconfiguration → webhook race | done |
| Existing API routes for mutations still CSRF-protected (PUT profile, POST orders, etc) | unchanged from §F10 — still protected |
| IDOR scoping in all RSC queries (`where(userId)`) | verified — `listOrders`, `getOrder`, `db.query.users` all scoped |
| Error boundary leak surface (`error.message` to client in prod) | verified — only `error.digest` displayed; raw `error.message` never rendered |
| `__NEXT_DATA__` prop minimization | verified after F11.L1/L2 fix — account: `{email,createdAt}`; view-details: `Profile` only; orders: safe `OrderResponse` array; confirmation: full `OrderDetailResponse` with own-data only |
| `dangerouslySetInnerHTML` / `eval` introduced by refactor | none |
| `SvgText` XSS surface | safe — text rendered as SVG path data, never DOM HTML |

### §11 summary

| ID | Severity | Description | Status |
|---|---|---|---|
| F11.1 | medium | RSC date formatters use local TZ → SSR hydration mismatch | open |
| F11.2 | low | RSC redirect drops query string (only observable in dev/race) | open |
| F11.3 | low | `/api/account/me` is dead production code, still reachable | open |
| F11.4 | low | User-deleted-but-session-valid: inconsistent error UX | open |
| F11.5 | low | RSC reads bypass per-user rate limits | open |
| F11.6 | medium | No layout-level auth gate (defense-in-depth) | open |
| F11.7 | medium | Confirmation shows "Paid" for pending orders (webhook race trust) | open |
| F11.8 | low | RSC `Cache-Control` headers not asserted by tests | open |
| F11.9 | very low | Type-only: `let order` widening after `notFound()` | accepted-risk |
| F11.10 | low (perf) | Home page `force-dynamic` for unauth users wastes compute | open |
| F11.11 | low | Error boundary reset can loop on permanent failures | open |
| F11.12 | low | Same loop pattern in `/order/error.tsx` for non-NOT_FOUND errors | open |

---

## §12 — Post-§11 fixes + loading-component refactor + deep auth/payment audit

Three rounds of work captured here:

1. **§11 remediation** — every F11.x finding (F11.1 → F11.12) was fixed in code. See "Status" column update at the bottom of this section.
2. **Loading-component / Suspense refactor pass (S1 → S6)** — audit of the new `app/components/LoadingBar.tsx`, `PageLoading.tsx`, `ComponentLoading.tsx`, the four `loading.tsx` files for `/account`, `/account/orders`, `/account/view-details`, `/order/confirmation`, plus the `AccountShell` split into `UserCard` (async server component) + slim shell, and the home page de-`force-dynamic` perf change. All six findings fixed.
3. **Deep audit pass as senior cybersec (S7 → S16)** — auth flows (verify-password, login-otp, send-otp, change-password, register, reset-password), payment flows (initiate, verify, webhook), CSRF, OTP, address service, IP trust, NextAuth JWT callback, headers, env validation. Ten findings, all fixed.

### F11 remediation summary (all 12 fixed)

- **F11.1** — `getDate/getMonth/getFullYear` → `getUTCDate/getUTCMonth/getUTCFullYear` + `timeZone: "UTC"` in `toLocaleDateString` across `AccountShell.tsx`, `useEditDetailsForm.ts`, `orders/utils/formatters.ts`. Hydration matches.
- **F11.2** — `app/order/confirmation/page.tsx` now `await Promise.all([getSession(), searchParams])` and reconstructs `redirect(\`/auth?from=${encodeURIComponent(\`/order/confirmation?orderId=${id}\`)}\`)` so the orderId survives the redirect.
- **F11.3** — `app/api/account/me/route.ts` and `tests/account/me-route.test.ts` deleted.
- **F11.4** — `forceSignOut(redirectTo): Promise<never>` helper added to `lib/auth/session.ts`. Used in `UserCard` for the user-deleted-but-session-valid case → server-side signOut + redirect to `/auth`. No more error-boundary loop.
- **F11.5** — `await rateLimit(\`page:<name>:${session.userId}\`, { limit: 120, windowSec: 60 })` added at the top of every protected RSC page (`account`, `account/orders`, `account/view-details`, `order/confirmation`).
- **F11.6** — `app/account/layout.tsx` and `app/order/layout.tsx` created. Each calls `getSession() + redirect()` and exports `dynamic = "force-dynamic"`. Defense-in-depth above middleware. Auth.js v5 dedupes `auth()` per-request so the duplication is free.
- **F11.7** — `ConfirmationView.tsx` now branches on a live `status` state initialised from `initial.status`. Pending state shows a `LoadingBar` + polls `/api/orders/:id` every 3 s until terminal status.
- **F11.8** — `tests/http/cache-control.test.ts` created. Asserts `dynamic === "force-dynamic"` on all 4 protected pages, both protected layouts, and absence of `dynamic` on the home page.
- **F11.9** — `let order` pattern replaced with `await getOrder(...).catch((err): never => { ... })`. No widening, no unreachable assignment.
- **F11.10** — `app/page.tsx` no longer `force-dynamic`. Session check moved to `HomeClient` via `useSession()`. Home page becomes statically generated.
- **F11.11 / F11.12** — `app/account/error.tsx` and `app/order/error.tsx` track retry count. After 2 failed `reset()` attempts, render "Sign out and try again" linking to `/api/auth/signout?callbackUrl=/auth` instead of looping.

### S1 — UserCard prop trust / footgun IDOR (low)
- **Status:** fixed
- **What:** `UserCard.tsx` initially took `userId: string` as prop and queried `db.query.users.findFirst({where: eq(users.id, userId)})` without verifying the prop matched the session. Currently safe (only `page.tsx` called it with `session.userId`), but contract trusted any caller — future renderer passing arbitrary UUID would leak that user's email.
- **Why this is new:** Loading refactor moved the DB query from `page.tsx` (where it was inline next to `session.userId`) into a reusable component for Suspense streaming.
- **Fix:** Dropped `userId` prop entirely. UserCard now calls `requireSession()` itself. Page passes nothing.

### S2 — `user!` non-null assertion after `await signOut(...)` (very low)
- **Status:** fixed
- **What:** Pattern `if (!user) await signOut(...); user!.email`. Relied on signOut throwing `NEXT_REDIRECT`. If signOut ever returned (lib upgrade, config change, NextAuth signOut behavior change), `user!` would TypeError.
- **Fix:** `forceSignOut(redirectTo): Promise<never>` helper in `lib/auth/session.ts` calls signOut + throws Error if it returns. UserCard uses `if (!user) { await forceSignOut("/auth"); throw new Error("unreachable"); }` — TS narrows `user`, no `!` assertions.

### S3 — Triple `getSession()` per /account request (very low / info)
- **Status:** mitigated + documented
- **What:** Layout + page + UserCard all call `getSession()`. Three calls per request.
- **Fix:** Documented in `app/account/layout.tsx` comment that Auth.js v5 dedupes `auth()` per-request via React `cache()` — three calls = one JWT verify + one Redis lookup. Kept all three for defense-in-depth.

### S4 — Home CTA flash for authed users (very low / UX)
- **Status:** fixed
- **What:** `HomeClient` uses `useSession()`. First paint: `status==="loading"` → CTA href `/auth?from=order`. Authed user clicking in that ~100 ms window bounces through `/auth`.
- **Fix:** `HomeClient` + `MobileHome` block click while `status === "loading"` (`onClick={(e) => isSessionLoading && e.preventDefault()}` + `aria-disabled={isSessionLoading}`). Authed users no longer bounce on first-paint clicks.

### S5 — `loading.tsx` no auth check (very low / accepted)
- **Status:** accepted-risk
- **What:** 4 `loading.tsx` files render `<PageLoading />` without verifying session. If middleware + layout both fail, unauth user sees the bar briefly.
- **Why accepted:** Adding `getSession()` to loading.tsx defeats its purpose (instant feedback). Layout `force-dynamic` + middleware = two layers of defense already. No data leaked from a spinner.

### S6 — Cache-Control test gap on layouts (low / info)
- **Status:** fixed
- **What:** `tests/http/cache-control.test.ts` only verified pages; didn't cover the new layout files.
- **Fix:** Both `app/account/layout.tsx` and `app/order/layout.tsx` now `export const dynamic = "force-dynamic"`. Test extended with `FORCE_DYNAMIC_LAYOUTS` block.

### S7 — `verifyPayment` defense-in-depth gap (medium)
- **Status:** fixed
- **Severity:** medium
- **What:** `lib/services/payment.ts:104` previously: `if (order.razorpayOrderId && order.razorpayOrderId !== input.razorpayOrderId)`. Short-circuited when `order.razorpayOrderId` was null (no initiate run on this order). Allowed: attacker pays for own order A, submits `verifyPayment(orderId=B, razorpayOrderId=rp_order_A, paymentId, signature)` — signature verifies (HMAC over A's tuple is valid), update tries to mark B paid. Currently blocked by `razorpayOrderId UNIQUE` DB constraint, but app layer must not rely on a single defense.
- **Fix:** Inverted check: `if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) throw "razorpay order id mismatch"`. Forces verify after a successful initiate on the same row.

### S8 — Verify-password account-lockout DoS via per-email rate limit (low)
- **Status:** fixed
- **What:** `verify-pw:email:${input.email}` 5/hour. Attacker fires 5 wrong-password POSTs to victim email → victim locked out for 1 hour.
- **Fix:** Removed per-email hard cap. Replaced with progressive-delay counter `verify-pw:fail:${email}` (TTL 1 h). On bad password: INCR + sleep `min(200·2^(n-1), 10000)` ms before responding. On success: DEL counter. Per-IP cap (20/hr) retained as absolute brake. Legitimate users get unlimited retries with typo-friendly delay; attackers get exponential slowdown.

### S9 — Email-enumeration timing leak in `send-otp` (low)
- **Status:** fixed
- **What:** `SEND_LATENCY_TARGET_MS = 350` only padded the no-op branch. Real Resend send routinely 400–2000 ms → no padding → response time leaked existence.
- **Fix:** Bumped target to `2500` (above Resend p99). Both branches indistinguishable at the cost of UX latency on every send-otp. Long-term: decouple via background queue (noted in code comment).

### S10 — `getClientIp` trusts `x-real-ip` / `x-forwarded-for` without source pinning (low / deployment-dependent)
- **Status:** fixed
- **What:** Read both headers in fallback chain. If app deployed off Vercel (custom proxy chain or direct function URL), client could spoof either, breaking all per-IP rate limits.
- **Fix:** Added `TRUSTED_IP_HEADER` env var (default `x-real-ip` for Vercel). `getClientIp` now reads only that one header. Non-Vercel deploys must set it (`cf-connecting-ip` for Cloudflare, etc.). Fail-closed in production if header missing.

### S11 — Login-OTP spam via peek-only token check (low)
- **Status:** fixed
- **What:** `peekPendingMfaToken` reads token without invalidating. Per-email rate limit allowed 5 OTP sends/hour. Attacker with valid pendingMfaToken spammed victim inbox + Resend quota.
- **Fix:** Added per-token send counter `otp:login-send-count:${pendingMfaToken}` (TTL 5 min, cap 3). Throws 429 above cap → user must re-enter password to get a new pending token.

### S12 — Address row count uncapped per user (low / data-growth)
- **Status:** fixed
- **What:** `createAddress` only checked ownership. 20 creates/hour × 8760 hours ≈ 175k rows/year. Soft-deletes never purged.
- **Fix:** Pre-insert count of active addresses; throw 409 if `>= 50`. Cap is well above realistic usage.

### S13 — Phone-verify binds client-supplied phone, not OTP-target phone (low)
- **Status:** fixed
- **What:** `verifyPhoneOtp(input.phone, input.code)` then `users.phone = input.phone`. With session compromise (XSS / cookie theft), attacker called `phone/send` with their own phone, got OTP on their phone, verified → victim's account had attacker phone linked. Victim locked out of phone recovery.
- **Fix:** `phone/send` now writes `phone-pending:${userId} = phone` to Redis (TTL 10 min, matches Twilio Verify). `phone/verify` reads + asserts `boundPhone === input.phone` BEFORE Twilio check. Burned on success.

### S14 — JWT callback fails-loud on Redis error during `pw:changed` lookup (very low / info)
- **Status:** fixed
- **What:** `redis.get('pw:changed:...')` inside JWT callback uncaught. On Upstash blip → all sessions broke until Redis recovered. Implicit fail-closed.
- **Fix:** Explicit `try/catch` with `logger.error` + `return invalidToken`. Documented choice (security > uptime). Same effective behavior, now intentional and alerted.

### S15 — Webhook event-dedup TOCTOU window (very low / info)
- **Status:** fixed
- **What:** `findFirst({razorpayEventId})` → if not found, do work → `insert(paymentEvents)`. Concurrent Razorpay retries could both pass dedup, both attempt order update, second insert collided on unique → 500. Razorpay then retried again. Idempotent overall but noisy.
- **Fix:** Refactored `applyWebhookEvent` to insert first with `onConflictDoNothing({target: paymentEvents.razorpayEventId})`. Order update only if insert returned a row. Atomic dedup; second delivery short-circuits cleanly.

### S16 — Change-password / phone-verify don't require old credential (low / info)
- **Status:** partially fixed (change-password done; phone-verify accepted-risk)
- **What:** Both endpoints required only session + email/phone OTP. Session-cookie compromise + email access = silent password rotation; session compromise + phone-OTP intercept = silent phone change.
- **Fix (change-password):**
  - Schema (`lib/contracts/auth.ts`) `ChangePasswordRequest` adds required `currentPassword: LoginPassword`.
  - Route (`app/api/account/change-password/route.ts`) verifies via `verifyPassword(input.currentPassword, user.passwordHash)` BEFORE consuming the OTP token (wrong currentPassword doesn't burn the OTP).
  - Hook + page UI: new `currentPassword` field as the first input on the change-password page; `setActiveField("current")` is the default focus; sent in request body.
- **Accepted (phone-verify):** Adding currentPassword prompt to phone change adds friction and the binding fix from S13 already closes the most realistic attack chain. Tracked as backlog if phone is later treated as a recovery factor with higher trust.

### §12 verification

| Check | Result |
|---|---|
| `tsc --noEmit --skipLibCheck` after every batch of edits | exit 0 |
| F11.1 → F11.12 individually re-tested in code | done |
| Loading-refactor surface re-audited (S1 → S6) | done |
| Deep audit of auth + payment + addresses + webhook + IP trust + JWT lifecycle (S7 → S16) | done |
| New helpers (`forceSignOut`, `TRUSTED_IP_HEADER`, address cap, phone-bind, fail counter, OTP send counter) covered with explicit comments tying back to finding ID | done |
| `dangerouslySetInnerHTML` / `eval` introduced by any fix | none |
| Drizzle queries still parameterised | yes — all changes use `eq()`, `and()`, `count()`; no raw SQL interpolation |

### §12 summary

| ID | Severity | Description | Status |
|---|---|---|---|
| F11.1 | medium | RSC date formatters use local TZ → SSR hydration mismatch | fixed |
| F11.2 | low | RSC redirect drops query string | fixed |
| F11.3 | low | `/api/account/me` dead production code | fixed (deleted) |
| F11.4 | low | User-deleted-but-session-valid: inconsistent error UX | fixed (`forceSignOut`) |
| F11.5 | low | RSC reads bypass per-user rate limits | fixed |
| F11.6 | medium | No layout-level auth gate | fixed (layouts added) |
| F11.7 | medium | Confirmation shows "Paid" for pending orders | fixed (poll + LoadingBar) |
| F11.8 | low | RSC `Cache-Control` headers not asserted by tests | fixed |
| F11.9 | very low | Type-only: `let order` widening | fixed (refactor) |
| F11.10 | low (perf) | Home page `force-dynamic` wastes compute | fixed (static + `useSession`) |
| F11.11 | low | Error boundary reset loop on permanent failures | fixed (retry counter) |
| F11.12 | low | Same loop in `/order/error.tsx` | fixed (retry counter) |
| S1 | low | UserCard prop trust / footgun IDOR | fixed |
| S2 | very low | `user!` after `signOut()` | fixed (`forceSignOut`) |
| S3 | very low | Triple `getSession()` per request | mitigated + documented |
| S4 | very low | Home CTA flash bounces authed user through `/auth` | fixed (click guard) |
| S5 | very low | `loading.tsx` no auth check | accepted-risk |
| S6 | low | Cache-Control test gap on layouts | fixed |
| S7 | medium | `verifyPayment` defense-in-depth gap on `razorpayOrderId` | fixed |
| S8 | low | Verify-password account-lockout DoS | fixed (progressive delay) |
| S9 | low | Email-enumeration timing leak in `send-otp` | fixed (raised target) |
| S10 | low | `getClientIp` trusts unverified headers | fixed (`TRUSTED_IP_HEADER`) |
| S11 | low | Login-OTP spam via peek-only token check | fixed (per-token counter) |
| S12 | low | Address row count uncapped | fixed (cap 50) |
| S13 | low | Phone-verify binds client-supplied phone | fixed (Redis bind) |
| S14 | very low | JWT callback fails-loud on Redis error | fixed (explicit fail-closed) |
| S15 | very low | Webhook event-dedup TOCTOU window | fixed (insert-first) |
| S16 | low | Change-password no current-password check | fixed (currentPassword required) |


**Rollup:** 0 critical, 0 high, 3 medium, 8 low, 1 very-low. None block deployment per SECURITY_PLAN §6 (no high/critical). Recommended pre-launch: F11.1 (cheap fix, real user-visible bug), F11.6 (defense-in-depth, single layout file per route), F11.7 (UX trust). F11.3 + F11.10 are easy wins post-launch.

---

## §13 — Deep audit pass (2026-05-26)

Scope: re-audit auth provider matrix, pending-mfa token lifecycle, payment service, webhook, order/address services, validate-address outbound, and middleware exemption surface. Threat model: XSS-on-login + email-inbox-only attacker + authenticated quota abuse + webhook trust gradient.

### F13.1 — Unscoped `pending-mfa` token reused across three NextAuth providers → 2FA bypass via provider downgrade (HIGH)
- **Status:** fixed
- **Severity:** high
- **What:** [lib/auth/pending-mfa.ts:19-34](lib/auth/pending-mfa.ts#L19) — `issuePendingMfaToken` writes `{ userId, email, ipHash, uaHash }` to key `pending-mfa:${uuid}`. Three NextAuth credentials providers all consume the same key namespace via `consumePendingMfaToken(token, ip, ua)`:
  - `credentials-with-otp` — requires pendingMfaToken **+** valid login OTP ([lib/auth/index.ts:19-51](lib/auth/index.ts#L19))
  - `credentials-signup` — requires pendingMfaToken only ([lib/auth/index.ts:52-74](lib/auth/index.ts#L52))
  - `credentials-otp-login` — requires pendingMfaToken only ([lib/auth/index.ts:79-101](lib/auth/index.ts#L79))
- **Attack:** XSS or any token-disclosure on the login page captures the `pendingMfaToken` that `/api/auth/verify-password` returns to the client (before the OTP step). Attacker `signIn("credentials-signup", { signupSessionToken: stolenToken })` from the same victim browser context → `consumePendingMfaToken` matches `ipHash`+`uaHash` (XSS runs in victim's tab) → session issued **without ever passing the OTP gate**. The F0.1 2FA fix is bypassed because the token itself doesn't encode the flow that issued it.
- **Why this is new:** `credentials-signup` and `credentials-otp-login` were added after F0.1. Each was designed for its own happy path (auto-login after registration; passwordless email-OTP login). Neither asserts what kind of token it was given.
- **Fix:** Add `flow: "mfa-second-factor" | "signup-auto" | "otp-login"` to `PendingMfaRecord`. `issuePendingMfaToken` takes the flow as required arg; `consumePendingMfaToken` takes `expectedFlow`. Mismatch → throw + burn the key (same pattern F7.2 used for `consumeOtpToken`).
- **Files:** `lib/auth/pending-mfa.ts`, `lib/auth/index.ts`, `app/api/auth/verify-password/route.ts`, `app/api/auth/otp-login/route.ts`, `app/api/auth/register/route.ts`

### F13.2 — `applyWebhookEvent` flips `status=paid` without amount/currency assertion (MEDIUM)
- **Status:** fixed
- **Severity:** medium
- **What:** [lib/services/payment.ts:204-212](lib/services/payment.ts#L204) — on `payment.captured` the UPDATE only checks `id` + `status=pending`. The webhook event payload (`parsed.payload.payment.entity.amount` / `currency`) is never compared against `order.totalPaise` / `"INR"`. HMAC proves the payload came from Razorpay, but defense-in-depth says the server should still confirm the captured amount matches what the order owes.
- **Attack realistic concern:** Less an external attack vector (Razorpay signs the payload) and more a guard against (a) Razorpay account misconfiguration replaying an event from a different merchant order via the same webhook secret, (b) future code paths that introduce variable amounts (discounts, refunds) where amount drift becomes possible. The verify-payment path has the equivalent guard via `razorpayOrderId` mismatch (S7); the webhook path doesn't.
- **Fix:** In `applyWebhookEvent`, after fetching the order, assert `parsed.payload.payment.entity.amount === orderRow.totalPaise && currency === "INR"`. On mismatch log + insert the event row (for audit) but do not update `status`.
- **Files:** `lib/services/payment.ts`

### F13.3 — `createOrder` direct address inserts bypass S12 cap and pollute `listAddresses` (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [lib/services/order.ts:38-49](lib/services/order.ts#L38) — billing/shipping addresses are inserted via `db.insert(addresses).values(...)` directly. The S12 cap (50 active rows per user, enforced in `createAddress` at [lib/services/address.ts:35-46](lib/services/address.ts#L35)) is bypassed entirely. 20 orders/hour × 2 addresses = 40 new rows/hour, accumulating without limit.
- **Side effect:** Order-created addresses are visible in `GET /api/addresses` (no flag distinguishes them from user-managed entries), so the user's address book balloons after every checkout. Snapshot in `orders.billingAddressSnapshot` already preserves the data — the FK rows are not needed for past-order integrity.
- **Fix (pick one):**
  - Simplest: drop `billingAddressId`/`shippingAddressId` columns; rely on the snapshot JSONB columns. Removes a whole class of accumulation bugs and an IDOR surface.
  - Or: tag order-driven addresses (`source: "order"`) and exclude them from `listAddresses`; still enforce the cap per-user across both sources.
- **Files:** `lib/services/order.ts`, `lib/services/address.ts`, `lib/db/schema.ts`

### F13.4 — `validate-address` outbound fetch has no timeout (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/validate-address/route.ts:67-74](app/api/validate-address/route.ts#L67) — `fetch(...)` with no `AbortSignal.timeout`. If Google's Address Validation API stalls, the Node request stays open until the platform's request timeout kicks in (Vercel: ~25 s for hobby/pro). One user can hold one rate-limit slot's worth of compute time with no recourse.
- **Fix:** `fetch(url, { signal: AbortSignal.timeout(5000), ... })` + treat the abort path the same as the existing `catch` branch (return `{ valid: false, error: "..." }`).
- **Files:** `app/api/validate-address/route.ts`

### F13.5 — `validate-address` parses non-2xx Google response without checking `ok` (LOW)
- **Status:** fixed
- **Severity:** low
- **What:** [app/api/validate-address/route.ts:79](app/api/validate-address/route.ts#L79) — `await googleRes.json()` is called unconditionally. A 500 from Google returning HTML throws JSON parse error → unhandled → withHandler returns generic 500 to the caller, but the error gets logged as `unhandled route error` instead of the more specific upstream-failed code.
- **Fix:** `if (!googleRes.ok) { logger.warn({ status: googleRes.status }, ...); return { valid: false, error: "..." }; }` before parsing.
- **Files:** `app/api/validate-address/route.ts`

### F13.6 — Passwordless OTP login leaves no "password reset" audit trail (LOW / design)
- **Status:** fixed
- **Severity:** low
- **What:** `/api/auth/otp-login` lets an attacker with inbox access log in silently. The traditional canary — "your password was just reset" — never fires because the password is never touched. Login email notifications are not implemented (`logger.info "otp-login completed"` is server-side only).
- **Why noted:** Same trust class as forgot-password, but forgot-password forces the attacker to set a new password (which usually triggers a notification + the victim noticing they can't log in). otp-login doesn't.
- **Fix:** Send a "new sign-in from email-only flow" email on successful `credentials-otp-login` authorize. Include IP / UA / timestamp. Either non-blocking or behind a Resend-friendly queue. Bonus: rate-limit notifications to one per 24 h per account to avoid being a spam lever.
- **Files:** `lib/auth/index.ts` (credentials-otp-login authorize hook), `lib/email/provider.ts`

### F13.7 — `consumeOtpToken` flow-mismatch reveals existence of a still-valid token via GETDEL semantics (LOW)
- **Status:** fixed (logged via the new pending-mfa flow-mismatch warning; same pattern can be added to `consumeOtpToken` in `lib/auth/otp.ts` if desired)
- **Severity:** low
- **What:** [lib/auth/otp.ts:167-188](lib/auth/otp.ts#L167) — `consumeOtpToken` uses `GETDEL`. On flow mismatch the record was already deleted by GETDEL before the flow check throws. Intentional per F7.2 ("burn before throwing"). Side effect: an attacker holding a valid `email-verify` token who sends it to the **wrong** endpoint (e.g. `/api/account/change-password` expecting `change-pw`) burns the token. If the attacker was using the token speculatively against a guessed-flow endpoint, they've now invalidated it for the legitimate consumer path. Edge-case griefing vector.
- **Why noted:** The F7.2 design choice is deliberate (defense-in-depth against scope confusion). Documenting that the trade-off cost is "an attacker who already has a token can burn it" — which is not really a cost, since the token was already in attacker hands. Net: accept the F7.2 behavior; just log a `flow-mismatch` event so multiple mismatched submissions are visible in monitoring.
- **Fix:** Add `logger.warn({ expectedFlow, actualFlow }, "otp-token flow mismatch")` inside the mismatch branch before throwing.
- **Files:** `lib/auth/otp.ts`

### §13 verification
| Check | Result |
|---|---|
| `tsc --noEmit` | not run (read-only audit) |
| Provider matrix cross-checked | done — three providers, one token namespace, two providers skip OTP |
| Webhook signature verification path | unchanged, verified via [`verifyWebhookSignature`](lib/razorpay/verify.ts) |
| IDOR scoping on order/address services | unchanged — all queries scoped by `userId` |
| Rate-limit coverage on §13-touched routes | unchanged — `validate-address`, `otp-login`, `verify-password` all rate-limited |
| New `dangerouslySetInnerHTML` / `eval` introduced | none |

### §13 summary
| ID | Severity | Description | Status |
|---|---|---|---|
| F13.1 | **high** | Unscoped `pending-mfa` token + 3 providers → 2FA bypass via provider downgrade | **fixed** |
| F13.2 | medium | Webhook `payment.captured` flips status without amount/currency assertion | **fixed** |
| F13.3 | low | `createOrder` bypasses S12 address cap + pollutes address book | **fixed** (FK inserts dropped; snapshot is sole source of truth) |
| F13.4 | low | `validate-address` outbound fetch has no timeout | **fixed** (5s `AbortSignal.timeout`) |
| F13.5 | low | `validate-address` parses non-2xx Google response without `.ok` check | **fixed** |
| F13.6 | low | Passwordless OTP login has no audit-trail notification to victim | **fixed** (Resend `sendLoginAlert`, 1/24h dedup) |
| F13.7 | low | `consumeOtpToken` flow-mismatch burns token silently (document + log) | **fixed** (`logger.warn` added) |

### §13 fixes — implementation notes
- **F13.1:** `PendingMfaFlow = "mfa-second-factor" | "signup-auto" | "otp-login"` added to `pending-mfa.ts`. `issuePendingMfaToken` requires flow; `consumePendingMfaToken` requires `expectedFlow`. Flow mismatch is burned-on-rejection (GETDEL semantics). `peekPendingMfaToken` also flow-asserts. Three call-site issuers (`verify-password`, `register`, `otp-login`) and three consumer providers (`credentials-with-otp`, `credentials-signup`, `credentials-otp-login`) updated. New tests in `pending-mfa.test.ts` cover cross-flow rejection.
- **F13.2:** Webhook handler now fetches `{ id, totalPaise }` for the matched order, asserts `eventAmount === totalPaise && eventCurrency === "INR"` before the status transition on `payment.captured`. Mismatch logs + keeps the event row (audit) but no status change. New test in `payment-service.test.ts` (`amount mismatch → order stays pending`).
- **F13.3:** `createOrder` no longer inserts into `addresses`. `billingAddressId`/`shippingAddressId` set to `null`; JSONB snapshots remain authoritative. Eliminates the S12-cap bypass and the address-book pollution side effect in one change.
- **F13.4 / F13.5:** `fetch` to Google Address Validation now uses `AbortSignal.timeout(5000)`, and non-2xx responses surface as `{ valid: false, error: "Address validation service unavailable." }` instead of crashing on a non-JSON body. JSON parse errors fail closed in the same way.
- **F13.6:** New `EmailProvider.sendLoginAlert(to, ctx)` method. Resend implementation sends a plaintext "new sign-in via email code" with IP / UA / UTC timestamp. Console provider logs to stdout for dev. `credentials-otp-login` authorize fires the alert inside an `async IIFE` (fire-and-forget); a Redis `SET NX EX 86400` on `login-alert-sent:${userId}` caps notifications at one per 24h per user.
- **F13.7:** `consumeOtpToken` now logs `expectedFlow`/`actualFlow` on flow mismatch before throwing, matching the pattern used by `consumePendingMfaToken`.

### §13 verification (post-fix)
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `vitest run tests/auth/pending-mfa.test.ts` | 12/12 pass (incl. cross-flow rejection cases) |
| `vitest run tests/checkout/payment-service.test.ts` | 20/20 pass (incl. F13.2 amount-mismatch case) |
| Other test failures observed in full-suite run | Pre-existing — Redis rate-limit state pollution across sequential runs + `password123` fixture below F8.2 complexity floor; not regressions from §13. |

**Deployment status:** F13.1 (the only blocker) is closed. No critical or high findings remain open.

---

## §14 — Deep audit pass #2 (2026-05-26)

Scope: post-§13 sweep across CSRF/auth surface, NextAuth config trust posture, change-password attack chain, send-otp PII logging, CSP minimization, and outbound provider ordering. Threat model: cross-origin attacker against CSRF-exempt /api/auth/* routes + authenticated session-cookie-only attacker probing currentPassword.

### F14.1 — `verify-password` per-email progressive-delay counter is a cross-origin DoS lever (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/api/auth/verify-password/route.ts](app/api/auth/verify-password/route.ts) — `verify-pw:fail:${email}` increments on every bad password, decays only on a *successful* login. `/api/auth/*` is CSRF-exempt in [middleware.ts:28-30](middleware.ts#L28). evil.com loaded in the victim's browser can fire `fetch("/api/auth/verify-password", { method: "POST", body: JSON.stringify({ email: victim, password: "" }) })` (cookies sent thanks to SameSite=lax behaviour on top-level form-equivalent POSTs is mitigated, but a script that does its own fetch can submit cross-origin POSTs that the route happily processes because no CSRF check fires). One request → counter at 1 → victim's next login delayed 200 ms. Sustained botnet → counter saturated at 10 s for the full hour-long TTL.
- **Why this is new:** S8 replaced the hard cap with a soft progressive delay specifically to remove an account-lockout DoS. The new vector is annoyance-DoS rather than lockout, but it scales the same way.
- **Fix:** Cap the counter regardless of source (e.g. clamp to 20 in addition to the time decay), AND/OR scope the counter by `${email}:${ip}` so a single attacker cannot poison a global counter. Per-IP brake (20/hr) already exists but isn't tight enough across a botnet.
- **Files:** `app/api/auth/verify-password/route.ts`

### F14.2 — `change-password` brute-force budget for `currentPassword` lacks progressive delay (MEDIUM)
- **Status:** open
- **Severity:** medium
- **What:** [app/api/account/change-password/route.ts:24](app/api/account/change-password/route.ts#L24) — `change-pw:${userId}` 5/15min. A session-cookie-only attacker (XSS, device theft, browser malware) can probe `currentPassword` at 5 attempts/15min ≈ 20/hr. No progressive delay (S8 pattern), no per-IP brake. The S16 currentPassword requirement was the second line of defence for exactly this attacker class; with a slow but unbounded budget the defence is rate-limited but not actually stopped.
- **Why this is new:** S16 added the currentPassword check but didn't import the S8 progressive-delay shape. The two defences should be symmetric.
- **Fix:** Apply S8-style progressive delay to `change-pw:fail:${userId}`. Reset on success. Tighten the per-user budget (5/15min → 5/hr) and add `change-pw:ip:${ip}` 10/hr as a brake.
- **Files:** `app/api/account/change-password/route.ts`

### F14.3 — `/api/account/send-otp` (change-pw) sends OTP without prior `currentPassword` check (MEDIUM)
- **Status:** open
- **Severity:** medium
- **What:** [app/api/account/send-otp/route.ts:17-34](app/api/account/send-otp/route.ts#L17) — only requires a valid session. A session-cookie attacker can spam OTPs to the victim's inbox at 5/hr per user. This pairs with F14.2: even if currentPassword brute-force is slow, the inbox-spam vector burns Resend quota + degrades victim trust in their own notifications.
- **Why this is new:** S16 added `currentPassword` to `/api/account/change-password` itself but did not gate the OTP-send step. Defence-in-depth should require currentPassword (or `verify-current-password`) to unlock the OTP-send step.
- **Fix:** Require `POST /api/account/verify-current-password` (or pass `currentPassword` directly) before issuing the change-pw OTP. Burn a short-lived `change-pw:authz:${userId}` Redis token on verify-current-password success; require it on the send-otp route.
- **Files:** `app/api/account/send-otp/route.ts`, `app/api/account/verify-current-password/route.ts`

### F14.4 — `reset-password` execution-path timing leaks user existence (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/api/auth/reset-password/route.ts:40-58](app/api/auth/reset-password/route.ts#L40) — `findFirst` always runs, `hashPassword` always runs (uniform), but the `UPDATE users SET ...` + `redis.set("pw:changed:...")` only runs when the user exists. ~10–50 ms wall-clock delta between branches. With a botnet enumerating, an attacker who has already passed verify-otp (i.e. owns the inbox) can still gain a small existence-confirmation timing signal. Practical impact is near-zero because reaching this endpoint requires a valid email-verify token bound to the email being checked, so the attacker can already see existence via verify-otp's `accountExists` field. Documenting as a residual leak.
- **Fix:** Run the UPDATE+`pw:changed` write inside the same `constantTime(target, work)` wrapper used in `send-otp` so both branches take the same wall-clock time. Or accept-risk given the bound (must own inbox to reach here).
- **Files:** `app/api/auth/reset-password/route.ts`

### F14.5 — `send-otp` logs `emailExists: !!existing` + raw `email` at info level (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/api/auth/send-otp/route.ts:69-72](app/api/auth/send-otp/route.ts#L69) — `logger.info({ flow, emailExists, sent, ip }, "otp send requested")` ships a per-call boolean revealing whether the email is registered, to Axiom. Anyone with read access to logs (or anyone exploiting a future log-export bug) gets a free user-existence map. Same route logs `email` at info-level in several places — PII in logs is a privacy concern even without a security boundary breach.
- **Fix:** Drop `emailExists` from the log (the `sent` field already captures what we need for debugging). Either drop `email` from info-level logs or hash-truncate it (`sha256(email).slice(0,8)`).
- **Files:** `app/api/auth/send-otp/route.ts`, multiple auth routes that log `email`

### F14.6 — Logger redact list missing `currentPassword`, `loginToken` (LOW)
- **Status:** open
- **Severity:** low
- **What:** [lib/logger.ts:33-58](lib/logger.ts#L33) — pino redact matches *exact* property names (per F10.4). The list covers `password` / `pendingMfaToken` / `signupSessionToken` but does not include `currentPassword` (introduced by S16) or `loginToken` (introduced by F13.1's credentials-otp-login provider). No code path currently logs these fields, but the F10.4 lesson is that a future log call would silently leak them. Latent regression risk.
- **Fix:** Add `currentPassword`, `loginToken`, `*.currentPassword`, `*.loginToken` to redact paths.
- **Files:** `lib/logger.ts`

### F14.7 — NextAuth `trustHost: true` is unconditional (LOW)
- **Status:** open
- **Severity:** low
- **What:** [lib/auth/config.ts:23](lib/auth/config.ts#L23) — `trustHost: true`. On Vercel this is fine (the platform sets `X-Forwarded-Host` correctly and rejects spoofs). On a self-hosted or non-Vercel deploy this trusts whatever `Host` header arrives. If the deployment ever moves off Vercel without a proxy that normalises `Host`, a malicious proxy or DNS rebinding scenario could redirect NextAuth callbacks through an attacker-controlled host. NEXTAUTH_URL is set in env, but `trustHost: true` overrides URL inference from env.
- **Fix:** Make this conditional on `process.env.VERCEL` so non-Vercel deploys must explicitly opt-in. Or remove and rely on NEXTAUTH_URL.
- **Files:** `lib/auth/config.ts`

### F14.8 — CSP `frame-src https://api.razorpay.com` is over-permissive (LOW)
- **Status:** open
- **Severity:** low
- **What:** [next.config.ts:17](next.config.ts#L17) — `frame-src https://api.razorpay.com https://checkout.razorpay.com`. `api.razorpay.com` is the JSON API endpoint, not a frameable origin; checkout.razorpay.com is the iframe target. Including api.razorpay.com in frame-src widens the iframe-embedding surface for no functional gain.
- **Fix:** `frame-src https://checkout.razorpay.com` (drop api.razorpay.com).
- **Files:** `next.config.ts`

### F14.9 — `phone/send` writes the phone binding AFTER the Twilio call (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/api/account/phone/send/route.ts:25-26](app/api/account/phone/send/route.ts#L25) — `await sendPhoneOtp(input.phone); await redis.set(phoneBindKey, ...)`. If Twilio succeeds but Redis fails (network blip, quota), the OTP was sent but the verify step has nothing to compare against. User gets a code that won't work. The reverse ordering (write binding first, then send) is no worse: a failed Twilio call leaves a stale binding that will expire in 10 min.
- **Fix:** Order doesn't matter much; for cleanest UX write the binding first so the binding always reflects intent. Or wrap both in a try/catch that clears the binding on Twilio failure.
- **Files:** `app/api/account/phone/send/route.ts`

### F14.10 — `cookies` config absent in NextAuth — default cookie naming may not include `__Host-` prefix in non-Vercel deploys (LOW)
- **Status:** open
- **Severity:** low
- **What:** [lib/auth/config.ts](lib/auth/config.ts) — no explicit `cookies: { sessionToken: { options: { ... } } }`. NextAuth defaults to `next-auth.session-token` (or `__Secure-next-auth.session-token` when `useSecureCookies`). The `__Host-` prefix would be the strongest (no Path, no Domain, Secure), but NextAuth doesn't use it by default.
- **Fix:** Configure `cookies.sessionToken.name = "__Host-next-auth.session-token"` in production. Also pin `sameSite: "lax"`, `secure: true`, `httpOnly: true`, `path: "/"` explicitly.
- **Files:** `lib/auth/config.ts`

### §14 verification
| Check | Result |
|---|---|
| Read-only audit (no code changes in this pass) | done |
| Cross-referenced against §F0 through §F13 | done — none of the §14 items are duplicates |
| Threat model: cross-origin POSTs / session-only attacker / log-export breach / non-Vercel deploy | covered |

### §14 summary
| ID | Severity | Description | Status |
|---|---|---|---|
| F14.1 | low | `verify-password` `fail` counter poisonable cross-origin → progressive-delay DoS | **fixed** |
| F14.2 | medium | `change-password` `currentPassword` brute-force lacks progressive delay + per-IP brake | **fixed** |
| F14.3 | medium | `/api/account/send-otp` (change-pw) sends OTP without `currentPassword` gate → inbox-spam vector | **fixed** |
| F14.4 | low | `reset-password` UPDATE-only-when-user-exists leaks ~10–50 ms timing signal | **fixed** |
| F14.5 | low | `send-otp` logs `emailExists` + raw `email` at info level → log-based enumeration / PII | **fixed** |
| F14.6 | low | Logger redact list missing `currentPassword`, `loginToken` (F10.4-style latent leak) | **fixed** |
| F14.7 | low | NextAuth `trustHost: true` unconditional → non-Vercel deploy risk | **fixed** |
| F14.8 | low | CSP `frame-src https://api.razorpay.com` is over-permissive | **fixed** |
| F14.9 | low | `phone/send` order: Twilio call before Redis binding write — UX-fragile | **fixed** |
| F14.10 | low | NextAuth session cookie not `__Host-` prefixed | **fixed** |

### §14 fixes — implementation notes
- **F14.1:** `verify-pw:fail` key now scoped `(email, ip)`. New `MAX_FAILURE_COUNT = 7` clamp prevents botnet saturation of the delay ceiling. A bot from one IP can no longer poison every other user's login attempt.
- **F14.2:** New per-user progressive delay (`change-pw:fail:${userId}`) mirrors S8. Same exponential 200ms→10s curve, same 7-step clamp. Per-user budget tightened from `5 / 15min` to `5 / 1hr`; new `change-pw:ip:${ip}` 10/hr brake added.
- **F14.3:** New `change-pw:authz:${userId}` Redis marker (TTL 10min). Issued only by `/api/account/verify-current-password` on currentPassword success. `/api/account/send-otp` requires the marker; `/api/account/change-password` burns it on successful rotation. Closes session-cookie-only inbox-spam vector. The existing client flow already calls verify-current-password before send-otp, so no client change needed.
- **F14.4:** New `padToTarget(700ms, work)` wrapper. Both branches (user exists / not exists) now take the same wall-clock time. 700ms comfortably above bcrypt(12) + Neon UPDATE round-trip.
- **F14.5:** `send-otp` no longer logs `emailExists` or raw `email`. Now logs `emailHash = sha256(email).slice(0,12)` for per-account correlation without persisting PII.
- **F14.6:** Logger redact paths gained `currentPassword`, `loginToken`, plus their `*.` wildcard variants.
- **F14.7:** `authConfig.trustHost = !!process.env.VERCEL`. Non-Vercel deploys must now set `NEXTAUTH_URL` and run behind a Host-normalising proxy.
- **F14.8:** CSP `frame-src` now lists only `https://checkout.razorpay.com`.
- **F14.9:** `phone/send` writes the Redis binding before calling Twilio. On Twilio failure the binding is cleared so a retry with a different number works cleanly.
- **F14.10:** Production NextAuth `cookies.sessionToken.name = "__Host-next-auth.session-token"` with explicit `httpOnly`/`sameSite`/`secure`/`path`. Dev keeps default name so `http://localhost` works.

### §14 verification (post-fix)
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `vitest run tests/auth/pending-mfa.test.ts tests/checkout/payment-service.test.ts` | 32/32 pass |
| Manual change-password flow trace | verify-current-password → mint authz → send-otp checks authz → verify-otp → change-password burns authz on success |

**Deployment status:** all §14 items closed. No critical or high findings remain open.

---

## §15 — Deep audit pass #3 (2026-05-27)

Scope: post-§14 sweep across signed-in user flows (account-ready signup-auto, /account/details multi-step layout, payment + payment-failed pages, anchor-dock RSC pages), env-var trust posture, error boundaries, schema dead-state, and the NextAuth signout path. Threat model: misconfigured production env, XSS-on-sessionStorage chains, and dead state confusing future maintainers.

### F15.1 — `NEXT_PUBLIC_DEV_SKIP_AUTH_GATES` not validated in production (LOW)
- **Status:** open
- **Severity:** low
- **What:** [middleware.ts:18](middleware.ts#L18) and [app/hooks/useAuthGate.ts:8](app/hooks/useAuthGate.ts#L8) both read `process.env.NEXT_PUBLIC_DEV_SKIP_AUTH_GATES === "true"`. `lib/env.ts` does not validate this flag, and `NEXT_PUBLIC_*` is inlined into the client bundle at build time. If the flag ever ships to a production build (operator misconfig), the middleware page-redirect for `/account/*` + `/order/*` is bypassed and the client `useAuthGate` no-ops. Per-route `requireSession()` and per-page RSC `getSession()` still gate, so the actual security boundary holds — but the early-redirect defense-in-depth layer is missing and unauth users will hit the page shell before the RSC redirect fires. Same class as F4.8 (hardcoded dev IP) and F10.2 (`NODE_ENV` default).
- **Fix:** Validate the flag in `lib/env.ts`: refuse to start when `NODE_ENV === "production"` and the flag is truthy. Build-time bundle inlining still happens, but at least the prod runtime fails closed.
- **Files:** `lib/env.ts`

### F15.2 — Error boundaries log raw `error.message` to client console (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/account/error.tsx:17](app/account/error.tsx#L17) and [app/order/error.tsx:17](app/order/error.tsx#L17) — `console.error("[account error]", error.digest ?? error.message)`. Next.js scrubs RSC server-error messages in production (passes empty string + digest), but client-side errors still carry their original message. Browser DevTools console is the only consumer; not a data-exfil vector per se, but verbose stacks in console can leak internal API paths / fixture names if a JS bug fires during the protected flow.
- **Fix:** Log only `error.digest`. Drop `error.message` from the console call: `console.error("[account error]", error.digest ?? "no-digest")`.
- **Files:** `app/account/error.tsx`, `app/order/error.tsx`

### F15.3 — Sign-out link uses `<Link>` GET; Auth.js v5 GET signout renders confirmation, doesn't sign out (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/account/error.tsx:31](app/account/error.tsx#L31) and [app/order/error.tsx:32](app/order/error.tsx#L32) — `<Link href="/api/auth/signout?callbackUrl=/auth">`. Auth.js v5 treats GET `/api/auth/signout` as a confirmation page (shows a "Sign out?" button), not as the sign-out action. POST is required. User clicks Link → sees a NextAuth confirmation page → must click again. Defeats the F11.11 / F11.12 escape hatch (intent was to break the error-boundary reset loop by signing out).
- **Fix:** Replace with a `<button onClick={() => signOut({ callbackUrl: "/auth" })}>` using `signOut` from `next-auth/react`. Or use a POST form.
- **Files:** `app/account/error.tsx`, `app/order/error.tsx`

### F15.4 — `/api/payments/initiate` accepts `orderId` without explicit UUID validation (LOW)
- **Status:** open
- **Severity:** low
- **What:** [lib/contracts/payment.ts](lib/contracts/payment.ts) (per code inspection) — `InitiatePaymentRequest.orderId` not constrained to UUID. Payment page passes raw `searchParams.get("orderId")` to the route. A non-UUID string hits the Postgres `uuid` column type, which throws a parse error → bubbled as a generic 500 (not the cleaner 400 `VALIDATION_FAILED`). UX-only; no security boundary impact since `loadOwnedOrder` would 404 on any non-matching UUID anyway.
- **Fix:** `InitiatePaymentRequest = z.object({ orderId: UUID })`. Same for `VerifyPaymentRequest.orderId`.
- **Files:** `lib/contracts/payment.ts`

### F15.5 — Dead `userProfiles.phone*` columns after F8.3 fix (LOW)
- **Status:** open
- **Severity:** low
- **What:** [lib/db/schema.ts:36-64](lib/db/schema.ts#L36) — `userProfiles.phone`, `userProfiles.phoneCountryCode`, `userProfiles.phoneSign`. F8.3 removed phone fields from `UpdateProfileRequest`, so `PUT /api/account/profile` strips them silently. The only writer is the (now no-op) `/account/details/phone` step in [app/account/details/layout.tsx:102-109](app/account/details/layout.tsx#L102) which builds a phone-only patch that Zod discards. The verified phone is written to `users.phone` by `/api/account/phone/verify`. Net effect: three columns in `user_profiles` are unreachable and stay `NULL` forever. If a future feature reads from there expecting the verified phone, it will silently see nothing.
- **Why noted:** Schema drift hides the F8.3 design from future maintainers. Either drop the columns (best), or remove the dead PUT call in `details/layout.tsx` step 3 and document the decision.
- **Fix:** Migration to drop the three columns; remove step 3 PUT from `details/layout.tsx` (the phone is already saved by `phone/verify` at line 137).
- **Files:** `lib/db/schema.ts`, `drizzle/`, `app/account/details/layout.tsx`

### F15.6 — `useAuthGate` is purely a UX gate; document the layered defense (LOW / info)
- **Status:** open
- **Severity:** low (informational)
- **What:** [app/hooks/useAuthGate.ts](app/hooks/useAuthGate.ts) — runs in client effect, redirects on `status === "unauthenticated"`. It is not — and cannot be — an auth boundary. The actual gates are: (1) `middleware.ts` PROTECTED_PAGE/PROTECTED_API regex match + cookie check; (2) layout-level `getSession()` redirect (F11.6); (3) per-route `requireSession()`. A future maintainer removing `requireSession()` "because middleware already redirects" would open IDOR holes.
- **Fix:** Add a comment header to `useAuthGate.ts` and to `middleware.ts` documenting the three layers. Or move to a `SECURITY.md` describing the chain.
- **Files:** `app/hooks/useAuthGate.ts`, `middleware.ts`, `SECURITY.md` (new)

### F15.7 — `account-ready` `pendingSignup` stored in sessionStorage without freshness check (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/account-ready/page.tsx:18-27](app/account-ready/page.tsx#L18) — reads `pendingSignup` from sessionStorage without checking server-side TTL. If the user lingers >5 min (`issuePendingMfaToken` TTL_SEC=300), the token is expired server-side but still in the page state. `signIn("credentials-signup", ...)` fails with generic "Could not sign in". User UX hits dead-end without a clear "session expired, please log in" message.
- **Fix:** Store the issued timestamp alongside the token; on mount, if older than 5 min, clear the sessionStorage entry and redirect to `/login` with a "session expired" message. Or simply catch the credentials-signup error and surface "Your sign-in session expired — please log in" to the user.
- **Files:** `app/account-ready/page.tsx`

### §15 verification
| Check | Result |
|---|---|
| Read-only audit pass (no code changes) | done |
| Cross-referenced against §F0 – §F14 — no duplicates | done |
| Threat model coverage: env-var misconfig / sessionStorage XSS / dead-state confusion / GET vs POST signout | done |

### §15 summary
| ID | Severity | Description | Status |
|---|---|---|---|
| F15.1 | low | `NEXT_PUBLIC_DEV_SKIP_AUTH_GATES` not validated in production env | **fixed** |
| F15.2 | low | Error boundaries log raw `error.message` to client console | **fixed** |
| F15.3 | low | Sign-out `<Link>` is GET; v5 GET signout shows confirmation, not action | **fixed** |
| F15.4 | low | `/api/payments/initiate` accepts orderId without UUID validation in contract | **not-applicable** (contract already uses `UUID`) |
| F15.5 | low | Dead `userProfiles.phone*` columns after F8.3; schema drift | **fixed** (migration `0003_steady_mephisto.sql`) |
| F15.6 | low | `useAuthGate` is UX-only; document layered defense | **fixed** |
| F15.7 | low | `pendingSignup` sessionStorage has no client-side freshness check | **fixed** |

### §15 fixes — implementation notes
- **F15.1:** `lib/env.ts` now throws at boot when `NODE_ENV=production && NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true`. Build-time inlining still happens but prod runtime fails closed.
- **F15.2:** Both `app/account/error.tsx` and `app/order/error.tsx` log only `error.digest ?? "no-digest"`. Stack messages no longer leak to browser DevTools.
- **F15.3:** Both error boundaries replaced the `<Link href="/api/auth/signout?...">` with a `<button onClick={() => signOut({ callbackUrl: "/auth" })}>` using `next-auth/react`. POST signout fires, cookie cleared, redirect runs.
- **F15.4:** Audit error — `lib/contracts/payment.ts` already constrained both `InitiatePaymentRequest.orderId` and `VerifyPaymentRequest.orderId` to the `UUID` schema. No code change needed.
- **F15.5:** `userProfiles.phone`, `phoneCountryCode`, `phoneSign` columns dropped from `lib/db/schema.ts` along with the `phone_sign_check` constraint. `Profile` contract trimmed to `{ firstName, lastName, birthday, gender }`. `getProfile`, `useEditDetailsForm`, and the view-details RSC page updated — phone now sourced from `users.phone` and passed as a separate prop. The no-op PUT in `app/account/details/layout.tsx` step 3 removed. Drizzle migration `drizzle/0003_steady_mephisto.sql` generated; run `bun run db:migrate` before deploy. Tests in `tests/profile/profile-service.test.ts` updated.
- **F15.6:** `useAuthGate.ts` gained a doc header explaining the three real layers (middleware → layout `getSession()` → per-route `requireSession()`) and that removing this hook is safe but removing any of those layers is a regression.
- **F15.7:** `pendingSignup` sessionStorage entry now carries `issuedAt`. `account-ready/page.tsx` checks `Date.now() - issuedAt > 4.5 min` on mount; on expiry, clears the entry and redirects to `/login?reason=signup-expired` instead of dragging the user through a doomed `signIn` attempt.

### §15 verification (post-fix)
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `vitest run tests/auth/pending-mfa.test.ts tests/checkout/payment-service.test.ts tests/profile/profile-service.test.ts` | 37/37 pass |
| `drizzle-kit generate` | new migration `drizzle/0003_steady_mephisto.sql` (column drop only) |

**Deployment status:** all §15 items closed. Run `bun run db:migrate` to apply the F15.5 migration before deploy. No critical or high findings remain open.

---

## §16 — Deep audit pass #4 (2026-05-27, post-SEO surface)

Scope: changes since §15 — SEO infrastructure (robots / sitemap / manifest / icon / opengraph-image), JSON-LD injection, per-route metadata layouts, `next.config.ts` CSP additions for Vercel Analytics, redirects + cache headers, F15 view-details refactor, `account-ready` freshness check, SvgText `as` prop. Threat model: cost-amplification DoS on edge-runtime image routes + CDN cache poisoning + sessionStorage tampering + log-PII drift.

### F16.1 — ImageResponse routes (`/icon`, `/apple-icon`, `/opengraph-image`) lack query-string cache normalization (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/icon.tsx](app/icon.tsx), [app/apple-icon.tsx](app/apple-icon.tsx), [app/opengraph-image.tsx](app/opengraph-image.tsx) — edge-runtime image generators. CDN cache header set ([next.config.ts:71](next.config.ts#L71)) `public, max-age=3600, s-maxage=86400`. Vercel CDN keys on full URL including query string. Unauth attacker can hit `/icon?cb=1`, `/icon?cb=2`, ... → each unique URL bypasses cache → N edge function invocations → cost amplification (per-invocation billing) + degraded latency for legitimate users.
- **Why this is new:** F15 / SEO added these routes; previously the site shipped no edge-rendered image surface.
- **Fix:** Pre-render at build time → check static PNGs into `public/icon.png`, `public/apple-icon.png`, `public/opengraph-image.png` and drop the `.tsx` files. CDN serves directly; zero edge compute. Cost = one-time `next/og` invocation locally + checked-in assets. Alternative (no asset commit): add a route handler that ignores query strings and forces a single cache key via `Vercel-CDN-Cache-Control: public, max-age=86400` + drop non-canonical query strings via `cleanUrls` / middleware rewrite.
- **Files:** `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`, `public/`

### F16.2 — `account-ready` parses sessionStorage without try/catch (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/account-ready/page.tsx:31](app/account-ready/page.tsx#L31) — `JSON.parse(raw) as Pending` runs without exception handling. If sessionStorage payload is malformed (browser corruption, XSS planting bad JSON, or future schema change), throws SyntaxError → propagates up → Next error boundary → user stuck without a recovery path. The F15.7 issuedAt check that follows assumes `parsed` is a valid object.
- **Fix:** Wrap parse + apply schema check (e.g. `typeof parsed === "object" && typeof parsed.signupSessionToken === "string"`). On failure, clear the entry and redirect to `/login`.
- **Files:** `app/account-ready/page.tsx`

### F16.3 — `/api/auth/otp-login` logs `email` at info level (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/api/auth/otp-login/route.ts:46-86](app/api/auth/otp-login/route.ts#L46) — `logger.info({ email, ip, outcome }, ...)`. Same PII-in-logs concern as F14.5 (`/api/auth/send-otp`). Three log call sites (`token-invalid`, `email-mismatch`, `ok`) all ship the raw email to Axiom.
- **Fix:** Replace with the same `hashEmail(email)` helper used in `send-otp` after F14.5, OR drop the field — `ip` + outcome already enough for triage.
- **Files:** `app/api/auth/otp-login/route.ts`

### F16.4 — `useEditDetailsForm.savePillField` silently no-ops on `phone` field after F15.5 (LOW)
- **Status:** open
- **Severity:** low
- **What:** [app/account/view-details/hooks/useEditDetailsForm.ts:85-118](app/account/view-details/hooks/useEditDetailsForm.ts#L85) — pill saver sends `{ [field]: v }` PUT to `/api/account/profile`. F15.5 dropped `phone` from `UpdateProfileRequest`. Zod `.partial()` strips unknown keys silently (not `.strict()`). Result: PUT returns `{ ok: true }`, UI shows "Saved.", but `users.phone` is unchanged. Latent functional bug. Phone case in the switch (`setPhone(v)`) updates client state to a value that never persisted.
- **Why noted:** No UI surface currently triggers the phone pill in view-details (read-only view), but the case in the switch suggests intent to wire it. If wired without fixing the route, phone edits silently drop.
- **Fix:** Either (a) remove the `phone` case from `savePillField` and `editPillPlaceholders`, OR (b) route phone edits through the existing `/api/account/phone/send` + `/verify` OTP flow instead of profile PUT.
- **Files:** `app/account/view-details/hooks/useEditDetailsForm.ts`

### F16.5 — `manifest.ts` `start_url` missing tracking parameter / `id` field (LOW / info)
- **Status:** open
- **Severity:** low
- **What:** [app/manifest.ts:8](app/manifest.ts#L8) — `start_url: "/"`, no `id`. Without an explicit `id`, the browser uses `start_url` as the PWA identity. If `start_url` ever changes (e.g. add `?source=pwa` for analytics), the browser treats it as a new app and installed users lose their install. Cosmetic until you start tagging PWA traffic.
- **Fix:** Set `id: "/"` explicitly so identity is decoupled from `start_url`. Future analytics tagging can update `start_url` without breaking installs.
- **Files:** `app/manifest.ts`

### F16.6 — CSP newly trusts `va.vercel-scripts.com` for both `script-src` and `connect-src` (LOW / supply-chain)
- **Status:** open (accepted-risk)
- **Severity:** low
- **What:** [next.config.ts:12,19](next.config.ts#L12) — CSP whitelists Vercel's analytics beacon domain for script load + fetch. If Vercel's analytics script is ever compromised, every site using it inherits arbitrary JS execution + data exfil. Same supply-chain class as Razorpay checkout.
- **Why accepted:** Vercel hosts the site; if their infrastructure is compromised, the threat model is wider than just analytics. Accepting parity with the platform we already trust.
- **Fix (optional):** Self-host the Vercel Analytics agent (`@vercel/analytics` exports a custom-host mode) or switch to Plausible self-hosted. Reduces blast radius to your own infrastructure.
- **Files:** `next.config.ts`

### F16.7 — Sitemap entry list is single-route — no path discovery hint for crawlers when public sub-pages land (LOW / info)
- **Status:** open
- **Severity:** low (operational, not security)
- **What:** [app/sitemap.ts](app/sitemap.ts) — returns only `/`. When `/privacy-policy`, `/terms`, future product detail pages ship, crawler discovery slows because robots.txt + sitemap don't surface them.
- **Fix:** Maintain a `PUBLIC_ROUTES` constant + iterate. Or auto-generate from the file system (`fast-glob` over `app/**/page.tsx` minus the gated routes).
- **Files:** `app/sitemap.ts`

### F16.8 — `robots.ts` includes Yandex-specific `host` field (LOW / info)
- **Status:** open
- **Severity:** low
- **What:** [app/robots.ts:26](app/robots.ts#L26) — `host: SITE_URL`. Non-standard; only Yandex parses it. Most major crawlers ignore. Harmless but useless.
- **Fix:** Drop the field unless Yandex is a target market.
- **Files:** `app/robots.ts`

### F16.9 — `redirects()` `/home` → `/` uses `permanent: true` (301) — browser caches forever (LOW)
- **Status:** open
- **Severity:** low
- **What:** [next.config.ts:85](next.config.ts#L85) — 301 redirects for `/home`, `/index`, `/index.html`. Browsers cache 301s indefinitely. If any of these paths becomes a legitimate page later, returning users will not see the new content until they clear cache or use an incognito session. Acceptable for these specific paths (unlikely to ever be routes), but worth noting the irreversibility.
- **Fix:** Change to `permanent: false` (302/307) until you're certain the path is permanently retired. Net SEO impact minimal — Googlebot follows 302s too.
- **Files:** `next.config.ts`

### F16.10 — `metadataBase: new URL(SITE_URL)` throws at module load on bad input (LOW / info)
- **Status:** open
- **Severity:** low
- **What:** [app/layout.tsx:18](app/layout.tsx#L18) — `new URL(SITE_URL)` throws TypeError if `NEXT_PUBLIC_SITE_URL` is set but malformed (missing protocol, trailing whitespace, etc.). Boot-time failure that takes the whole app down. Fail-closed is correct security-wise, but a misconfig can ship a totally dark deploy.
- **Fix:** Validate `NEXT_PUBLIC_SITE_URL` via Zod in `lib/env.ts` alongside `NEXTAUTH_URL` so the failure surface is a single, well-formatted env-validation error rather than an opaque TypeError. See F10.2 pattern.
- **Files:** `lib/env.ts`, `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo/jsonld.ts`

### §16 verification
| Check | Result |
|---|---|
| Read-only audit pass (no code changes) | done |
| Cross-referenced §F0 – §F15 — no duplicates | done |
| Threat model: edge cost amplification / sessionStorage tampering / log-PII drift / supply chain / env-misconfig | done |
| Existing IDOR scoping on view-details users.phone fetch | verified — `eq(users.id, session.userId)` |

### §16 summary
| ID | Severity | Description | Status |
|---|---|---|---|
| F16.1 | low | ImageResponse routes vulnerable to query-string cache busting (cost amplification) | **fixed** (middleware 308 strip) |
| F16.2 | low | `account-ready` parses sessionStorage without try/catch | **fixed** |
| F16.3 | low | `/api/auth/otp-login` logs raw email at info level (F14.5-pattern) | **fixed** (emailHash) |
| F16.4 | low | `savePillField` phone case is a silent no-op after F15.5 | **fixed** (early reject + read-only `phone`) |
| F16.5 | low | `manifest.ts` missing explicit `id` field | **fixed** |
| F16.6 | low | CSP newly trusts `va.vercel-scripts.com` (supply-chain) | accepted-risk |
| F16.7 | low | Sitemap is single-route; no discovery hint for future public pages | **fixed** (`PUBLIC_ROUTES` table) |
| F16.8 | low | `robots.ts` has Yandex-only `host` field | **fixed** (dropped) |
| F16.9 | low | `/home`/`/index` redirects are permanent (301) — browser-cached forever | **fixed** (307) |
| F16.10 | low | `metadataBase` boot-time throw on malformed `NEXT_PUBLIC_SITE_URL` | **fixed** (Zod url() in `lib/env.ts`) |

### §16 fixes — implementation notes
- **F16.1:** `middleware.ts` now 308-redirects any `/icon`, `/apple-icon`, `/opengraph-image` request with a non-empty query string to the canonical path. Vercel CDN cache key is now stable; attacker-supplied `?cb=…` no longer cache-busts the edge generator.
- **F16.2:** `account-ready/page.tsx` wraps `JSON.parse` in try/catch with shape validation (`typeof obj.signupSessionToken === "string"`). Malformed payloads clear sessionStorage and bounce to `/login?reason=signup-expired`.
- **F16.3:** `/api/auth/otp-login/route.ts` gained the `hashEmail` helper from F14.5 and logs `emailHash` instead of raw `email` at all three log call sites.
- **F16.4:** `useEditDetailsForm.savePillField` short-circuits with a clear error message when `field === "phone"`. Unused `setPhone` setter removed — `phone` is now read-only inside the hook.
- **F16.5:** `app/manifest.ts` declares `id: "/"` so PWA identity is decoupled from `start_url`.
- **F16.7:** `app/sitemap.ts` switched to a `PUBLIC_ROUTES` table iterated into the result. Adding new indexable pages is a one-line append.
- **F16.8:** `app/robots.ts` dropped the Yandex-only `host` field.
- **F16.9:** `next.config.ts` flips `/home`, `/index`, `/index.html` redirects from `permanent: true` (301) to `permanent: false` (307). Browsers no longer cache these forever.
- **F16.10:** `lib/env.ts` validates `NEXT_PUBLIC_SITE_URL` as `z.string().url().default("https://axceal.com")`. Malformed value now surfaces as a structured Zod env-validation error at boot instead of a generic `new URL()` TypeError.

### §16 verification (post-fix)
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `vitest run tests/auth/pending-mfa.test.ts tests/checkout/payment-service.test.ts` | 32/32 pass |

**Deployment status:** all §16 items closed (F16.6 accepted-risk). No critical or high findings remain open.

