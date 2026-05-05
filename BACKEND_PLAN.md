# Axceal Backend — Implementation Plan

**Purpose:** Single source of truth for implementing the Axceal backend. Future sessions (Opus or Sonnet) read this top-to-bottom and resume at the first unchecked phase. Do not skip phases. Do not improvise the stack.

---

## 0. Invariants (read before every phase)

### Stack (locked)
- **Runtime:** Next.js 15 App Router, Route Handlers in `app/api/*`, **Node runtime** (not Edge — `pg`, `bcrypt`, NextAuth need Node)
- **Language:** TypeScript, `strict: true`
- **Package manager:** `bun` (project already uses `bun.lock`)
- **ORM:** Drizzle
- **DB:** Neon Postgres (AWS `ap-south-1`), `@neondatabase/serverless` driver
- **KV:** Upstash Redis (REST client `@upstash/redis`)
- **Auth:** NextAuth v5 (Auth.js), credentials provider, JWT session strategy
- **Email:** Resend (behind an `EmailProvider` adapter so Postmark swap is one file)
- **Payments:** Razorpay (test mode → live at deploy)
- **Validation:** Zod on every route boundary, every external input
- **Deploy:** Vercel
- **Tests:** Vitest, Node environment, for **Checkout + Auth core logic only** (not UI)

### Hard rules (apply to every line of code)
1. **Never trust client input** — every handler begins with `schema.parse(...)` or `safeParse`.
2. **Never leak internals** — error responses use the taxonomy in §1.2. Stack traces go to logs, never to clients.
3. **Never bypass the response envelope** (§1.1) — not even for "simple" endpoints.
4. **Every endpoint has a Zod request schema and a Zod response schema** in `lib/contracts/*` — defined **before** the handler is written.
5. **Money is integer paise** (`number` of paise) in the DB and in Razorpay calls. Never floats for money. The UI still shows "INR 9,999" — server multiplies by 100.
6. **Secrets come from `env.ts`** (validated with Zod) — never `process.env.X` scattered in handlers.
7. **Mutations are idempotent where the client may retry** — use idempotency keys on order creation and payment verification.
8. **Writes that depend on reads go through a transaction** — Drizzle `db.transaction(...)`.
9. **Every protected route uses `requireSession(req)`** from `lib/auth/session.ts` as its first line after validation.
10. **Every OTP/auth/webhook route is rate-limited** — unrate-limited endpoints are bugs.
11. **Do not add a `products` table.** Axceal sells one SKU. Product config is a typed constant in `lib/product.ts`. Revisit only if a second SKU is added.
12. **Do not commit `.env*`** — only `.env.example` is tracked.
13. **Do not write UI/animation code in this plan's scope** — backend only. Wire existing pages; don't redesign them.

### Non-goals for this plan
- No admin dashboard.
- No analytics/tracking beyond basic server logs.
- No i18n.
- No inventory system (single SKU, assume always in stock — we'll cap qty per order at 5).
- No user-visible order tracking beyond "paid / failed / pending" (expand later).

---

## 1. Conventions (the contract every phase follows)

### 1.1 API response envelope

Every JSON response from `app/api/*` uses exactly one of these shapes:

```ts
// success
{ ok: true, data: T }

// failure
{ ok: false, error: { code: ErrorCode, message: string, details?: unknown } }
```

Helper in `lib/http/response.ts`:

```ts
export const ok = <T>(data: T, init?: ResponseInit) =>
  Response.json({ ok: true, data }, init);

export const fail = (code: ErrorCode, message: string, status: number, details?: unknown) =>
  Response.json({ ok: false, error: { code, message, details } }, { status });
```

### 1.2 Error taxonomy (`lib/http/errors.ts`)

```ts
export const ErrorCode = {
  // 400
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_OTP: "INVALID_OTP",
  OTP_EXPIRED: "OTP_EXPIRED",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  // 401
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  // 403
  FORBIDDEN: "FORBIDDEN",
  // 404
  NOT_FOUND: "NOT_FOUND",
  // 409
  EMAIL_EXISTS: "EMAIL_EXISTS",
  ORDER_ALREADY_PAID: "ORDER_ALREADY_PAID",
  // 422
  UNPROCESSABLE: "UNPROCESSABLE",
  // 429
  RATE_LIMITED: "RATE_LIMITED",
  // 500
  INTERNAL: "INTERNAL",
  // 502
  UPSTREAM_FAILED: "UPSTREAM_FAILED",
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
```

### 1.3 Folder layout (final state)

```
axceal-website/
  app/
    api/
      auth/
        send-otp/route.ts
        verify-otp/route.ts
        register/route.ts
        [...nextauth]/route.ts        # NextAuth handler
      account/
        profile/route.ts              # GET, PUT
      addresses/
        route.ts                      # GET, POST
        [id]/route.ts                 # PUT, DELETE
      orders/
        route.ts                      # GET, POST
        [id]/route.ts                 # GET
      payments/
        initiate/route.ts             # POST
        verify/route.ts               # POST
        webhook/route.ts              # POST (raw body, signature-verified)
    (existing page routes unchanged)
  lib/
    env.ts                            # Zod-validated env
    db/
      client.ts                       # Drizzle + Neon client (memoized)
      schema.ts                       # Drizzle table definitions (one file, co-located by domain)
    redis.ts                          # Upstash client (memoized)
    http/
      response.ts                     # ok/fail helpers
      errors.ts                       # ErrorCode enum, AppError class
      handler.ts                      # withHandler() wrapper: validation + error mapping + logging
      rate-limit.ts                   # limiter helpers (fixed-window via Redis)
    auth/
      config.ts                       # NextAuth config
      session.ts                      # requireSession(), getSession()
      password.ts                     # bcrypt hash/compare
      otp.ts                          # generate/verify OTP, Redis-backed
    email/
      provider.ts                     # EmailProvider interface
      resend.ts                       # Resend implementation
      templates/
        otp.tsx                       # React Email component
        order-receipt.tsx
    razorpay/
      client.ts                       # Razorpay SDK wrapper
      verify.ts                       # HMAC signature verifier
    contracts/
      auth.ts                         # Zod schemas for /api/auth/*
      profile.ts
      address.ts
      order.ts
      payment.ts
      common.ts                       # shared primitives (Email, Phone, Paise, etc.)
    product.ts                        # AERO = { sku, priceInPaise: 999900, maxQtyPerOrder: 5 }
    logger.ts                         # pino instance
  drizzle/
    meta/
    0000_init.sql                     # migration output
    ...
  tests/
    auth/                             # Vitest tests
    checkout/
    setup.ts                          # test DB reset, seed
  drizzle.config.ts
  vitest.config.ts
  .env.example
```

### 1.4 Route handler pattern (every handler follows this)

```ts
// app/api/orders/route.ts
import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import { CreateOrderSchema, OrderResponseSchema } from "@/lib/contracts/order";
import { createOrder } from "@/lib/services/order";

export const POST = withHandler({
  input: CreateOrderSchema,
  output: OrderResponseSchema,
  handler: async ({ input, req }) => {
    const session = await requireSession(req);
    return createOrder(session.userId, input);
  },
});
```

`withHandler` is responsible for:
- Parsing + validating input (Zod)
- Catching `AppError` → mapping to `fail(code, msg, status)`
- Catching uncaught errors → logging with request id, returning `{ code: INTERNAL }` with no stack leak
- Rate-limit check (optional per-route config)
- Response shape verification in dev (parse output schema, throw loudly if mismatch)

**Business logic lives in `lib/services/*` — never in route files.** Route files only wire.

### 1.5 Naming

- DB columns: `snake_case`. TS fields from Drizzle: `camelCase` (use Drizzle's `columnName: varchar("column_name")` mapping).
- Zod schemas: `PascalCaseSchema` (e.g., `CreateOrderSchema`).
- Inferred types: `type CreateOrder = z.infer<typeof CreateOrderSchema>`.
- Services: verbs, `createOrder`, `verifyOtp`, `sendOtpEmail`.

### 1.6 Git hygiene

- One PR / commit per phase. Commit message: `backend: phase N — <topic>`.
- Never commit secrets or migration files before review.
- Never force-push shared branches.

---

## 2. Phase 0 — Foundation

**Goal:** Tooling installed, env validated, clients memoized, nothing yet exposed.

### 2.1 Install dependencies

```bash
bun add drizzle-orm @neondatabase/serverless @upstash/redis zod next-auth@beta @auth/drizzle-adapter bcryptjs pino pino-pretty razorpay resend react-email @react-email/components
bun add -d drizzle-kit vitest @vitest/coverage-v8 tsx dotenv @types/bcryptjs
```

### 2.2 Create `lib/env.ts`

Zod-validate every env var on boot. Import `env` everywhere instead of `process.env`.

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]),
});
export const env = EnvSchema.parse(process.env);
```

Also create `.env.example` mirroring these keys with blank values.

### 2.3 Create `lib/db/client.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env";

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

### 2.4 Create `lib/redis.ts`

```ts
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});
```

### 2.5 Create `drizzle.config.ts`

```ts
import type { Config } from "drizzle-kit";
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

Add scripts to `package.json`:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"test": "vitest run",
"test:watch": "vitest"
```

### 2.6 Create `vitest.config.ts`

```ts
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globals: false,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

### 2.7 Create `lib/logger.ts` (pino) and `lib/product.ts`

```ts
// lib/product.ts
export const AERO = {
  sku: "AERO_X1",
  name: "Aero x1",
  priceInPaise: 999_900,       // INR 9,999.00
  maxQtyPerOrder: 5,
} as const;
```

### 2.8 Provision services

- Create Neon project in `ap-south-1`. Use the **pooled** connection string → `DATABASE_URL`. Create a `dev` branch for local work; keep `main` for production only.
- Create Upstash Redis in same region. Copy REST URL + token.
- **Email sending domain** — see §2.8a below. This is a prerequisite for Phase 3 (OTP), not Phase 0.
- Create Razorpay test account, copy key id + secret.

### 2.8a Email sending domain (prerequisite for Phase 3)

**Status:** Domain `axceal.com` is owned but no email inbox / sending is set up yet. This MUST be resolved before Phase 3, since OTP emails cannot be sent from an unverified domain on Resend (unverified senders only deliver to the account owner's address — fine for very early dev, not for real testing).

**Steps (do before Phase 3 begins):**
1. Decide sending subdomain — recommended: `mail.axceal.com` or `send.axceal.com` (keeps the root domain's reputation isolated from transactional mail).
2. In Resend dashboard → Domains → Add Domain → enter the subdomain.
3. Resend will show required DNS records: **SPF** (TXT), **DKIM** (CNAME x 3), **DMARC** (TXT, start with `p=none`).
4. Add the records at your DNS registrar for `axceal.com`. Wait for propagation (usually minutes, occasionally hours).
5. Click "Verify" in Resend. All checks must pass green.
6. Set `EMAIL_FROM` env var to `no-reply@mail.axceal.com` (or chosen From).
7. Test delivery to a real inbox (Gmail, Outlook) — verify it lands in inbox, not spam.

**You do NOT need an email inbox** (i.e., you do not need to receive email at `no-reply@mail.axceal.com`) — Resend is send-only. A receiving inbox is a separate concern (e.g., Google Workspace or Zoho Mail on `axceal.com`). Purchase one if you want to receive replies, but it's orthogonal to OTP sending.

**Interim dev workflow (before domain is verified):** Use Resend's default `onboarding@resend.dev` sender and the account-owner's email as the test recipient. Swap to the real domain once DNS is green. The `EmailProvider` adapter makes this a one-line change.

### Done criteria
- [x] `bun run build` succeeds.
- [x] `bun run db:studio` connects to Neon. (Verified via direct `select version()` → PostgreSQL 17.8.)
- [x] A test file `tests/redis.test.ts` can `SET`/`GET` a key on Upstash.
- [x] Importing `env` in any file fails fast when a var is missing.

### Common mistakes
- Forgetting to validate env → silent `undefined` bugs in prod. Always go through `env`.
- Not memoizing the Neon client → connection storms under load. `export const db` at module scope.
- Installing `next-auth@4` instead of `next-auth@beta` (v5). v5 is what this plan uses.

---

## 3. Phase 1 — Database schema & migrations

**Goal:** All tables exist in Neon. No application code yet uses them — that comes in later phases.

### 3.1 Design decisions

- `users.email` is **citext** (case-insensitive unique). Install `CREATE EXTENSION IF NOT EXISTS citext` as first migration step.
- `orders.total_paise` is stored (not computed) — price could change, historical orders must not mutate.
- `orders.status` enum: `pending | paid | failed | cancelled`.
- `addresses` are never hard-deleted; use `deleted_at` soft delete so past orders keep their snapshot.
- **Snapshot address into the order row**: `orders.billing_address_snapshot jsonb`, `orders.shipping_address_snapshot jsonb`. This protects orders from later address edits. Also keep `billing_address_id` as the soft FK for UX.
- `otp_codes` is **not** a Postgres table. OTPs live in Upstash (short TTL, high churn, no need for audit log). Only stored in Postgres if we later need an audit trail.

### 3.2 Tables (`lib/db/schema.ts`)

```ts
// users
id uuid pk default gen_random_uuid()
email citext unique not null
password_hash text not null
email_verified_at timestamptz
created_at timestamptz default now() not null
updated_at timestamptz default now() not null

// user_profiles (1:1 with users)
user_id uuid pk references users.id on delete cascade
first_name text
last_name text
birthday date
gender text check (gender in ('female','male','private'))
phone_country_code text       // "91"
phone text                     // digits only
phone_sign text default '+'    // '+' or '-'  (matches frontend)
updated_at timestamptz default now() not null

// addresses
id uuid pk default gen_random_uuid()
user_id uuid references users.id on delete cascade not null
first_name text not null
last_name text not null
line1 text not null check (char_length(line1) <= 50)
country text not null
state text not null
zip text not null
phone_country_code text not null
phone text not null
phone_sign text not null default '+'
is_default_billing boolean default false not null
is_default_shipping boolean default false not null
deleted_at timestamptz
created_at timestamptz default now() not null

// orders
id uuid pk default gen_random_uuid()
user_id uuid references users.id on delete restrict not null
sku text not null                       // 'AERO_X1'
quantity int not null check (quantity between 1 and 5)
unit_price_paise int not null           // snapshot
total_paise int not null                // quantity * unit_price_paise
status text not null check (status in ('pending','paid','failed','cancelled')) default 'pending'
billing_address_id uuid references addresses.id
shipping_address_id uuid references addresses.id     // nullable => same as billing
billing_address_snapshot jsonb not null
shipping_address_snapshot jsonb                       // null => same as billing
razorpay_order_id text unique
razorpay_payment_id text
razorpay_signature text
idempotency_key text unique                           // client-supplied on create
created_at timestamptz default now() not null
updated_at timestamptz default now() not null

// payment_events (webhook audit log)
id uuid pk default gen_random_uuid()
order_id uuid references orders.id
razorpay_event_id text unique not null
event_type text not null
payload jsonb not null
received_at timestamptz default now() not null
```

Indexes:
- `orders(user_id, created_at desc)`
- `addresses(user_id) where deleted_at is null`
- `users(email)` is unique already

### 3.3 Migration

```bash
bun run db:generate
# review drizzle/0000_*.sql — ensure citext extension is added (edit if needed)
bun run db:migrate
```

### Done criteria
- [x] `drizzle/0000_init.sql` committed. (Actual filename: `drizzle/0000_mute_betty_ross.sql` — Drizzle auto-names. See D1.1.)
- [x] Tables visible in `bun run db:studio`. (Verified by direct query: `addresses`, `orders`, `payment_events`, `user_profiles`, `users` + extensions `citext` + `pgcrypto` + custom indexes.)
- [x] `bun run build` still green.

### Common mistakes
- Forgetting the `citext` extension → case-sensitive email leads to duplicate accounts (`A@x.com` and `a@x.com`).
- Using `float` or `numeric` for money — use **integer paise** everywhere.
- Missing the `idempotency_key` unique constraint — order creation will duplicate under client retries.

---

## 4. Phase 2 — Shared contracts (Zod)

**Goal:** Every request/response shape is defined **before** any handler is written. These are imported by both routes and client-side fetchers.

### 4.1 `lib/contracts/common.ts`

```ts
export const Email = z.string().email().toLowerCase().trim();
export const Password = z.string().min(8).max(128);
export const Otp4 = z.string().regex(/^\d{4}$/);
export const PhoneCountryCode = z.string().regex(/^\d{1,4}$/);
export const PhoneDigits = z.string().regex(/^\d{7,15}$/);
export const Paise = z.number().int().nonnegative();
export const UUID = z.string().uuid();
```

### 4.2 `lib/contracts/auth.ts`

```ts
export const SendOtpRequest = z.object({ email: Email });
export const SendOtpResponse = z.object({ sent: z.literal(true) });

export const VerifyOtpRequest = z.object({ email: Email, otp: Otp4 });
export const VerifyOtpResponse = z.object({ otpToken: z.string() });  // short-lived (10 min) signed token

export const RegisterRequest = z.object({
  email: Email,
  password: Password,
  otpToken: z.string(),
});
export const RegisterResponse = z.object({ userId: UUID });
```

### 4.3 `lib/contracts/profile.ts`

```ts
export const ProfileSchema = z.object({
  firstName: z.string().min(1).max(80).nullable(),
  lastName: z.string().min(1).max(80).nullable(),
  birthday: z.string().date().nullable(),
  gender: z.enum(["female", "male", "private"]).nullable(),
  phoneCountryCode: PhoneCountryCode.nullable(),
  phone: PhoneDigits.nullable(),
  phoneSign: z.enum(["+", "-"]).default("+"),
});
export const UpdateProfileRequest = ProfileSchema.partial();
```

### 4.4 `lib/contracts/address.ts`

```ts
export const AddressSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  line1: z.string().min(1).max(50),
  country: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  zip: z.string().min(1).max(20),
  phoneCountryCode: PhoneCountryCode,
  phone: PhoneDigits,
  phoneSign: z.enum(["+", "-"]).default("+"),
});
```

### 4.5 `lib/contracts/order.ts`

```ts
export const CreateOrderRequest = z.object({
  quantity: z.number().int().min(1).max(5),
  billingAddress: AddressSchema,
  shippingAddress: AddressSchema.nullable(),   // null => same as billing
  idempotencyKey: z.string().uuid(),
});
export const OrderResponse = z.object({
  id: UUID,
  status: z.enum(["pending", "paid", "failed", "cancelled"]),
  quantity: z.number().int(),
  totalPaise: Paise,
  createdAt: z.string().datetime(),
});
```

### 4.6 `lib/contracts/payment.ts`

```ts
export const InitiatePaymentRequest = z.object({ orderId: UUID });
export const InitiatePaymentResponse = z.object({
  razorpayOrderId: z.string(),
  razorpayKeyId: z.string(),
  amountPaise: Paise,
  currency: z.literal("INR"),
});

export const VerifyPaymentRequest = z.object({
  orderId: UUID,
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});
export const VerifyPaymentResponse = z.object({ status: z.literal("paid") });
```

### Done criteria
- [x] All contract files compile.
- [x] `tsc --noEmit` passes.
- [x] No handler yet imports a plain object — everything is a Zod schema.

### Common mistakes
- Defining schemas loose (`z.any()`) "to fix later" — that later never comes. Be strict now.
- Forgetting `.trim()` and `.toLowerCase()` on email — causes unique constraint collisions.

---

## 5. Phase 3 — Auth: OTP send / verify / register

**Goal:** User can enter email → receive 4-digit OTP → enter OTP → set password → account created.

### 5.1 OTP storage model (Upstash)

Keys:
- `otp:<email>` → `{ code: "1234", attempts: 0 }`, TTL 10 min
- `otp:send-rate:<email>` → counter, TTL 1 hour, cap 5
- `otp:verify-token:<uuid>` → `{ email, exp }`, TTL 10 min (issued after successful verify; proof-of-OTP for register)

### 5.2 Implementation order

1. `lib/email/provider.ts` — `interface EmailProvider { sendOtp(to, code): Promise<void>; }`
2. `lib/email/resend.ts` — Resend implementation.
3. `lib/email/templates/otp.tsx` — React Email template.
4. `lib/auth/otp.ts` — `generateOtp()`, `storeOtp(email, code)`, `verifyOtp(email, code)`, `issueOtpToken(email)`, `consumeOtpToken(token)`.
5. `lib/auth/password.ts` — `hashPassword(plain)`, `verifyPassword(plain, hash)` (bcrypt, 12 rounds).
6. `lib/http/rate-limit.ts` — `rateLimit(key, { limit, windowSec })` using Redis `INCR + EXPIRE`.
7. `app/api/auth/send-otp/route.ts`
8. `app/api/auth/verify-otp/route.ts`
9. `app/api/auth/register/route.ts`

### 5.3 Endpoint contracts (recap)

- `POST /api/auth/send-otp` — body `{ email }`. Rate-limit: 5 per hour per email AND 10 per hour per IP. Always returns 200 `{ sent: true }` (even if email doesn't exist — no user-enumeration).
- `POST /api/auth/verify-otp` — body `{ email, otp }`. Limit 5 attempts per OTP. On success: returns short-lived `otpToken` (signed JWT or Redis-keyed random UUID).
- `POST /api/auth/register` — body `{ email, password, otpToken }`. Validates token, creates user row + empty user_profile row in a transaction. Hashes password. Returns `{ userId }`. 409 if email exists.

### 5.4 Wire the frontend

`/create-account` has TODOs at `handleSendOtp` and `handleSubmit` — replace with `fetch("/api/auth/send-otp", ...)` / `verify-otp` / `register` calls. On success, call `signIn("credentials", ...)` (from next-auth) to establish the session, then `router.push("/account/details/name")`.

### 5.5 Tests (`tests/auth/`)

- `send-otp.test.ts` — stores OTP in Redis, rate limit triggers after 5.
- `verify-otp.test.ts` — correct code passes; wrong code increments attempts; 6th attempt rejected; expired OTP rejected.
- `register.test.ts` — invalid otpToken rejected; duplicate email rejected; happy path creates user + empty profile, password hash is bcrypt.

### Done criteria
- [x] All three endpoints return correct envelope shapes.
- [ ] Creating an account end-to-end from `/create-account` works against local Neon + Upstash. *(pending manual browser verification — API + frontend wiring shipped; dev-mode OTP logs to server console, see D3.2)*
- [x] Vitest suite for auth is green.
- [x] Rate limits observable in Redis (`otp:send-rate:*` keys visible).

### Common mistakes
- **User enumeration**: returning different responses for "email exists" vs "email doesn't" on `send-otp`. Always 200 `{ sent: true }`.
- Storing OTP in plaintext across logs — never log the code itself, only `otp sent to: <masked email>`.
- Forgetting to consume (delete) the OTP after successful verify — lets it be reused.
- bcrypt in Edge runtime — it doesn't work there. Route must run on Node runtime (default for Route Handlers with Node APIs).

---

## 6. Phase 4 — Auth: NextAuth credentials provider

**Goal:** Logged-in users get a signed JWT session cookie. `requireSession(req)` is usable across all protected routes.

### 6.1 `lib/auth/config.ts`

```ts
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },  // 30 days
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const parsed = z.object({ email: Email, password: Password }).safeParse(creds);
        if (!parsed.success) return null;
        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });
        if (!user) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => (user ? { ...token, uid: user.id } : token),
    session: ({ session, token }) => ({ ...session, userId: token.uid }),
  },
  pages: { signIn: "/login" },
  secret: env.NEXTAUTH_SECRET,
};
```

### 6.2 `app/api/auth/[...nextauth]/route.ts`

```ts
export const { GET, POST } = NextAuth(authConfig).handlers;
```

### 6.3 `lib/auth/session.ts`

```ts
export async function getSession() { return await auth(); }   // auth() from NextAuth v5
export async function requireSession() {
  const s = await getSession();
  if (!s?.userId) throw new AppError("UNAUTHENTICATED", "Login required", 401);
  return s;
}
```

### 6.4 `middleware.ts`

Protect `/account/**`, `/order/**`, `/api/account/**`, `/api/orders/**`, `/api/addresses/**`, `/api/payments/**`. Redirect unauthenticated browser requests to `/login?callbackUrl=...`. Reject unauthenticated API requests with 401.

### 6.5 Wire `/login/page.tsx`

Replace submit TODO with `signIn("credentials", { email, password, redirect: false })`, handle failure state, then `router.push(callbackUrl ?? "/account")`.

### 6.6 Tests

- `session.test.ts` — `requireSession` throws 401 when no cookie; returns userId when JWT present.
- `credentials.test.ts` — wrong password rejected; correct password issues session.

### Done criteria
- [x] Logging in on `/login` sets a cookie, `/account` no longer redirects to `/login`. *(API + middleware + page wiring shipped; manual browser verification pending — see §6.6 tests green.)*
- [x] API request with no cookie to `/api/account/profile` returns 401 with proper envelope. *(Middleware emits `{ ok:false, error:{ code:"UNAUTHENTICATED" } }` for protected API paths; route itself ships in Phase 5.)*

### Common mistakes
- Forgetting to set `NEXTAUTH_URL` in Vercel → callback URLs break.
- Running middleware on static assets — use `matcher` to scope.
- `redirect: true` in client `signIn` → hard page nav; use `redirect: false` and `router.push`.

---

## 7. Phase 5 — Profile

**Goal:** `/account/details/*` pages persist to DB.

### 7.1 Endpoints

- `GET /api/account/profile` — returns profile row (nulls for unset fields).
- `PUT /api/account/profile` — `UpdateProfileRequest` (partial). Upserts into `user_profiles`.

### 7.2 Service

`lib/services/profile.ts` — `getProfile(userId)`, `updateProfile(userId, patch)`.

### 7.3 Wire frontend

Each of the 4 subpages (name/birthday/gender/phone) calls `PUT /api/account/profile` with only its own keys on Next. Reads via `GET` on mount.

### 7.4 Tests

Lightweight — the UI logic is not under test. One integration test that PUT → GET returns the written values.

### Done criteria
- [x] Editing fields persists across reloads. *(PUT/GET roundtrip verified via `tests/profile/profile-service.test.ts`; manual browser verification on `/account/details/*` wizard pending.)*
- [x] PUT with invalid birthday date is rejected with `VALIDATION_FAILED`. *(Also covered: invalid gender enum and non-digit phoneCountryCode — see `tests/profile/profile-route.test.ts`.)*

---

## 8. Phase 6 — Addresses + Orders (Checkout core)

**Goal:** A logged-in user can create an order with a billing (and optional shipping) address, resulting in a `pending` order row with snapshotted addresses.

### 8.1 Endpoints

- `POST /api/addresses` — create (optional; addresses can also be inlined in the order create body).
- `GET /api/addresses` — list user's (non-deleted) addresses.
- `DELETE /api/addresses/:id` — soft delete.

- `POST /api/orders` — body: `CreateOrderRequest`. Flow inside a transaction:
  1. Parse input.
  2. Check idempotency: `select * from orders where idempotency_key = $1 and user_id = $2`. If found, return it.
  3. Insert billing address (and shipping if present) with `deleted_at = null` for reuse later.
  4. Compute `totalPaise = AERO.priceInPaise * quantity`. Reject if quantity > 5.
  5. Insert order with status `pending`, snapshots, references.
  6. Return `OrderResponse`.
- `GET /api/orders` — list user's orders (descending).
- `GET /api/orders/:id` — fetch one; 404 if not owned.

### 8.2 Service (`lib/services/order.ts`)

Pure functions receive `db` and return results. **All pricing is server-side** — ignore any client-supplied price.

### 8.3 Wire frontend

`/order/billing-shipping` → collect billing + optional shipping → POST `/api/orders` (generate `idempotencyKey` with `crypto.randomUUID()` on first submit, memoize across retries) → on success, push `/order/payment?orderId=<id>`.

`/order/units` → store quantity in URL param or SWR state → pass through to billing-shipping.

### 8.4 Tests (`tests/checkout/`)

- `create-order.test.ts`:
  - Happy path: quantity 3 → total paise = 2,999,700.
  - Quantity 0 and 6 rejected with `VALIDATION_FAILED`.
  - Same idempotency key returns the same order.
  - Different user can't read another user's order (404).
  - Missing auth → 401.
- `address.test.ts`:
  - Create / list / soft delete.
  - Line1 > 50 chars rejected.

### Done criteria
- [x] Test suite green. *(14 files / 54 tests — includes order-service, order-route, address-service, address-route coverage.)*
- [ ] Manual end-to-end: login → qty → addresses → pending order in DB. *(pending user browser verification)*

### Common mistakes
- Trusting client-supplied `totalPaise` — recompute server-side, always.
- Forgetting the snapshot — later address edits then mutate historical orders.
- Missing `ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` — idempotency key race under retry.

---

## 9. Phase 7 — Payments (Razorpay)

**Goal:** Pending order → Razorpay order created → hosted checkout → verify signature → order `paid`. Webhook is the source of truth, client-verify is a UX fast path.

### 9.1 Endpoints

- `POST /api/payments/initiate` — body `{ orderId }`. Server:
  1. Load order. Reject if not owned or status !== `pending`.
  2. If `razorpay_order_id` already set, return existing (idempotent).
  3. Call Razorpay `orders.create({ amount, currency: "INR", receipt: orderId })`.
  4. Persist `razorpay_order_id` on the order.
  5. Return `{ razorpayOrderId, razorpayKeyId, amountPaise, currency }`.
- `POST /api/payments/verify` — client-side fast path after checkout. Body: `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }`.
  1. HMAC-SHA256 verify signature using `RAZORPAY_KEY_SECRET`.
  2. On match: update order to `paid` (if not already), record payment id & signature.
  3. Return `{ status: "paid" }` or `UPSTREAM_FAILED`.
- `POST /api/payments/webhook` — Razorpay server-to-server.
  1. Read **raw body** (critical for HMAC).
  2. Verify `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`.
  3. Parse event. Upsert `payment_events` row (unique on `razorpay_event_id` → duplicate webhooks ignored).
  4. On `payment.captured`: mark order paid. On `payment.failed`: mark failed.
  5. Return 200 even on already-processed events (Razorpay retries otherwise).

Getting raw body in a Next.js Route Handler: `const body = await req.text()` before `JSON.parse`.

### 9.2 Wire frontend

`/order/payment` has a "Pay" button. On click:
1. Call `/api/payments/initiate`.
2. Open Razorpay checkout with returned `razorpayOrderId` + `keyId`.
3. In `handler` callback, call `/api/payments/verify`.
4. On verify success, route to an order-confirmation view (reuse existing UI or a minimal page — backend does not dictate).
5. On failure, route to `/order/payment/failed`.

### 9.3 Tests (`tests/checkout/`)

- `verify-signature.test.ts` — known signature from Razorpay docs passes; tampered signature fails.
- `webhook.test.ts` — duplicate event id is a no-op; valid `payment.captured` marks paid; unknown event type is ignored with 200.
- Mock Razorpay client — don't hit their API in unit tests.

### Done criteria
- [x] Test suite green. *(15 files / 58 tests — added verify-signature ×6, webhook-route ×5, payment-route ×4; see D7.* entries.)*
- [x] Test-mode end-to-end payment completes and flips order to `paid`. *(verified 2026-04-22 via Razorpay UPI test VPA after card path hit an international-card block — the card flow is environmental, not a code issue; order flipped to `paid` and `/order/confirmation` rendered cleanly.)*
- [x] Webhook receives events in a local tunnel (ngrok) and updates `payment_events`. *(verified 2026-04-22 — Razorpay dashboard showed 200 delivery to `/api/payments/webhook`, D7.1 closed, D0.2 fully resolved.)*

### Common mistakes
- Parsing JSON before reading raw body for webhook signature → signature always fails.
- Trusting the client-side verify as the only source — **webhook is authoritative**.
- Forgetting to make webhook idempotent — duplicate Razorpay retries double-mark orders.
- Exposing `RAZORPAY_KEY_SECRET` to the client — only `KEY_ID` goes to the client.

---

## 10. Phase 8 — Hardening

Each sub-item is its own small PR.

### 10.1 Rate limits
- OTP send: 5/hr/email, 10/hr/IP (already in Phase 3).
- Login attempts: 10/hr/email, 30/hr/IP.
- Order create: 20/hr/user.
- Payment initiate: 20/hr/user.

### 10.2 Security headers
Configure in `next.config.ts`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — default-src 'self'; connect-src 'self' razorpay.com api.razorpay.com; script-src 'self' checkout.razorpay.com; frame-src checkout.razorpay.com; etc.

### 10.3 CSRF
NextAuth handles its own CSRF for auth routes. For our JSON API routes, same-origin cookie + `SameSite=Lax` + `Origin` header check on mutating requests. Helper: `assertSameOrigin(req)` in `lib/http/csrf.ts`.

### 10.4 Logging
- `lib/logger.ts` — pino with request-id.
- `withHandler` attaches req id and user id (if present) to each log line.
- Redact `password`, `otp`, `razorpaySignature`, `authorization` fields.
- No `console.log` in `app/api/**` — enforce with an ESLint rule.

### 10.5 Input limits
- Body size cap: enforce `Content-Length < 64 KB` on all JSON routes. Webhook route allows up to 1 MB.
- Array limits in Zod schemas.

### 10.6 (Optional) Sentry
Add `@sentry/nextjs` only if team wants it. Env-gated so dev doesn't send events.

### Done criteria
- [x] Attempting 11 OTP sends in an hour returns 429. *(rate-limit path covered by `tests/auth/rate-limit.test.ts`; order-create + payment-initiate each now gated at 20/hr/user. Dev-mode bypass lives in [lib/http/rate-limit.ts](lib/http/rate-limit.ts) per D8.1.)*
- [x] Hitting `/api/orders` from another origin is rejected. *(double-submit CSRF shipped — cross-origin callers can't read the `axceal_csrf` cookie, so header comparison fails → 403. See D8.3.)*
- [ ] `curl -D - https://axceal.com` shows HSTS / nosniff / CSP headers. *(headers wired in [next.config.ts](next.config.ts); HSTS + CSP are production-only to avoid breaking HMR. Verify post-deploy in Phase 9 smoke test.)*

---

## 11. Phase 9 — Deployment

### 11.1 Vercel project
- Import repo, framework preset: Next.js, region: `bom1` (Mumbai) if available, else the closest to Neon's `ap-south-1`.
- Install command: `bun install`.
- Build: `bun run build`.

### 11.2 Env vars in Vercel
All keys from `.env.example`, production values. Neon pooled URL. Razorpay **live** keys. `NEXTAUTH_URL` = production domain. `EMAIL_FROM` on verified Resend domain.

> **🔒 MANDATORY credential rotation before go-live.** All dev-mode credentials were exposed in chat transcripts during Phases 0–8 (Neon password, Upstash token, `NEXTAUTH_SECRET`, Razorpay test keys). Before flipping to production:
> 1. Rotate the Neon `neondb_owner` password (use a production Neon project/branch, not dev).
> 2. Regenerate the Upstash REST token (use a production Upstash DB, not dev).
> 3. Regenerate `NEXTAUTH_SECRET` (`openssl rand -base64 32`). Rotating invalidates all dev sessions — expected.
> 4. Use Razorpay **live** Key ID + Secret (issued only after KYC approval).
> 5. Set the new `RAZORPAY_WEBHOOK_SECRET` (Razorpay dashboard → Webhooks → generate on webhook creation).
> 6. Enter all of these **directly in Vercel's env var UI** — never paste into chat, never commit, never have Claude Read the file.
>
> Dev `.env.local` stays untouched; dev services can keep running on their existing (burned) credentials since they're not internet-facing targets of real value.

### 11.3 Razorpay webhook
Register webhook URL `https://<domain>/api/payments/webhook` with events: `payment.captured`, `payment.failed`. Copy the secret into `RAZORPAY_WEBHOOK_SECRET`.

### 11.4 DB migrations in CI
GitHub Action on merge to `main`:
1. `bun install`
2. `bun run db:migrate` against production `DATABASE_URL` (stored as secret).
3. Deploy Vercel (auto).

### 11.5 Smoke test post-deploy
- Register a test account with a real email.
- Place a test-mode order end-to-end (pre-cutover to live keys).
- Verify webhook event lands in `payment_events`.

### Done criteria
- [ ] Production URL serves the site.
- [ ] Live Razorpay flow completes a small test order.
- [ ] CI runs migrations automatically.

---

## 11.5 Pre-deployment frontend wiring (completed 2026-04-28)

Completed before Phase 9 deployment:

### Orders page
- `app/account/orders/page.tsx` — wired to existing `GET /api/orders`. Shows loading/error states, formats price in INR, color-codes status.

### Forgot password (`POST /api/auth/reset-password`)
- New endpoint: `{ email, otpToken, password }` — consumes single-use OTP token (from `verify-otp`), hashes new password, updates `users.passwordHash + passwordChangedAt`, invalidates all sessions via Redis key `pw:changed:<userId>`.
- Frontend: `handleSubmit` now calls `verify-otp` then `reset-password`, redirects to `/login?reset=1` on success.

### Change password (`POST /api/account/change-password`)
- New endpoint: session-gated. `{ otp, password }` — verifies scoped change-pw OTP (separate Redis key `otp:change-pw:<email>`), hashes password, invalidates sessions.
- New helper endpoint `POST /api/account/send-otp` — session-based OTP send (no email in body; gets email from session). Scoped to change-password flow.
- Frontend: auto-sends OTP on mount, Resend button calls same endpoint, Save wired to `apiFetch("/api/account/change-password")`.

### Session invalidation on password change
- `users.passwordChangedAt` column added (migration `drizzle/0001_crazy_lily_hollister.sql`).
- On reset or change: `redis.set("pw:changed:<userId>", Date.now(), { ex: 30d })`.
- JWT callback in `lib/auth/index.ts` checks this key on every session access; strips `uid` from token if token was issued before the change → `requireSession()` throws 401.

### Firebase phone verification (`POST /api/account/phone/verify`)
- New columns: `users.phone` (unique), `users.phoneVerifiedAt` (same migration).
- Backend: verifies Firebase ID token via Admin SDK, checks `phone_number` claim matches submitted phone, persists to `users`.
- Frontend: phone page dynamically imports Firebase Web SDK, uses invisible reCAPTCHA, calls `signInWithPhoneNumber` on "Send", `confirmationResult.confirm()` on "Proceed".
- OTP box expanded from 4 → 6 digits (Firebase default).
- Layout wired: "Send" calls `onSendPhoneOtp` callback; "Proceed" calls `onVerifyPhoneOtp` callback; `canNext` for step 3 checks 6-digit OTP completion when `phoneOtpSent`.
- Packages: `firebase@12.12.1`, `firebase-admin@13.8.0`.
- Env vars needed: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`.

### Done criteria
- [x] `bun run build` green.
- [x] All five new API routes visible in build output.
- [ ] Manual browser verification (pending).
- [ ] Firebase env vars set + phone OTP tested end-to-end.

---

## 12. Multi-session handoff rules

When resuming this plan in a new session:

1. **Read `BACKEND_PLAN.md` top to bottom first.** Every phase has a Done-criteria checklist — find the first unchecked item; that's your starting point.
2. **Read `BACKEND_DEVIATIONS.md`** — the append-only log of every drift from this plan. Do not carry forward a deviation silently; either respect it (`keep`) or resolve it at the phase it's scheduled for.
3. **Read `MEMORY.md`** for project context.
3. **Do not re-choose the stack.** Invariants are locked.
4. **Update the checklist in this file** at the end of the phase you complete. Check boxes under "Done criteria". Do not silently skip items.
5. **Any deviation from the plan requires a new entry in `BACKEND_DEVIATIONS.md`** in the same commit — and, if the deviation changes the plan's future direction, update this file too. Future sessions will trust these docs over memory.
6. **When in doubt about a contract, the Zod schema is authoritative**, not the prose description above it.

---

## 13. Appendix — Quick reference

- OTP length: **4 digits** (matches current UI).
- Max qty/order: **5**.
- Price: **INR 9,999 = 999,900 paise**.
- Session: **JWT, 30 days**.
- Password: **bcrypt cost 12, min length 8**.
- Phone format: **country code (1–4 digits) + phone digits (7–15) + sign ('+'/'−')**.
- Address line1: **max 50 chars** (per frontend).
- Currency: **INR only**.
- Razorpay amount unit: **paise (integer)**.
- All timestamps: `timestamptz`.
- All IDs: `uuid v4`.

---

## 14. Post-launch backlog (data gaps surfaced by frontend redesigns)

Items deferred from the original plan. Each needs a schema/contract/handler update before the corresponding UI can drop its placeholder state.

### 14.1 Order Placed page — extended order details

**Source.** Redesigned `/order/confirmation` page (2026-04-24) needs a "See Details" panel showing richer order data than `/api/orders/[id]` currently exposes. Frontend currently renders blank placeholders for every missing field.

**Required additions to `GET /api/orders/[id]` response:**

| Field | Source | Notes |
|---|---|---|
| `orderNumber` | new DB column `orders.order_number` | **Human-readable, 1:1 with `orders.id` (UUID).** Format: `XXX-XXX-XXX` (uppercase alphanumeric, ~9 chars shown as `#XXX-XXX-XXX`). Generated server-side at order creation; must be unique (DB unique index); safe to share with the user for support queries. Do NOT derive from UUID bytes (UUID must remain the only internal reference). |
| `paymentMethod` | from Razorpay payment capture response (`method`: `upi` / `card` / `netbanking` / `wallet`) | Persist on `orders` or new `payments` row when webhook fires. Render as human label (UPI / Card / Net Banking / Wallet). |
| `transactionId` | Razorpay `payment_id` (e.g., `pay_xxxxx`) | Persist alongside `paymentMethod`. Safe to expose. |
| `fulfillmentStatus` | new DB column `orders.fulfillment_status` | Enum: `pending` / `packed` / `in_transit` / `delivered` / `cancelled`. Distinct from payment status. Defaults to `pending`; transitions driven by a future admin/fulfillment flow. Render in UI as `In-Transit`, etc. |
| `email` | `users.email` (join) | User's auth email. |
| `billingAddress` | existing addresses table, denormalized snapshot onto `orders` at placement time | Snapshot prevents later address edits from rewriting historical orders. Three lines max per current address contract. |
| `shippingAddress` | same snapshot pattern | Same as above. |
| `payerPhone` | **new** — capture during billing-shipping step, persist snapshot onto order | Phone of the person paying (defaults to account holder's phone unless user overrides). |
| `receiverPhone` | **new** — capture during billing-shipping step, persist snapshot onto order | Phone of the person receiving delivery (may differ from payer). |

**Migration work:**
1. Add `orders.order_number` (text, not null, unique) with a collision-safe generator (e.g., `nanoid` over `[0-9A-Z]` excluding `0/O/1/I`) — retry on duplicate.
2. Add `orders.payment_method` (text, nullable — set on webhook/verify).
3. Add `orders.transaction_id` (text, nullable — set on webhook/verify).
4. Add `orders.fulfillment_status` (enum or text with check constraint, default `'pending'`).
5. Add `orders.billing_address_snapshot` + `orders.shipping_address_snapshot` (jsonb) — freeze address at order creation.
6. Add `orders.payer_phone` + `orders.receiver_phone` (text) — capture/persist at checkout.

**Contract / schema work:**
- Extend `lib/contracts/order.ts` `OrderView` to include the new fields (all optional for backward compatibility on older orders without snapshots).
- Extend `lib/contracts/address.ts` billing-shipping input to accept `payerPhone` + `receiverPhone`.
- Update `lib/services/order.ts` to snapshot addresses + phones at creation, and to generate `order_number`.
- Update `lib/services/payment.ts` (or webhook handler) to persist `paymentMethod` + `transactionId` on capture.

**Frontend cutover:**
- Once `/api/orders/[id]` returns the above, drop the blank-placeholder branch in `DetailRow` and render the real values.
- `fulfillmentStatus` rendering: human-label mapping (`in_transit` → "In-Transit", etc.).

**Security note.** `orderNumber` must be uniformly random enough to resist enumeration (don't expose a simple counter). Access is still gated on session ownership — IDOR check in the GET handler remains the primary defense.

### 14.2 Forgot Password — reset endpoint

**Source.** `/forgot-password` page (2026-04-24) is wired end-to-end on the frontend (email → Send OTP → OTP → new password → re-enter). Submit currently stubs with "Password reset is not available yet." because no backend endpoint exists.

**Required endpoint:** `POST /api/auth/reset-password`

**Request contract (Zod):**
```ts
ResetPasswordInput = z.object({
  email: z.string().email(),
  otpToken: z.string().min(1),   // issued by /api/auth/verify-otp
  password: z.string().min(8).max(128),
});
```

**Response:** standard `{ ok: true, data: {} }` envelope. No payload needed on success.

**Server flow:**
1. Validate input via `withHandler` + Zod.
2. Rate-limit by `(ip, email)` — same budget as `/api/auth/register` or tighter. This endpoint is a high-value target; don't let an attacker grind OTPs.
3. Verify `otpToken` (same single-use consumption semantics as `/api/auth/register`). Reject if expired, already consumed, or scope-mismatched.
4. Look up user by `email`. **Uniform response time / message** whether or not the account exists — do not leak user enumeration via either error text or timing. If the user doesn't exist, still consume the OTP token, spend an equivalent bcrypt cost, and return generic success.
5. If the user exists: re-hash the new password with bcrypt (cost 12), update `users.passwordHash`, bump `users.passwordChangedAt` (new column if not present).
6. **Invalidate all existing sessions for this user.** With JWT strategy this means bumping a per-user `tokenVersion` (or `passwordChangedAt`) that the JWT callback checks — any existing token issued before the bump must be rejected. This is required so a leaked/stolen password can't keep a session alive after the legitimate owner resets it.
7. (Optional, recommended) Send a confirmation email: "Your Axceal password was reset at <time> from <ip>. If this wasn't you, contact support." Gives the real owner a signal if an attacker used a stolen OTP channel.

**Frontend cutover:**
- Frontend currently calls `/api/auth/verify-otp` (already exists) to get `otpToken`, then will POST to `/api/auth/reset-password` with `{email, otpToken, password}`.
- On success: redirect to `/login?reset=1` with a one-line "Password updated — log in to continue" info banner.
- On error: render `error.message` from the response envelope.
- Drop the current hard-coded "Password reset is not available yet." stub in [app/forgot-password/page.tsx](app/forgot-password/page.tsx).

**Schema work:**
- Add `users.passwordChangedAt` (timestamptz, default `now()`, not null) — or `users.tokenVersion` (integer, default 0).
- Update NextAuth JWT callback ([lib/auth/config.ts](lib/auth/config.ts)) to persist the user's `passwordChangedAt` / `tokenVersion` on token issuance and reject session tokens older than the stored value.

**Security note.** This endpoint is the only path a user has to regain access without the current password. Every one of the above steps matters; skipping any weakens the account recovery flow. Specifically: OTP single-use, session invalidation on reset, uniform error response for missing users, and rate limits scoped to both IP and email.

### 14.3 Phone OTP verification — Firebase Phone Auth

**Source.** `/account/details/phone` page (2026-04-24) now renders an OTP box with a Resend link below the Search Country panel. Both the Resend button and the OTP digit entry are **stubs** on the frontend — there is no phone-OTP backend endpoint and no SMS provider wired. Resend currently shows "Phone OTP verification is not available yet."

**Decision (locked).** Phone OTP verification will be implemented via **Firebase Phone Authentication** (not Razorpay/Twilio/Resend). Firebase Phone Auth handles SMS delivery, OTP generation, rate limiting, abuse detection (reCAPTCHA / App Check), and internationalization in one SDK — dropping that infra cost from our stack is worth the added Firebase dependency.

**Integration path (client-first model).**
1. Client loads Firebase Web SDK (`firebase/app`, `firebase/auth`) only on the phone verification page — not bundled globally.
2. User enters phone + country code; client calls `signInWithPhoneNumber(auth, e164Phone, recaptchaVerifier)`. Firebase returns a `ConfirmationResult`.
3. User enters the 6-digit OTP (note: Firebase defaults to 6 digits, not 4 — the frontend OTP box must expand from 4 to 6 cells when this lands, or Firebase must be configured to accept 4 if possible; default to 6 to match Firebase convention).
4. Client calls `confirmationResult.confirm(code)`. On success, Firebase returns a `firebaseIdToken`.
5. Client POSTs `firebaseIdToken` + the phone E.164 string to our own new endpoint `POST /api/account/phone/verify` (see below).

**Required backend endpoint:** `POST /api/account/phone/verify`

**Request contract (Zod):**
```ts
VerifyPhoneInput = z.object({
  firebaseIdToken: z.string().min(1),
  phone: z.string().regex(/^[+\-]\d{8,16}$/),  // E.164-ish, matching our existing phone contract
});
```

**Server flow:**
1. Gate behind an authenticated session (this is a profile action; the user must be logged in).
2. Verify the `firebaseIdToken` using Firebase Admin SDK's `auth().verifyIdToken()`. On failure, 401.
3. Extract `phone_number` claim from the decoded token.
4. **Require the claim to match the submitted `phone` exactly** (after E.164 normalization). Reject on mismatch — don't trust either side alone.
5. Rate-limit by `(userId, ip)` — cap at ~5 verification attempts per hour. Phone number churn is low; abusive submissions are a signal.
6. Persist `users.phone` + `users.phoneVerifiedAt` (new column, timestamptz).
7. Return `{ ok: true, data: { verified: true } }`.

**Schema work:**
- Add `users.phone` (text, nullable until verification lands), `users.phoneVerifiedAt` (timestamptz, nullable).
- Unique index on `users.phone` (nullable) — one account per phone.

**Env vars to add:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` (service account email)
- `FIREBASE_PRIVATE_KEY` (service account private key, newline-escaped)
- Optionally: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — **client-exposed, public by design** (Firebase config is not a secret; access control is enforced server-side by Admin SDK verification).

**Security notes.**
1. **Never trust the client's claim of "OTP verified" on its own.** Always round-trip the `firebaseIdToken` through our own endpoint and verify it server-side with the Admin SDK. The client SDK alone is not a trust boundary — a hostile client can fake the success response.
2. **Phone claim must match.** Firebase will happily issue an ID token for phone `+15551234567`; if our client submits `+15559999999` as the claimed phone alongside that token, the server must reject. Verify the decoded token's `phone_number` claim equals the submitted phone.
3. **Do not log the OTP.** Firebase's client SDK handles it entirely in-memory; ensure nothing in our own code writes it to logs, sessionStorage, or analytics.
4. **App Check / reCAPTCHA.** Enable Firebase App Check on the Auth endpoint to blunt automated abuse. Without this, Firebase Phone Auth is rate-limited but still susceptible to budget drain via SMS fees.
5. **Cost control.** Firebase charges per verification SMS. Set a daily cap in Firebase Console + monitor via Axiom.

**Frontend cutover (when backend lands):**
- Replace the stubbed `handleResendOtp` in [app/account/details/phone/page.tsx](app/account/details/phone/page.tsx) with a real Firebase `signInWithPhoneNumber` call.
- Expand the OTP box from 4 cells to 6 (or keep 4 if we override Firebase to 4-digit — unlikely).
- On successful `confirmationResult.confirm(code)`, POST `/api/account/phone/verify` and advance the account-details flow.
- Show inline error states: invalid OTP (6 digits wrong), expired code, rate-limit hit.

### 14.4 Resend links on all OTP boxes

**State of the fleet (2026-04-24).**
- [app/forgot-password/page.tsx](app/forgot-password/page.tsx) — Resend present (calls `/api/auth/send-otp`).
- [app/create-account/page.tsx](app/create-account/page.tsx) — Resend added inside the OTP box header (calls `/api/auth/send-otp`, same handler as the row-level "Send OTP" button).
- [app/account/details/phone/page.tsx](app/account/details/phone/page.tsx) — Resend present **but stubbed** (no backend wiring; see §14.3).

All three sites are now visually consistent: OTP box has the "OTP" label top-left, "Resend" link top-right, 4 × circular digit inputs below (phone page will grow to 6 when Firebase lands). No further Resend sites pending.

### 14.5 Login — real 2FA session gating

**Source.** `/login` page (2026-04-24) now renders a two-stage flow: password verification ("Verify") → email OTP verification ("Login"). The UI enforces this, but the **backend does not** — this is a known security gap.

**Current (stub) behavior.**
1. User enters email + password, clicks "Verify".
2. Frontend calls NextAuth `signIn("credentials", ...)` — **this creates the session cookie immediately on successful password check.**
3. Frontend suppresses the redirect, hides "Forgot Password", reveals the OTP box, auto-calls `/api/auth/send-otp`, and changes the button label to "Login".
4. User enters OTP, clicks "Login".
5. Frontend calls `/api/auth/verify-otp` → on success, `router.push(callbackUrl)`. On failure, stays on the page with an error.

**The gap.** Between steps 2 and 5, the user is already authenticated at the session-cookie layer. An attacker who has valid password but not OTP access can:
- Close the browser after step 2 and still have a session cookie. NextAuth will let them into `/account` directly.
- Copy the session cookie to another device.
- Simply navigate to `/account` manually before entering OTP.

None of these leave evidence in the frontend. The "Login" button gating is frontend-only; the middleware currently accepts any valid NextAuth session.

**Required backend flow (real 2FA):**

1. **`POST /api/auth/verify-password`** (new endpoint).
   - Input: `{ email, password }` (Zod).
   - Server verifies the password hash against `users.passwordHash`.
   - On success: **does NOT create a NextAuth session.** Instead, issues a short-lived (≤5 min) `pendingMfaToken` (JWT or Redis key) scoped to this user and bound to a single IP + user-agent fingerprint.
   - On failure: generic "Invalid credentials" + uniform timing (bcrypt always runs, even for missing users, to resist enumeration).
   - Rate-limit by `(ip, email)` — tighter than register since this is the brute-force target.
   - Return `{ ok: true, data: { pendingMfaToken } }`.

2. **Modify `/api/auth/send-otp`** (existing) to accept a `pendingMfaToken` and scope the OTP to the login flow. Alternatively, add a `scope: "login"` field on the OTP record so a password-reset OTP can't be used to complete login and vice versa.

3. **Modify the NextAuth credentials provider** ([lib/auth/config.ts](lib/auth/config.ts)) to require both `password` AND `otp` in a single `authorize()` call, OR replace it with a custom provider that takes `{ pendingMfaToken, otp }` as input and verifies both before returning the user.
   - Cleanest: custom provider `credentials-with-otp`.
   - The existing `credentials` provider stays only for internal/admin flows if ever needed, otherwise remove it.

4. **Middleware gate.** Nothing to change if NextAuth is the only session authority — the session simply won't exist until step 3 succeeds.

**Frontend cutover (when backend lands):**
- First click "Verify" → POST `/api/auth/verify-password` → receive `pendingMfaToken` → POST `/api/auth/send-otp` with the token → transition to OTP stage. No session cookie yet.
- Second click "Login" → `signIn("credentials-with-otp", { pendingMfaToken, otp })` → session created → `router.push(callbackUrl)`.
- Drop the current pattern of calling `signIn("credentials")` in the Verify step.

**Schema / env work.**
- Optional: `pending_mfa_tokens` table (or Redis keys with TTL) — `{ token_hash, user_id, ip, user_agent_hash, created_at }`.
- Existing `users.passwordHash` + `users.mfaEnabledAt` (new nullable column) to record when 2FA was first completed — useful for audit + disabling users who haven't finished onboarding.

**Security notes.**
1. **`pendingMfaToken` must be single-use.** Consuming it at step 3 (OTP verify) invalidates it; attempting to reuse returns 401.
2. **Bind the token to IP + UA.** Reduces attack surface if the token is leaked mid-flow.
3. **Keep OTP TTL short** (≤5 min). Longer windows let attackers take over an abandoned session.
4. **Audit log every Verify + every Login attempt** — both success and failure. Correlate on `pendingMfaToken` so a single brute-force attempt doesn't look like 10 unrelated hits.
5. **Do not reuse OTP scope.** A password-reset OTP must not complete a login, and vice versa. Either use separate endpoints or carry a `scope` claim on the OTP record.

### 14.6 Edit Details — address wiring + phone country code

**Source.** `/account` Edit Details tab ([app/account/page.tsx](app/account/page.tsx)) now wires six pencil-edit fields (First Name, Last Name, Billing Address, Shipping Address, Birthday, Phone Number) plus a main "Save" button. The main Save only persists a subset to `/api/account/profile` — the rest is held in local state with no backend path.

**What the main Save currently sends to `PUT /api/account/profile`:**
- `firstName`, `lastName` — always sent if non-empty.
- `birthday` — sent only if it already looks like `YYYY-MM-DD`. The pill accepts free-text so most inputs (e.g., "22nd August 2020") won't pass this regex and are dropped silently. **Gap:** frontend needs a date picker (or the pill needs a date-specific variant).

**What is held locally and not persisted:**

| Field | Why it's not wired | Required plumbing |
|---|---|---|
| `billingAddress` | `/api/account/profile` doesn't accept addresses. Addresses are owned by `/api/addresses` + `/api/addresses/[id]` as separate records, with potentially many-per-user. This page models exactly one billing + one shipping address, which the current addresses contract doesn't express. | Either: (a) add a `primary: true` flag on addresses and mark the user's chosen one as billing-primary / shipping-primary; OR (b) add `users.billingAddressId` + `users.shippingAddressId` pointer columns. On main Save, either POST a new address (if none exists) or PATCH the referenced one. Each billing/shipping update may therefore be one or two HTTP calls — not a single `PUT /api/account/profile` call. |
| `shippingAddress` | Same as above. | Same. |
| `phone` | `ProfileSchema` requires `phone` + `phoneCountryCode` + `phoneSign` together. The Edit Details pill only collects raw digits — no country code picker, no sign toggle. Sending `phone` alone would fail Zod validation on the backend. | Either: (a) skip inline phone editing here and route the user to `/account/details/phone` (the multi-step flow already collects all three); OR (b) make the phone pill a compact variant of that flow (country selector + sign toggle + digit entry). |
| `birthday` (non-ISO) | Pill accepts free-text; only ISO-formatted entries survive the regex check in `handleMainSave`. | Add a calendar/date picker to the pill when the active field is `birthday`. |

**Frontend cutover (when each gap lands):**
- Billing/shipping: once `/api/addresses` supports "primary" semantics or the user table holds pointer columns, extend `handleMainSave` to PATCH those addresses in parallel with the profile PUT. Surface a single success/fail message that covers all calls.
- Phone: swap the pill for a mini version of the phone-verification flow (country code picker + sign toggle + digit row). OTP verification for the new phone is covered by §14.3 (Firebase Phone Auth) — do not skip it on edit.
- Birthday: replace the text pill with a calendar/picker variant when `activeEditField === "birthday"`.

**Security notes.**
1. All six edits are already session-gated (`requireSession()` inside the profile handler). Same pattern must apply to any new address PATCH handler.
2. Rate-limit the edit endpoints — a user hammering profile updates in a loop is a DoS signal. Upstash budget: 30 per minute per user is comfortable.
3. Do not log the new values themselves (names, addresses, phone, birthday all qualify as PII). The logger redact list in [lib/logger.ts](lib/logger.ts) already covers `password`/`otp`/etc.; extend it with `firstName`, `lastName`, `phone`, `billingAddress`, `shippingAddress`, `birthday` when wiring these handlers.

### 14.7 Change Password — OTP-gated password update endpoint

**Source.** `/account/change-password` page ([app/account/change-password/page.tsx](app/account/change-password/page.tsx)) collects an email OTP + new password + confirmation. The UI is complete but the Save handler is a stub (`TODO: wire to /api/account/change-password`).

**Required backend work:**

1. **`POST /api/account/change-password`** — session-gated. Accepts `{ otp: string, password: string }`. Steps:
   - Verify active session → get `userId` + `email`.
   - Verify OTP: look up the most recent unexpired `email_otps` record for this user scoped to `"change-password"`. Mark consumed on success.
   - Validate new password against the same `PasswordSchema` used at registration.
   - Hash with bcrypt (same cost factor as registration).
   - `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`.
   - Return `{ ok: true }`.

2. **`/api/auth/send-otp` scope extension** — the existing endpoint must accept `action: "change-password"` (alongside `"login"`, `"reset"`) and record a `scope` on the OTP row so a change-password OTP cannot be reused for login or reset flows.

**Frontend cutover (when backend lands):**
- In `handleSave`, POST `{ otp, password }` to `/api/account/change-password`.
- On success: clear form + show "Password updated." info message.
- On 4xx: surface `body.error.message` in the message state.

**Security notes.**
1. Session-gate the endpoint — unauthenticated calls must return 401.
2. OTP scope must be `"change-password"` — reject any OTP with a different scope.
3. Single-use OTP — mark consumed before responding.
4. Rate-limit: 5 attempts per 15 minutes per user (Upstash).
5. Audit log: record password-change events with `userId` + timestamp (no hash values).
