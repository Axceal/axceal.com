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

**Rollup:** 0 critical, 0 high, 3 medium, 8 low, 1 very-low. None block deployment per SECURITY_PLAN §6 (no high/critical). Recommended pre-launch: F11.1 (cheap fix, real user-visible bug), F11.6 (defense-in-depth, single layout file per route), F11.7 (UX trust). F11.3 + F11.10 are easy wins post-launch.
