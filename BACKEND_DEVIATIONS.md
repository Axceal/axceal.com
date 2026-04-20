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
*(not started)*

---

## Phase 3 — Auth (OTP + register)
*(not started — will re-require RESEND_API_KEY + EMAIL_FROM here, see D0.2)*

---

## Phase 4 — NextAuth credentials
*(not started)*

---

## Phase 5 — Profile
*(not started)*

---

## Phase 6 — Addresses + Orders
*(not started)*

---

## Phase 7 — Payments (Razorpay)
*(not started — will re-require Razorpay env vars here, see D0.2)*

---

## Phase 8 — Hardening
*(not started — audit bun trusted deps here, see D0.5)*

---

## Phase 9 — Deployment
*(not started — mandatory credential rotation gate per BACKEND_PLAN.md §11.2)*
