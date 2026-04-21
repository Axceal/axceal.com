# Backend Plan — Deviations Log

Append-only record of every drift from `BACKEND_PLAN.md`. Future sessions read this alongside the plan so nothing is silently carried forward.

**Format per entry:**
- **What** — the actual deviation (file + line if relevant)
- **Why** — reason it was done this way
- **Impact** — what it affects, any risk
- **Resolution** — `keep` / `revert at phase N` / `fixed on <date>`

---

## Phase 0 — Foundation

### D0.1 — `NODE_ENV` has a default value
- **What:** [lib/env.ts:17](lib/env.ts#L17) — `NODE_ENV: z.enum([...]).default("development")`. Plan §2.2 had no default (required).
- **Why:** Tolerates manual `tsx`/script runs that don't pre-set NODE_ENV.
- **Impact:** If Vercel ever fails to inject NODE_ENV in prod (it always does, but hypothetically), the app would silently run in dev mode. Low risk.
- **Resolution:** `keep` unless prod hardening (Phase 8) flips it back to required.

### D0.2 — Phase 3/7 env vars marked optional
- **What:** [lib/env.ts:10-15](lib/env.ts#L10-L15) — `RESEND_API_KEY`, `EMAIL_FROM`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are `.optional()`. Plan §2.2 had them required.
- **Why:** User hasn't provisioned Resend / Razorpay yet. Required-ness would block `bun run build` today.
- **Impact:** If a Phase 3+ route runs without these, it will crash at use-site (not at boot). Lose fail-fast-at-startup guarantee for these five vars.
- **Resolution:** `revert at phase 3` for RESEND_API_KEY + EMAIL_FROM. `revert at phase 7` for the three Razorpay keys. Plan's §5.2 / §9.1 entry points must re-require.

### D0.3 — `drizzle.config.ts` loads env (updated during Phase 1)
- **What:** [drizzle.config.ts:1-4](drizzle.config.ts#L1-L4) — explicit `loadEnv({ path: ".env.local" })`. Plan §2.5 did not include env loading.
- **Why:** `drizzle-kit migrate` runs as a child process that does not inherit `bun`'s auto-loaded `.env.local`. Without this line, Phase 1 migration failed with `url: undefined`. The initial `import "dotenv/config"` was wrong (reads `.env`, not `.env.local`) and was corrected to an explicit path load.
- **Impact:** Required for `bun run db:generate` / `db:migrate` / `db:studio` to work at all.
- **Resolution:** `fixed on 2026-04-20` — deviation now load-bearing, not cosmetic. Future sessions must keep the explicit path load.

### D0.4 — `drizzle.config.ts` adds `verbose` + `strict` flags
- **What:** [drizzle.config.ts:10-11](drizzle.config.ts#L10-L11) — `verbose: true, strict: true`. Plan §2.5 did not include them.
- **Why:** Louder diff output on `db:generate`; strict mode catches more schema bugs at migration time.
- **Impact:** Cosmetic + safer generation.
- **Resolution:** `keep`.

### D0.5 — Bun blocked postinstall scripts
- **What:** `bun add` reported "Blocked 1 postinstall" (after runtime deps) and "Blocked 2 postinstalls" (after dev deps). Not in plan.
- **Why:** Bun's default security posture — untrusted packages don't run postinstalls unless whitelisted.
- **Impact:** So far nothing broken (Phase 0 verified). If a package needs native build at install time, features may silently miss. Run `bun pm untrusted` to inspect.
- **Resolution:** `defer to phase 8 hardening` — audit the list, whitelist what's needed via `trustedDependencies` in `package.json`.

### D0.6 — `tests/setup.ts` casts `process.env` to bypass readonly `NODE_ENV`
- **What:** [tests/setup.ts:7](tests/setup.ts#L7) — `(process.env as Record<string, string>).NODE_ENV = "test"`. Plan §2.6 did not specify this shape.
- **Why:** `@types/node` v20+ types `NODE_ENV` as readonly. Direct assignment fails `tsc --noEmit`.
- **Impact:** None. Narrow cast limited to one line.
- **Resolution:** `keep`.

---

## Phase 1 — Database schema & migrations

### D1.1 — Migration filename is auto-generated
- **What:** [drizzle/0000_mute_betty_ross.sql](drizzle/0000_mute_betty_ross.sql). Plan §3.3 referenced `0000_init.sql`.
- **Why:** Drizzle-kit appends a random codename suffix by default. Renaming would break Drizzle's meta tracking (`drizzle/meta/_journal.json` references the exact filename).
- **Impact:** Cosmetic only. Plan references to `0000_init.sql` should be read as "the first 0000_* migration".
- **Resolution:** `keep`.

### D1.2 — Migration prepends `pgcrypto` extension (not just citext)
- **What:** [drizzle/0000_mute_betty_ross.sql:1-2](drizzle/0000_mute_betty_ross.sql#L1-L2) — `CREATE EXTENSION IF NOT EXISTS "citext"` + `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`. Plan §3.3 only called out citext.
- **Why:** Schema uses `gen_random_uuid()` via Drizzle's `.defaultRandom()`. On Postgres < 13 or hardened builds, this requires pgcrypto. Neon ships it pre-installed so the `IF NOT EXISTS` is a no-op, but it documents the dependency.
- **Impact:** Safer + more portable. No downside on Neon.
- **Resolution:** `keep`.

### D1.3 — Drizzle-side `$onUpdate` on updated_at columns
- **What:** [lib/db/schema.ts](lib/db/schema.ts) — `users.updatedAt`, `userProfiles.updatedAt`, `orders.updatedAt` use `.$onUpdate(() => new Date())`. Plan §3.2 did not specify a mechanism.
- **Why:** Auto-bumps `updated_at` on Drizzle-layer writes. Keeps triggers out of the DB.
- **Impact:** Only fires for Drizzle `.update()` calls. Raw SQL updates will NOT bump the timestamp. All writes go through Drizzle in this codebase, so acceptable.
- **Resolution:** `keep`. Revisit if we add raw-SQL write paths.

### D1.4 — Schema exports TS type aliases
- **What:** [lib/db/schema.ts](lib/db/schema.ts) — exports `User`, `NewUser`, `UserProfile`, `NewUserProfile`, `Address`, `NewAddress`, `Order`, `NewOrder`, `PaymentEvent`, `NewPaymentEvent` via `$inferSelect` / `$inferInsert`. Plan §3.2 did not spell these out.
- **Why:** Services and contracts need row types. Defining them at the schema avoids scattered `typeof users.$inferSelect` boilerplate.
- **Impact:** Ergonomic. No runtime effect.
- **Resolution:** `keep`.

---

## Phase 2 — Shared contracts

### D2.1 — Contracts export `z.infer` TS type aliases
- **What:** [lib/contracts/auth.ts](lib/contracts/auth.ts), [lib/contracts/profile.ts](lib/contracts/profile.ts), [lib/contracts/address.ts](lib/contracts/address.ts), [lib/contracts/order.ts](lib/contracts/order.ts), [lib/contracts/payment.ts](lib/contracts/payment.ts) — each contract file exports `z.infer<typeof Schema>` type aliases alongside the schemas. Plan §4.2–4.6 snippets did not include these.
- **Why:** Handlers and fetchers need TS types for request/response bodies. Defining them at the contract avoids scattered `z.infer<typeof RegisterRequest>` at every use-site. Same rationale as D1.4.
- **Impact:** Ergonomic. No runtime effect. Type alias shares the name of its schema const — TS handles this via declaration merging (value + type namespaces).
- **Resolution:** `keep`.

### D2.2 — Zod v4 deprecated-method usage (`.email()`, `.url()`, `.uuid()`, `.datetime()`, `.date()`)
- **What:** Contract files use `z.string().email()`, `.url()`, `.uuid()`, `.datetime()`, `.date()`. Zod v4.3 marks these `@deprecated` in favor of top-level `z.email()`, `z.iso.date()`, etc.
- **Why:** Plan §4 snippets use the chain form verbatim; staying consistent avoids translation errors and matches existing [lib/env.ts](lib/env.ts) style.
- **Impact:** Deprecation warnings only — `tsc --noEmit` passes, no runtime effect. Will break if Zod v5 removes the methods.
- **Resolution:** `defer to phase 8 hardening` — sweep to `z.email()` / `z.iso.date()` style across all contract files + env.ts at once.

---

## Phase 3 — Auth (OTP + register)

### D3.1 — Shared §1-convention helpers built as part of Phase 3 (not listed in §5.2)
- **What:** Phase 3 shipped [lib/http/response.ts](lib/http/response.ts), [lib/http/errors.ts](lib/http/errors.ts), [lib/http/handler.ts](lib/http/handler.ts), [lib/http/request.ts](lib/http/request.ts). Plan §5.2 implementation order only called out `lib/http/rate-limit.ts`.
- **Why:** §1.1/§1.2/§1.4 require every route to use the `{ ok, data | error }` envelope, `AppError`, and `withHandler` — but those helpers hadn't been built. Phase 3's three routes couldn't follow convention without them.
- **Impact:** Helpers are now available for all future phases. `withHandler` includes dev-only output-schema verification (§1.4 requirement) — disabled in production.
- **Resolution:** `keep`. Future phases consume these directly.

### D3.2 — Dev-mode OTP logs to server console via `console.log` (bypasses pino redaction)
- **What:** [lib/email/console.ts:6](lib/email/console.ts#L6) uses `console.log` directly. The pino logger's redact list includes `code` and `otp`, which would mask the OTP if routed through `logger`. Not in plan.
- **Why:** User explicitly requested dev console logging (saves Resend quota + inbox-check loop). Redaction would defeat the purpose.
- **Impact:** Only active when `NODE_ENV !== "production"` — resolved by [lib/email/provider.ts:9](lib/email/provider.ts#L9). Production always uses Resend.
- **Resolution:** `keep`. Revisit at Phase 8 hardening to double-check the NODE_ENV guard is sufficient (i.e., confirm Vercel always sets NODE_ENV=production).

### D3.3 — `send-otp` silently skips for existing emails instead of sending a "reset" OTP
- **What:** [app/api/auth/send-otp/route.ts:26-35](app/api/auth/send-otp/route.ts#L26-L35) — if a users row already exists for the email, the route generates nothing and sends nothing, but still returns `{ sent: true }`. Plan §5.3 says "always returns 200 `{ sent: true }` (even if email doesn't exist — no user-enumeration)" but is silent on the existing-email case.
- **Why:** The alternative (send an OTP anyway) would let anyone spam an arbitrary account's inbox with verification codes via the public endpoint. Skipping preserves no-enumeration (same response shape, same latency-ish) without enabling spam.
- **Impact:** A user who already has an account but forgot won't get an OTP. That's fine — they should use /login, and a proper password-reset flow is a future phase. Rate limiter still fires per email and per IP, so the endpoint isn't trivially abusable for existence probing via timing.
- **Resolution:** `keep`. Re-evaluate when password-reset flow is designed (not in current plan).

### D3.4 — `register` uses sequential inserts + compensating delete, not a transaction
- **What:** [app/api/auth/register/route.ts:50-60](app/api/auth/register/route.ts#L50-L60) — inserts `users` row, then `user_profiles` row. If profile insert throws, deletes the user row. Plan §5.3 says "creates user row + empty user_profile row in a transaction."
- **Why:** Drizzle's `neon-http` driver does not support transactions (confirmed in `node_modules/drizzle-orm/neon-http/driver.d.ts` — has `batch` but not `transaction`). `batch()` is an option but subquery-based linking between statements is awkward for the insert+insert pattern.
- **Impact:** Window between the two inserts is tiny (single HTTP round-trip latency on Neon). A crash between them leaves a users row without a profile — recoverable by a cleanup job or by the compensating delete in the catch. If the compensating delete itself fails, the email is locked (UNIQUE) until manual cleanup.
- **Resolution:** `revisit at phase 8 hardening` — either switch `lib/db/client.ts` to `neon-serverless` driver for transaction support, or add a background reaper that deletes orphaned users (users without a user_profiles row and > N minutes old).

### D3.5 — Frontend redirects to `/login?registered=1`, not auto-login + `/account/details/name`
- **What:** [app/create-account/page.tsx](app/create-account/page.tsx) — on successful register, router pushes to `/login?registered=1`. Plan §5.4 specifies calling `signIn("credentials", ...)` then pushing to `/account/details/name`.
- **Why:** NextAuth setup is Phase 4. User approved this boundary: Phase 3 ends with API + register success; auto-login folds into Phase 4.
- **Impact:** New users see a login screen with a "?registered=1" query param after account creation. Phase 4's `/login` should read that flag and show a "Account created — please log in" info banner, then swap back to auto-login once `signIn` is wired.
- **Resolution:** `revert at phase 4` — replace the `router.push` call with `signIn("credentials", { email, password, redirect: true, callbackUrl: "/account/details/name" })`.

### D3.6 — Added IP-level rate limit on `verify-otp` not specified in plan
- **What:** [app/api/auth/verify-otp/route.ts:17](app/api/auth/verify-otp/route.ts#L17) — 20/hour per IP on verify attempts. Plan §5.3 only specified "5 attempts per OTP" (per-email, enforced inside `verifyOtp`).
- **Why:** Without an IP-level cap on verify, an attacker could try 5 codes against millions of emails from one IP. The per-OTP limit protects a specific OTP, not the endpoint.
- **Impact:** Legitimate users won't hit 20 verify attempts per hour from one IP. Attacker cost goes from "unlimited" to "rotate IPs every 20 tries."
- **Resolution:** `keep`.

### D3.7 — Reverted D0.2 for Resend env vars
- **What:** [lib/env.ts:4-5](lib/env.ts#L4-L5) — `RESEND_API_KEY` and `EMAIL_FROM` flipped from `.optional()` back to required, as D0.2 promised.
- **Why:** Phase 3 uses them at boot path (via `lib/email/provider.ts` → `lib/email/resend.ts`). Fail-fast-at-startup restored.
- **Impact:** Server now refuses to boot without both vars. User confirmed both are present in `.env.local` and axceal.com is verified in Resend.
- **Resolution:** `fixed on 2026-04-21`. Razorpay keys remain optional until Phase 7.

---

## Phase 4 — NextAuth credentials

### D4.1 — Split-config pattern: `authConfig` (edge-safe) + `NextAuth()` instance in separate files
- **What:** [lib/auth/config.ts](lib/auth/config.ts) exports an edge-safe `authConfig` (no providers, no DB imports). [lib/auth/index.ts](lib/auth/index.ts) spreads `authConfig`, adds the Credentials provider, and exports `{ auth, handlers, signIn, signOut }` from `NextAuth()`. Plan §6.1 defines the full config in one file with providers inline; §6.2 then calls `NextAuth(authConfig)` in the route handler.
- **Why:** Next.js middleware runs on the Edge runtime. Calling `NextAuth()` with a config that imports `bcryptjs` + `drizzle-orm` + `@neondatabase/serverless` from middleware breaks Edge compat. The NextAuth v5 docs specifically recommend this split (https://authjs.dev/guides/edge-compatibility). Also: calling `NextAuth(authConfig)` in both the route handler and session.ts would create two instances with independent JWT caches.
- **Impact:** `middleware.ts` imports only `authConfig` + creates its own edge-safe NextAuth instance for the `auth()` wrapper. Route handler + session.ts share the single full instance from `lib/auth/index.ts`.
- **Resolution:** `keep`.

### D4.2 — JWT module augmentation targets `@auth/core/jwt`, not `next-auth/jwt`
- **What:** [lib/auth/config.ts:13](lib/auth/config.ts#L13) — `declare module "@auth/core/jwt"`. Plan §6.1 snippet implied `next-auth/jwt`.
- **Why:** `next-auth/jwt` is a `export *` re-export from `@auth/core/jwt`, and TypeScript's module augmentation resolver with `moduleResolution: "bundler"` can't augment re-exports — it errors with "Invalid module name in augmentation". Augmenting the underlying `@auth/core/jwt` interface flows through the re-export correctly.
- **Impact:** None functional — `JWT.uid` is typed everywhere it's used.
- **Resolution:** `keep`.

### D4.3 — `verifyCredentials` extracted to its own file
- **What:** [lib/auth/credentials.ts](lib/auth/credentials.ts) — `verifyCredentials(email, password)` encapsulates the DB lookup + bcrypt compare used by the Credentials provider's `authorize`. Plan §6.1 inlined this logic inside the provider.
- **Why:** Lets the credentials verification path be unit-tested in isolation (no NextAuth plumbing required in tests). `authorize` now just composes rate-limit + `verifyCredentials`.
- **Impact:** Cleaner separation; matches the §1.4 invariant ("business logic lives in `lib/services/*` — route files only wire") applied at the auth boundary.
- **Resolution:** `keep`.

### D4.4 — Login rate limits added in Phase 4 (not deferred to Phase 8)
- **What:** [lib/auth/index.ts:25-26](lib/auth/index.ts#L25-L26) — 10/hr/email + 30/hr/IP login rate limits applied inside `authorize`, before DB lookup. Plan §10.1 put these limits in Phase 8 hardening.
- **Why:** User decision (2026-04-21) — add rate limits now instead of deferring. Earlier application narrows the brute-force window. When rate limit fires, `authorize` returns `null`, which NextAuth treats as a generic auth failure (no leak that the limit hit).
- **Impact:** A legitimate user who typos their password 10 times in an hour will be locked out for the remainder of the hour even if they then enter the correct password — returns null with no distinguishing signal. Acceptable tradeoff.
- **Resolution:** `keep`. Phase 8 checklist item for login rate limits is pre-satisfied.

### D4.5 — Register auto-signIn destination is `/account`, not `/account/details/name`
- **What:** [app/create-account/page.tsx](app/create-account/page.tsx) — on register success, `signIn("credentials", { redirect: false })`, then `router.push("/account")`. Plan §5.4 specified `/account/details/name` (onboarding flow). D3.5's promised revert specified the same.
- **Why:** User decision (2026-04-21) — new users should land directly on the personal account page. Onboarding wizard flow intentionally skipped; if the user wants to fill name/birthday/gender/phone, they'll click through from `/account`.
- **Impact:** New account lands on `/account`. Profile is empty; `/account` must tolerate null fields (it already does — empty profile row was created at register).
- **Resolution:** `keep`. Closes out D3.5 (revert fulfilled, destination adjusted per user preference).

### D4.6 — Fallback: register auto-signIn failure redirects to `/login?registered=1`
- **What:** [app/create-account/page.tsx](app/create-account/page.tsx) — if `signIn()` after successful register returns `!ok` or an error, redirect to `/login?registered=1` instead. Plan §5.4 did not specify a failure branch.
- **Why:** Rare but possible — NextAuth cookie write failure, race with the new user row, network blip between register POST and signIn POST. Falling back to the login page preserves D3.5's UX (info banner greets the user) rather than silently leaving them on /create-account.
- **Impact:** In the rare case the login page shows "Account created. Log in to continue." instead of auto-dropping the user in `/account`. Graceful.
- **Resolution:** `keep`.

### D4.7 — Middleware file convention deprecation warning (Next.js 16)
- **What:** `bun run build` emits `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` [middleware.ts](middleware.ts) is still named `middleware.ts`.
- **Why:** Next.js 16 renamed the convention to `proxy.ts`. NextAuth v5 beta docs still reference `middleware.ts`, and the old name still works (warning, not error). Renaming untested with NextAuth's `auth(...)` wrapper.
- **Impact:** Build shows the deprecation warning on every run. Functional: unchanged.
- **Resolution:** `revisit at phase 8 hardening` — verify NextAuth v5 stable release guidance, then rename to `proxy.ts` if supported.

---

## Phase 5 — Profile

### D5.1 — Added `GET /api/account/me` (account overview) in addition to the planned profile endpoint
- **What:** [app/api/account/me/route.ts](app/api/account/me/route.ts) + [lib/services/account.ts](lib/services/account.ts) + [lib/contracts/account.ts](lib/contracts/account.ts) — new endpoint returns `{ email, createdAt, profile }`. Plan §7.1 only specified `GET/PUT /api/account/profile`.
- **Why:** The `/account` page needs the user's email and account creation date alongside profile fields. Extending `GET /api/account/profile` to include email + createdAt would muddy the PUT semantics (those fields can't be written). A separate read-only overview endpoint keeps profile CRUD clean.
- **Impact:** Two endpoints to maintain. `AccountOverviewSchema` reuses `ProfileSchema`, so no real duplication of the profile shape.
- **Resolution:** `keep`.

### D5.2 — Save-per-step flow (Option a from user decision 2026-04-21)
- **What:** [app/account/details/layout.tsx](app/account/details/layout.tsx) — each Next button click PUTs only that step's fields to `/api/account/profile` before navigating. The final Proceed pushes to `/` (home). Plan §7.3 said "each subpage calls PUT with only its own keys on Next" which matches; the Proceed destination is new.
- **Why:** Partial saves survive mid-flow reloads — if the user abandons the wizard after filling name+birthday, those fields are already persisted. Avoids losing progress on refresh.
- **Impact:** One PUT per step (four PUTs total for a fresh user). Failure at step N leaves steps 0..N-1 persisted and step N unsaved — the error banner surfaces this, user can retry. Network-wise negligible.
- **Resolution:** `keep`.

### D5.3 — GET-on-mount hydrates the wizard context (doubles as edit mode)
- **What:** [app/account/details/_context.tsx](app/account/details/_context.tsx) — `AccountDetailsProvider` fires a GET on mount and prefills all fields from the server response. Plan §7.3 only said "Reads via GET on mount" for each subpage; this centralizes the GET at the provider level.
- **Why:** User decision 2026-04-21 — the same `/account/details/*` wizard doubles as edit UI for returning users. Single GET at the provider avoids 4× GETs (one per subpage mount).
- **Impact:** Brief empty-field flash while the fetch is in flight (~100-300 ms). Hydration marks `hydrated: true` on completion; pages don't gate rendering on it (acceptable — the UI shows empty → fills in, no layout shift).
- **Resolution:** `keep`.

### D5.4 — Gender enum mapping lives in the wiring layer, not the API
- **What:** [app/account/details/layout.tsx:17-21](app/account/details/layout.tsx#L17-L21) (UI→server) + [app/account/details/_context.tsx:42-46](app/account/details/_context.tsx#L42-L46) (server→UI). The wizard stores user-facing strings (`"Female" | "Male" | "Keep it Private"`); the layout maps to lowercase enum (`female | male | private`) before PUT; the context reverse-maps on hydration. Plan §7.1 did not spell out which side of the boundary the enum lives.
- **Why:** User decision 2026-04-21 — keep the existing UI strings (nicer phrasing: "Keep it Private" vs a literal "Private"). The DB schema + `ProfileSchema` use the lowercase taxonomy already baked into the migration's check constraint.
- **Impact:** Mapping duplicated in two places (forward + reverse). If the UI label ever changes, both mappings must update. Consider moving to a shared module if gender appears elsewhere.
- **Resolution:** `keep`.

### D5.5 — Phone OTP verification deferred (future phase, provider TBD)
- **What:** Phase 5 persists phone number as plain text with no verification. Plan §7 made no mention of phone OTP.
- **Why:** User requirement flagged 2026-04-21 — phone numbers should eventually require SMS-OTP verification before persist, via Firebase Auth Phone / Twilio Verify / Plivo Verify (provider undecided). Out of scope for Phase 5.
- **Impact:** Until a future phase adds phone verification, any authenticated user can set any phone number. Low risk for current e-commerce scope (phone is not used as an auth factor).
- **Resolution:** `revisit at phase 8+` — pick a provider, add env vars, introduce a verify-phone-otp endpoint, gate `PUT /api/account/profile` on `phoneVerifiedAt` before persisting phone.

### D5.6 — `/account` page "Edit Details" and "Change Password" left as static text
- **What:** [app/account/page.tsx](app/account/page.tsx) — both labels are rendered but have no `onClick` / `Link` / handler. Plan §7 did not address `/account` page wiring.
- **Why:** User decision 2026-04-21 — keep these as-is for now. "Edit Details" will eventually link to `/account/details/name` (the wizard already doubles as edit via D5.3's GET-on-mount). "Change Password" has no backend yet.
- **Impact:** Users can't click through to edit from `/account` — they must navigate manually to `/account/details/name`. Change-password is entirely unimplemented.
- **Resolution:** `revisit at later phase` — wire Edit Details as a `Link` once the UX is finalized; build the change-password endpoint + UI in a dedicated phase.

### D5.7 — Route test mocks `@/lib/auth/session` to sidestep NextAuth's `next/server` import in vitest
- **What:** [tests/profile/profile-route.test.ts:3-10](tests/profile/profile-route.test.ts#L3-L10) — `vi.mock("@/lib/auth/session", ...)` at the top, route module imported dynamically after. Plan §7.4 didn't specify a test approach.
- **Why:** Importing the profile route transitively pulls `@/lib/auth` → `next-auth` → `next/server`, which fails to resolve in vitest's Node environment (`Cannot find module ... next/server`). Mocking the session module breaks the import chain. The register route test (Phase 3) didn't hit this because register doesn't import `requireSession`.
- **Impact:** Route tests cover Zod validation paths only (which run before requireSession). The happy-path PUT→GET is covered by the service test. The 401 unauth path is covered by middleware + Phase 4 session tests.
- **Resolution:** `keep`.

---

## Phase 6 — Addresses + Orders

### D6.1 — Frontend always sends both `billingAddress` and `shippingAddress` (never `null`)
- **What:** [app/order/billing-shipping/page.tsx](app/order/billing-shipping/page.tsx) `handleProceed` — if the user selects "Same as Billing" (`showShipping === false`), the billing address object is copied into `shippingAddress` client-side before POST. The API schema still accepts `shippingAddress: null` (meaning "same as billing"), but the frontend never exercises that branch. Plan §8.1 allowed `shippingAddress: null`.
- **Why:** User decision 2026-04-21 — "always collect both" (answer to checkout question #2). Keeps the wire format consistent and simplifies downstream read/render code (shipping snapshot is always present).
- **Impact:** When "Same as Billing" is selected, two identical address rows are inserted (one billing, one shipping) and both snapshot JSONs carry the same payload. Minor storage cost; zero behavioral risk since the snapshots are decoupled from the live address rows.
- **Resolution:** `keep`. The API still supports `null` shippingAddress for future clients or direct API users.

### D6.2 — Quantity passed to billing-shipping as `?qty=<n>` URL param (not SWR/context/store)
- **What:** [app/order/units/page.tsx](app/order/units/page.tsx) — Proceed navigates to `/order/billing-shipping?qty=${quantity}`. [app/order/billing-shipping/page.tsx](app/order/billing-shipping/page.tsx) reads + clamps (1..5). Plan §8.3 said "store quantity in URL param or SWR state"; confirmed URL param by user decision 2026-04-21.
- **Why:** URL-param state survives reloads, is trivially shareable in logs, and avoids a cross-page store just for one integer. Server-side `quantity` validation in `CreateOrderRequest` is the authoritative check; client clamp is cosmetic.
- **Impact:** User can manually edit `?qty=` up to any integer; clamp + server Zod reject values outside 1..5. No risk.
- **Resolution:** `keep`.

### D6.3 — `useSearchParams()` requires Suspense boundary on `/order/billing-shipping`
- **What:** [app/order/billing-shipping/page.tsx](app/order/billing-shipping/page.tsx) — default export is now a thin `Suspense`-wrapped shell around `BillingShippingPageInner`. Plan §8.3 did not mention the Suspense requirement.
- **Why:** Next.js 16 bails out of static prerendering when a client component reads `useSearchParams()` without a Suspense ancestor — `bun run build` fails with "useSearchParams() should be wrapped in a suspense boundary". Wrapping the inner component is the idiomatic fix.
- **Impact:** Brief empty render while client JS hydrates and reads `?qty=`. Since this page is gated behind auth middleware and loaded from `/order/units` Proceed (always authed, always with qty), the fallback flash is unobservable in normal flow.
- **Resolution:** `keep`.

### D6.4 — Idempotency key lifetime: one key per `sessionStorage` window
- **What:** [app/order/billing-shipping/page.tsx](app/order/billing-shipping/page.tsx) — `idempotencyKeyRef` initialized from `sessionStorage["order:idempotency-key"]`, generated via `crypto.randomUUID()` on first mount if absent. Plan §8.3 said "generate `idempotencyKey` with `crypto.randomUUID()` on first submit, memoize across retries"; sessionStorage was user-confirmed 2026-04-21.
- **Why:** Retries from the same page (network error → click Proceed again) reuse the key — server returns the existing order. A fresh tab / new session gets a new key, which is the semantically correct boundary for "this is a new order attempt".
- **Impact:** If a user places an order, abandons, reopens the same tab (sessionStorage still alive), and tries to check out a *different* order at a *different* quantity, the stale key hits the server's idempotency lookup and returns the previously-created (possibly different-qty) order. Mitigation: clear the key once the user lands on `/order/payment` (future enhancement), or after successful payment.
- **Resolution:** `revisit at phase 7` — when the payment page ships, clear the sessionStorage key on payment success.

### D6.5 — Order creation uses try/catch idempotency race handling, not `ON CONFLICT DO NOTHING RETURNING *`
- **What:** [lib/services/order.ts](lib/services/order.ts) `createOrder` — optimistic lookup by `idempotencyKey`, insert addresses + order, catch unique-constraint violation on order insert and re-lookup. Plan §8 "common mistakes" noted `ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`.
- **Why:** Neon-http has no transactions (see D3.4), so the `INSERT ... ON CONFLICT` approach would still leave orphan address rows if two concurrent requests with the same key both insert addresses before one wins the order-insert race. The catch-and-relookup approach has the same address orphaning behavior but is simpler to read. Under single-user retries (the common case), the optimistic pre-lookup resolves without ever reaching the catch branch.
- **Impact:** Under a concurrent duplicate-key race (same user, same key, simultaneous POST), the loser orphans 1–2 address rows (no FK violations because `addresses` has no backpointer). `idempotency_key` unique constraint still guarantees exactly one order row. Risk: negligible — humans click once, and the duplicate-submit UX is guarded by the `submitting` flag.
- **Resolution:** `revisit at phase 8 hardening` — either sweep orphan addresses via a reaper, or migrate `lib/db/client.ts` to neon-serverless for transaction support (addresses D3.4 too).

### D6.6 — `DELETE /api/addresses/[id]` and `GET /api/orders/[id]` bypass `withHandler` (direct handlers)
- **What:** [app/api/addresses/[id]/route.ts](app/api/addresses/[id]/route.ts) and [app/api/orders/[id]/route.ts](app/api/orders/[id]/route.ts) implement `DELETE` / `GET` as plain `async function` handlers instead of via `withHandler`. Plan §1.4 mandates `withHandler` for every route.
- **Why:** `withHandler`'s signature is `(req: Request) => Response` — it does not forward Next.js's dynamic-segment context `{ params: Promise<{ id: string }> }`. Extending `withHandler` to thread params through would touch every existing handler; the two dynamic-segment routes are a small, well-scoped exception. Both still use `ok` / `fail` / `AppError` / `requireSession` — the only convention skipped is the wrapper itself.
- **Impact:** No output schema is enforced on these two handlers (no dev-mode response-shape guard). DELETE returns `{ deleted: true }`; GET returns an already-validated `OrderResponse`-shaped object from `getOrder`.
- **Resolution:** `revisit at phase 8 hardening` — extend `withHandler` to accept `params` and refactor both routes.

---

## Phase 7 — Payments (Razorpay)
*(not started — will re-require Razorpay env vars here, see D0.2)*

---

## Phase 8 — Hardening
*(not started — audit bun trusted deps here, see D0.5)*

---

## Phase 9 — Deployment
*(not started — mandatory credential rotation gate per BACKEND_PLAN.md §11.2)*
