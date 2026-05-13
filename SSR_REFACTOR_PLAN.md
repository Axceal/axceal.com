# SSR / RSC Refactor Plan

Five high-value pages converted from full client-fetch to React Server Component shells with minimal client islands.

---

## Why

| Metric | Before (CSR) | After (RSC) |
|--------|-------------|-------------|
| TTFB visible content | 600–1200 ms (JS → API → render) | 150–300 ms (server renders HTML) |
| JS bundle per page | includes fetch logic + state | islands only; no fetch plumbing |
| Auth redirect flash | visible blank → redirect | server redirects before byte 1 |
| SEO (home page) | empty shell on crawl | full HTML on first request |
| API calls from browser | N per page load | 0 for initial data |

---

## Stack Constraints (locked — do not change)

- Next.js 15 App Router (`app/`)
- `requireSession()` from `@/lib/auth/session` — works in RSC (uses `next/headers`)
- Drizzle + Neon HTTP — safe in RSC (no connection pooling needed)
- No transactions — sequential queries only
- Client islands: `"use client"` at component level, receive typed `initial` prop

---

## Pattern Applied to Every Page

```
RSC Page (server)
  ├── requireSession()          // hard redirect if no session
  ├── service call(s)           // DB → plain data object
  └── <ClientIsland initial={data} />   // "use client"
        ├── useState(initial)   // seed from prop
        └── mutation hooks      // still call API routes for writes
```

Rules:
1. RSC receives **no secrets** from DB — strip `passwordHash`, `otpToken`, session tokens before passing prop.
2. RSC page must set `export const dynamic = "force-dynamic"` — never statically cached.
3. Error thrown in RSC → Next.js `error.tsx` boundary — must NOT expose raw Postgres/service error.

---

## Page-by-Page Plan

### 1. `/account` — Account Dashboard

**Current:** client component, `useEffect` fetches `/api/account/me`, shows spinner.

**Target:**
```
app/account/page.tsx       → RSC
app/account/AccountShell.tsx  → "use client" island (existing animations)
```

**Steps:**
1. `page.tsx`: call `requireSession()`, query `users` table for profile row, pass to `<AccountShell initial={profile} />`.
2. `AccountShell.tsx`: accept `initial: UserProfile` prop, seed local state with it, remove `useEffect` fetch on mount.
3. Mutations (update profile, change password) still POST to API routes — no change needed there.
4. Delete `/api/account/me` GET handler if only this page consumed it (verify first with grep).

**Security (this page):**
- `requireSession()` in RSC prevents render entirely — no HTML emitted for unauthenticated users. Stronger than client redirect.
- Strip `passwordHash`, `phoneVerifiedAt`, `createdAt` from prop if not displayed — minimal surface.
- `dynamic = "force-dynamic"` prevents CDN caching of profile data.

---

### 2. `/account/orders` — Order History

**Current:** client component fetches `/api/account/orders`.

**Target:**
```
app/account/orders/page.tsx       → RSC
app/account/orders/OrderList.tsx  → "use client" island
```

**Steps:**
1. `page.tsx`: `requireSession()`, query `orders` table `where(eq(orders.userId, session.userId))` ordered by `createdAt desc`, pass array to `<OrderList initial={orders} />`.
2. `OrderList.tsx`: seed list from prop, retain any client-side filtering/pagination state.
3. Pagination: if using server-side pagination, read `searchParams` in RSC and pass `page` to query. If client-side, pass all rows (cap at 100).

**Security (this page):**
- IDOR enforced at RSC level: `where userId = session.userId` — same constraint as the API route, now one layer earlier.
- Never pass `razorpaySignature`, `idempotencyKey` in the prop — those are server-only columns.
- If order list grows large: add `LIMIT 100` in query, expose pagination via RSC `searchParams`.

---

### 3. `/account/view-details` — Profile Details

**Current:** client component fetches profile.

**Target:**
```
app/account/view-details/page.tsx     → RSC
app/account/view-details/ViewDetails.tsx → "use client" island (SvgText renders, edit triggers)
```

**Steps:**
1. `page.tsx`: `requireSession()`, fetch user row, pass `{ name, email, phone, phoneVerifiedAt }` to island.
2. Island renders SvgText segments server-fetched data — no loading state needed.
3. Edit flows (phone verify, name change) still go through API routes.

**Security (this page):**
- Only pass display fields in prop — never `id`, `passwordHash`, `signupSessionToken`.
- Phone number displayed: consider masking last 4 digits at RSC layer rather than client.

---

### 4. `/order/confirmation` — Post-Payment Confirmation

**Current:** client component reads query params, fetches `/api/orders/:id`.

**Target:**
```
app/order/confirmation/page.tsx         → RSC  (reads searchParams)
app/order/confirmation/ConfirmationView.tsx → "use client" island
```

**Steps:**
1. `page.tsx`: `requireSession()`, read `orderId` from `searchParams`, query `orders` where `id = orderId AND userId = session.userId`. If not found → `notFound()`.
2. Pass order data to `<ConfirmationView initial={order} />`.
3. Remove client-side order fetch.

**Security (this page):**
- IDOR check at RSC: `userId` constraint in query. No separate API call = one fewer IDOR surface.
- `notFound()` on miss (covers both missing order and wrong user) — same response shape, no enumeration.
- `razorpayOrderId`, `razorpayPaymentId` in DB: pass only if displayed to user. If used for "copy order ID" UI, pass `razorpayOrderId` only.
- Payment not completed but user lands here: check `status === "paid"` in RSC, redirect to `/` if not.

---

### 5. `/` — Home Page

**Current:** mostly static but any personalized section (e.g., "Welcome back, X") triggers client fetch.

**Target:**
```
app/page.tsx    → RSC, conditionally authenticated
```

**Steps:**
1. `page.tsx`: call `getSession()` (non-throwing variant) — if session exists, pass `{ name }` to hero section.
2. Static sections (hero, features, pricing) rendered as plain RSC — no JS for them.
3. Personalized greeting: rendered server-side into HTML — no client flash.
4. Keep `"use client"` on interactive sections (animations, CTA buttons) only.

**Security (this page):**
- Home is **not** a protected route — use `getSession()` not `requireSession()`.
- Do NOT pass `userId` or `email` into client props for home — only display name if needed.
- Static sections eligible for CDN cache: set `Cache-Control: public, max-age=3600` for those segments (use Next.js `generateMetadata` or route segment config). Authenticated greeting must come from a separate RSC segment marked `dynamic`.

---

## Shared Security Checklist (all pages)

### Auth & Session
- [ ] `requireSession()` called at top of every protected RSC page — before any DB query.
- [ ] RSC pages export `dynamic = "force-dynamic"` — no stale session data served from cache.
- [ ] Unauthenticated access → server redirect to `/auth?from=<path>` (not client-side redirect).

### Data Leakage via Props
- [ ] Prop types defined as `Pick<UserRow, "name" | "email" | ...>` — explicit allowlist, not the full DB row.
- [ ] Never pass: `passwordHash`, `otpToken`, `pendingMfaToken`, `signupSessionToken`, `razorpayKeySecret`.
- [ ] Verify with `JSON.stringify(props)` in dev: no unexpected fields in `__NEXT_DATA__`.

### IDOR
- [ ] Every RSC query scoped by `session.userId` — never trust ID from URL/searchParams alone.
- [ ] Pattern: `where(and(eq(table.id, paramId), eq(table.userId, session.userId)))`.

### Cache Headers
- [ ] Protected pages: `Cache-Control: private, no-store` (Next.js default for dynamic routes — verify not overridden).
- [ ] Home static segments: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
- [ ] Never cache a response that contains session-derived content on a shared CDN.

### Error Boundaries
- [ ] `app/account/error.tsx` and `app/order/error.tsx` exist — catch RSC errors.
- [ ] Error boundary renders generic "Something went wrong" — logs detail server-side via `logger.error`, never passes `err.message` to client.
- [ ] `notFound()` used for missing/unauthorized records — identical response for both cases (no enumeration).

### RSC → Client Prop Surface
- [ ] Client island props serialized to JSON in `__NEXT_DATA__` — treat as public. No secrets, no PII beyond what's visible on screen.
- [ ] Add `// [RSC-PROP] intentionally included` comment next to any field that looks sensitive but is intentionally exposed.

### CSRF
- [ ] RSC pages that render mutation forms: verify CSRF token still sent on form submit (client island handles this — double-check `x-csrf-token` header present in mutation hooks).
- [ ] RSC data-fetch path (server → DB) has no CSRF surface — document this explicitly so future devs don't add redundant CSRF on read-only server calls.

### Rate Limiting
- [ ] RSC reads are not rate-limited (server-side, no client-controlled path) — correct, no change needed.
- [ ] Mutation endpoints (API routes) retain existing rate limits — verify these are not accidentally bypassed after removing client fetch calls.

### Logging
- [ ] RSC errors caught and logged with `logger.error({ userId: session.userId, path }, err)` before rethrowing to error boundary.
- [ ] No `console.log` with user data in RSC — Vercel/Node logs are less controlled than pino redact pipeline.

---

## File Creation Order (avoid breaking dev)

1. Create `AccountShell.tsx` island (copy client logic from `account/page.tsx`)
2. Rewrite `account/page.tsx` as RSC — test locally
3. Repeat pattern for `orders`, `view-details`
4. Do `order/confirmation` — most security-critical (payment data)
5. Do home page last (lowest risk, most static)

Each page is independent — can be done in separate PRs.

---

## Definition of Done (per page)

- [ ] `tsc --noEmit` passes
- [ ] No `useEffect` fetch on mount in island (loading state gone)
- [ ] Network tab: 0 API GET calls on page load (only POST/PATCH for mutations)
- [ ] Unauthenticated direct URL → server redirect (verify in incognito)
- [ ] `__NEXT_DATA__` inspected: no secrets in serialized props
- [ ] `Cache-Control: private, no-store` in response headers for protected pages
- [ ] Error boundary exists and renders generic message on thrown RSC error
- [ ] `bun run build` passes (no RSC/client boundary violations)

---

## Migrations / Infra Required

None — this refactor is purely rendering-layer. No DB schema changes, no new env vars.

**Before deploy of each page:**
- Confirm `NODE_ENV=production` set in deployment env (no longer defaults — see F10.2).
- Run `bun run db:migrate` if `0002_perfect_ultimates.sql` not yet applied (F10.3).
