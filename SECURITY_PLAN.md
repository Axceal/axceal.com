# Security Audit Plan — Axceal Website

**Objective.** Before Phase 9 (Deployment), systematically audit the full stack — Next.js 16 App Router frontend + route-handler backend + deployment surface — for security vulnerabilities. Execution order is strict: automated pass → static review → dynamic/attack simulation → sign-off.

**Sequencing.** This plan executes *after* the pending frontend changes land. It is a checklist, not a one-shot script; each item produces either a "pass" note or a remediation entry in `BACKEND_DEVIATIONS.md`.

---

## 0. Ground rules

- **Zero-trust mindset.** Assume every request is hostile, every client bundle is inspected, every cookie can be stolen on a shared device.
- **Defense-in-depth.** A failure at one layer (e.g., client validation) must not be exploitable because another layer (server validation, CSP, rate limit) holds.
- **Evidence, not belief.** Every "pass" item needs either a grep/test result, a trace, or a reviewed code diff. "It looked fine" is not a pass.
- **Log findings, not secrets.** When citing offending code, reference file:line — never paste token material into the log file.

---

## 1. Automated tooling pass

Run first — fast, non-destructive, catches the obvious before human review.

| Tool | Command | What it catches |
|---|---|---|
| Dependency audit | `bun audit` (and cross-check with `npm audit --production`) | Known CVEs in transitive deps |
| Lint (security rules) | `bun run lint` | Next.js eslint rules (already config'd via `eslint-config-next`) |
| TypeScript strict | `bunx tsc --noEmit` | Type confusion bugs that can mask auth issues |
| Vitest suite | `bun run test` | Regression guard for auth/payment/otp |
| Production build | `bun run build` | CSP / middleware / bundle compile errors |
| Semgrep (optional) | `semgrep --config=p/owasp-top-ten --config=p/nextjs .` | OWASP + Next.js specific anti-patterns |
| Bundle secret scan | `grep -rE "sk_live|rzp_live|(AKIA|SG\.)" .next/` after build | Accidental server secret in client bundle |

**Pass criteria.** Zero `high`/`critical` CVEs outstanding; lint/tsc/tests/build clean; no server secret literal in `.next/static/**`.

---

## 2. Frontend audit

Reference surface: [app/](app/), [middleware.ts](middleware.ts), [next.config.ts](next.config.ts).

### 2.1 Cross-site scripting (XSS)

- [ ] `grep -rn "dangerouslySetInnerHTML" app/ components/` → every hit justified and sanitized (DOMPurify or fixed-string only).
- [ ] No `eval`, `new Function`, `document.write`, `innerHTML =`, or `window[...]` dynamic lookups with user input.
- [ ] All URL rendering passes through `new URL()` validation (no raw `href={userValue}` that could be `javascript:`).
- [ ] Third-party script surface: only Razorpay Checkout (`https://checkout.razorpay.com/v1/checkout.js`) — audit that it's loaded with SRI where possible, or at minimum from the exact CSP-allowed origin in [next.config.ts](next.config.ts).

### 2.2 Content Security Policy

- [ ] Re-read [next.config.ts](next.config.ts) CSP and justify each permissive directive:
  - `script-src 'unsafe-inline' 'unsafe-eval'` → required by Next.js inline bootstrap + Razorpay. Document in `BACKEND_DEVIATIONS.md`; consider strict-dynamic + nonce migration as a follow-up (not a release blocker).
  - `style-src 'unsafe-inline'` → required by Tailwind v4 / styled-jsx. Document.
  - `img-src` / `connect-src` / `frame-src` → only Razorpay domains. Confirm no other origins leak in.
- [ ] HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy → verify headers on `/` and on an API route via `curl -sI` against a prod build.

### 2.3 Authentication & session UX

- [ ] Login / register / OTP pages: no account-enumeration via differing error messages or response timings (compare "email not registered" vs "wrong password" strings character-for-character).
- [ ] Forgot-password / OTP flows do not reveal whether the target email exists.
- [ ] Session cookies: `httpOnly`, `secure` (in prod), `sameSite=lax` (NextAuth default) — confirm with browser devtools.
- [ ] Logout clears NextAuth session cookie **and** CSRF cookie is regenerated on next request.
- [ ] No session tokens or raw user email in `localStorage` / `sessionStorage` / URL query strings.

### 2.4 CSRF

- [ ] [middleware.ts:57-63](middleware.ts#L57-L63) enforces double-submit on every mutating `/api/*` request except the two documented exemptions (`/api/auth/*` — NextAuth handles its own, `/api/payments/webhook` — HMAC-verified).
- [ ] `timingSafeEqual` in [lib/http/csrf.ts](lib/http/csrf.ts) is actually constant-time (not a naive `===`).
- [ ] All client-side `fetch` calls to mutating routes attach the CSRF header. Grep: `grep -rn "fetch(" app/ components/ | grep -vE "method:\s*['\"]GET"` — each hit must go through the shared HTTP client in [lib/http/client.ts](lib/http/client.ts) (which should inject the header), or attach it manually.
- [ ] CSRF cookie is `httpOnly: false` on purpose (JS must read it) — confirm and document. SameSite=lax blocks cross-site use; secure=true in prod.

### 2.5 Open redirect & URL handling

- [ ] Login `callbackUrl` param ([middleware.ts:87](middleware.ts#L87)): NextAuth validates against `NEXTAUTH_URL`; verify by crafting `/login?callbackUrl=https://evil.com` and confirming the post-login redirect stays same-origin.
- [ ] Any `router.push(userControlledValue)` / `<Link href={userValue}>` — grep and confirm none exist, or that values are whitelisted.

### 2.6 Client-side secrets & PII

- [ ] `grep -rn "NEXT_PUBLIC_" app/ components/ lib/` → every public env var reviewed. None may be a secret. Currently expected: `NEXT_PUBLIC_RAZORPAY_KEY_ID` only (public by design).
- [ ] No service tokens, admin flags, or internal URLs baked into the client bundle. Post-build inspection: `grep -rE "(RESEND|AXIOM|UPSTASH|NEXTAUTH_SECRET|RAZORPAY_KEY_SECRET)" .next/static/`.
- [ ] Forms (login, register, profile, address, payment): confirm passwords and OTPs are never persisted to any storage, logged, or sent in query strings.

### 2.7 UI-level authorization

- [ ] Protected pages: hitting `/account`, `/account/details/*`, `/order/*` while logged out redirects to `/login?callbackUrl=...` (already enforced by [middleware.ts:13](middleware.ts#L13)). Confirm via manual test.
- [ ] Account pages never assume the client-side session is trustworthy for data access — every fetch still round-trips to a server-side check.
- [ ] No "admin mode" visible/toggleable purely client-side.

### 2.8 Clickjacking & iframe embedding

- [ ] `X-Frame-Options: DENY` + `frame-ancestors 'none'` in CSP (confirmed in [next.config.ts](next.config.ts)). Verify Razorpay checkout iframe is embedded by *us* (outbound), not the other way.

---

## 3. Backend audit

Reference surface: [app/api/**/route.ts](app/api/), [lib/http/](lib/http/), [lib/auth/](lib/auth/), [lib/services/](lib/services/), [lib/razorpay/](lib/razorpay/), [lib/db/](lib/db/).

### 3.1 Authentication correctness

- [ ] Password hashing uses `bcryptjs` with cost ≥ 12 — verify [lib/auth/password.ts](lib/auth/password.ts).
- [ ] Password comparison uses bcrypt's constant-time compare (not raw `===`).
- [ ] OTP ([lib/auth/otp.ts](lib/auth/otp.ts)): cryptographically random (`crypto.randomInt` or similar, not `Math.random`); ≥ 6 digits; constant-time compare; single-use (invalidated on success); expiry ≤ 10 min; attempt limit (≤ 5) before lockout.
- [ ] NextAuth session JWT uses `NEXTAUTH_SECRET` ≥ 32 bytes (env validation enforces; [lib/env.ts:7](lib/env.ts#L7)). Confirm rotation plan for Phase 9.
- [ ] Credentials provider ([lib/auth/credentials.ts](lib/auth/credentials.ts)) returns uniform generic error on bad email OR bad password (no enumeration).

### 3.2 Authorization & IDOR

This is the single highest-risk category for this app. Every route that accepts a resource ID must verify ownership.

For each of these handlers, confirm the handler checks `resource.userId === session.userId` **before** reading or mutating:

- [ ] [app/api/account/profile/route.ts](app/api/account/profile/route.ts)
- [ ] [app/api/account/me/route.ts](app/api/account/me/route.ts)
- [ ] [app/api/addresses/route.ts](app/api/addresses/route.ts)
- [ ] [app/api/addresses/[id]/route.ts](app/api/addresses/[id]/route.ts) — **IDOR hotspot**: GET/PATCH/DELETE by id
- [ ] [app/api/orders/route.ts](app/api/orders/route.ts)
- [ ] [app/api/orders/[id]/route.ts](app/api/orders/[id]/route.ts) — **IDOR hotspot**
- [ ] [app/api/payments/initiate/route.ts](app/api/payments/initiate/route.ts) — confirm orderId belongs to caller
- [ ] [app/api/payments/verify/route.ts](app/api/payments/verify/route.ts) — confirm same

**Attack test.** Create two users A and B. Log in as A, capture a resource ID; log in as B and attempt GET/PATCH/DELETE on that ID. Expect 403/404 (never 200).

### 3.3 Input validation

- [ ] Every route handler wraps its body in `withHandler` ([lib/http/handler.ts](lib/http/handler.ts)) with a `config.input` Zod schema. Grep: `grep -rLn "withHandler" app/api/*/route.ts app/api/**/route.ts` — any route without it must justify.
- [ ] Zod contracts in [lib/contracts/](lib/contracts/) set explicit `.min/.max` bounds on strings, reject unknown keys with `.strict()` where appropriate, and constrain enums for status/role fields.
- [ ] Body size cap at [lib/http/handler.ts:7](lib/http/handler.ts#L7) (64 KB) — adequate for JSON payloads. Confirm no upload routes exist; if added later, use a stream-based cap.
- [ ] Query/path params are validated separately (not assumed safe because they're in the URL).

### 3.4 SQL injection

- [ ] All DB access goes through Drizzle ORM ([lib/db/](lib/db/)). Grep for any raw SQL string concatenation: `grep -rn "sql\`" lib/ app/` — each use of the `sql` template tag must only interpolate via `${}` (which Drizzle parameterizes), never via string concat.
- [ ] `sql.raw()` is **not** used with any user-supplied value. Grep: `grep -rn "sql.raw" lib/ app/`.
- [ ] Table / column names are never dynamic from user input.

### 3.5 Rate limiting

- [ ] [lib/http/rate-limit.ts](lib/http/rate-limit.ts) is applied to every sensitive route: login / register / send-otp / verify-otp / payments/initiate / payments/verify. Grep each route file for `rateLimit(`.
- [ ] Rate-limit keys are scoped by both IP **and** identifier (e.g., email) so one attacker can't exhaust a victim's budget.
- [ ] Dev bypass at [lib/http/rate-limit.ts:11](lib/http/rate-limit.ts#L11) — confirm `NODE_ENV` guard works and doesn't leak to test builds. Add an explicit test that rate limiter trips on the 11th call in a windowed test env.
- [ ] Upstash Redis connection uses REST API over HTTPS (confirmed via `@upstash/redis`); credentials are server-only env.

### 3.6 Payments (Razorpay)

This is the second-highest-risk category.

- [ ] [lib/razorpay/verify.ts:3-10](lib/razorpay/verify.ts#L3-L10) uses `crypto.timingSafeEqual` on equal-length buffers — confirm.
- [ ] Order creation ([app/api/payments/initiate/route.ts](app/api/payments/initiate/route.ts)): server computes the amount from the order (DB) — **never** trusts a client-supplied amount.
- [ ] Payment verification ([app/api/payments/verify/route.ts](app/api/payments/verify/route.ts)): verifies `razorpay_signature` **before** marking the order paid. Transition is idempotent (re-submission does not double-credit).
- [ ] Webhook ([app/api/payments/webhook/route.ts](app/api/payments/webhook/route.ts)):
  - Reads raw body (not parsed JSON) for HMAC input.
  - Verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET` before any side-effect.
  - Idempotent by `razorpay_payment_id` (duplicate delivery is a no-op).
  - Returns 200 only after successful processing; 4xx on signature mismatch.
  - CSRF-exempt (confirmed in [middleware.ts:22-25](middleware.ts#L22-L25)) — document the exemption reason.
- [ ] Client never sees `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET`. Public: `RAZORPAY_KEY_ID` only.

### 3.7 Email (Resend)

- [ ] [lib/email/resend.ts](lib/email/resend.ts): `to`, `subject`, body constructed from server-side trusted values; no user-controlled header injection. (Resend SDK accepts fields as params — no raw SMTP concatenation — confirm.)
- [ ] OTP emails don't leak the OTP into any log. Confirm pino redact paths in [lib/logger.ts:34](lib/logger.ts#L34) include `otp`, `code`.
- [ ] Email rate-limiting (per address) exists to prevent spam/abuse.

### 3.8 Logging & observability

- [ ] [lib/logger.ts:32-50](lib/logger.ts#L32-L50) redact list covers: password, passwordHash, otp, code, razorpaySignature, razorpayKeySecret, authorization, cookie, token, otpToken + wildcard variants. Add: `email` under a separate "pii" scheme? Decide: email may be legitimately logged for auth events — document policy (log email for auth events only, never for browsing).
- [ ] No `console.log` in server code (grep). All logs go through pino.
- [ ] Error responses never leak stack traces. [lib/http/handler.ts:96](lib/http/handler.ts#L96) logs internally, returns `Internal server error` generic.
- [ ] Axiom ingest token ([env.ts:17](lib/env.ts#L17)) validated as optional; app must boot without it (already confirmed).

### 3.9 Secrets & environment

- [ ] `.env.local` is in `.gitignore` (verify `git check-ignore -v .env.local`).
- [ ] No committed `.env*` files beyond `.env.example` (if any). Grep git history: `git log -p -S "NEXTAUTH_SECRET"` to spot historical leaks; rotate anything found.
- [ ] `trustedDependencies` in [package.json:61-64](package.json#L61-L64) is minimal (`sharp`, `unrs-resolver`, `esbuild`) — each justified.
- [ ] All secrets rotate before Phase 9 per `BACKEND_PLAN.md §11.2`: NEXTAUTH_SECRET, RESEND_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, UPSTASH tokens, AXIOM_TOKEN, DATABASE_URL password.

### 3.10 Database

- [ ] Neon connection string uses TLS (`sslmode=require`) — Neon enforces by default, confirm in `DATABASE_URL`.
- [ ] Migrations ([drizzle/](drizzle/)) reviewed: no dropped-then-recreated tables with lost data, no wide-open grants, no default-nullable on sensitive columns (e.g., `userId` on addresses/orders must be NOT NULL).
- [ ] Indexes on `(userId, ...)` for all user-scoped tables so IDOR checks don't cause full scans under load.
- [ ] No shared-account pattern (every row tied to a specific user).

### 3.11 Session & cookie hardening

- [ ] NextAuth session: JWT strategy (no DB session lookup per request — confirm in [lib/auth/config.ts](lib/auth/config.ts)).
- [ ] Session max-age configured (e.g., 30 days) + idle timeout acceptable.
- [ ] Logout endpoint invalidates the session on the NextAuth side.
- [ ] Cookies set with `secure: true` in prod, `sameSite: lax`, `httpOnly: true` for session.

### 3.12 SSRF / outbound calls

- [ ] Grep for outbound HTTP calls (`fetch(` in `lib/`, `node-fetch`, `axios`) — each target is a fixed/known host (Resend API, Razorpay API, Upstash REST, Axiom). No user-provided URLs reach `fetch`.

### 3.13 Upload / file handling

- [ ] Confirmed: no upload routes exist currently. If added before deploy, require content-type whitelist, size cap, virus scan, and storage outside web root.

### 3.14 DoS / resource exhaustion

- [ ] Body cap (64 KB) on JSON routes.
- [ ] Rate-limited sensitive endpoints.
- [ ] No unbounded queries (pagination on `/api/orders`, `/api/addresses` list endpoints).
- [ ] Razorpay webhook processing is fast (no N+1 DB work inside signature-verified section).

---

## 4. Infrastructure & deployment security

Executes alongside Phase 9.

- [ ] Vercel env vars: all secrets set with "Production" scope only where appropriate; preview deployments use separate (non-prod) Upstash/Razorpay/Resend sandboxes.
- [ ] Vercel project: Production Branch Protection enabled; only `main` deploys to prod.
- [ ] `NEXTAUTH_URL` in prod matches the canonical domain; no wildcard.
- [ ] Custom domain uses HTTPS only; HTTP → HTTPS redirect; HSTS preload submission (post-launch).
- [ ] Neon: IP allow-list if available; separate roles for app vs migrations; read-only role not used (app needs write — acceptable).
- [ ] Upstash: per-environment database; separate tokens per env.
- [ ] Razorpay: live keys only after manual KYC review; webhook secret rotated between test and live.
- [ ] Axiom: ingest token has write-only scope (no admin).
- [ ] GitHub repo: Dependabot + CodeQL enabled; secret scanning on.
- [ ] CI: `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build` gate merges to `main`.

---

## 5. Dynamic / attack simulation

Manual exploit attempts against a preview deployment (or local prod build). Each test logged pass/fail.

| # | Test | Expected |
|---|------|----------|
| 1 | Cross-user IDOR: fetch user B's order ID while logged in as A | 403 or 404 |
| 2 | Cross-user IDOR: PATCH user B's address while logged in as A | 403 or 404 |
| 3 | Tampered amount: POST `/api/payments/initiate` with inflated amount | Server recomputes from DB; amount honored from server-side order |
| 4 | Tampered signature: POST `/api/payments/verify` with wrong signature | 400, order stays unpaid |
| 5 | Replay webhook: send same webhook twice | Second delivery is no-op (idempotent) |
| 6 | CSRF: POST `/api/addresses` from `https://evil.com` with captured session cookie | 403 (no CSRF header) |
| 7 | Rate limit: 20 login attempts in 10 s | Blocks at configured threshold, returns 429 |
| 8 | OTP brute force: 10 wrong OTP attempts | Account locks out / new OTP required |
| 9 | Account enumeration: login with known-good vs known-bad email, compare timing & message | Identical |
| 10 | Open redirect: `/login?callbackUrl=https://evil.com` → login success | Redirects to same-origin root, not evil.com |
| 11 | XSS probe: submit `<img src=x onerror=alert(1)>` into every free-text field (name, address, etc.), view on profile/orders pages | Rendered as text, not executed |
| 12 | SQL probe: submit `' OR 1=1 --` into email/search fields | Rejected by Zod or safely parameterized |
| 13 | Body size: POST 1 MB JSON to `/api/account/profile` | 413 |
| 14 | JWT tampering: edit session cookie payload, resubmit | NextAuth rejects (bad signature) |
| 15 | Logout race: logout from tab A, attempt mutating request in tab B | 401 |

---

## 6. Reporting & sign-off

- Every checklist item → one of: `pass`, `fail`, `n/a` (with reason).
- Every `fail` → new entry in [BACKEND_DEVIATIONS.md](BACKEND_DEVIATIONS.md) (numbered), linked to a fix commit.
- No `critical` or `high` findings may remain open at deployment time.
- `medium` findings may defer to post-launch with an explicit ticket + owner.
- Final sign-off line in `BACKEND_DEVIATIONS.md`: "Security audit complete; all blockers resolved; approved for Phase 9 on YYYY-MM-DD."

---

## 7. Execution order

1. Automated pass (§1) — fix everything it flags before continuing.
2. Frontend audit (§2) — sequentially, section by section.
3. Backend audit (§3) — sequentially, section by section; §3.2 (IDOR) and §3.6 (Payments) are priority one.
4. Infrastructure checklist (§4) — in parallel with Phase 9 env setup.
5. Dynamic attack simulation (§5) — against preview deploy, before promoting to prod.
6. Reporting (§6) → sign-off → proceed to deployment.
