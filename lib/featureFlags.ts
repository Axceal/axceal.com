// Sales mode flag. Single source of truth for waitlist vs live checkout.
//
// `waitlist` — default. Pre-launch. Checkout blocked; CTA opens waitlist popup.
// `live`     — production post-launch. Normal purchase flow.
// `dev-live` — dev-only override that behaves like `live`. Rejected by
//              lib/env.ts when NODE_ENV=production to prevent shipping the
//              override flag accidentally.
//
// NEXT_PUBLIC_ prefix is required: both client components (CTA label) and
// server code (middleware, services) branch on it. The value is inlined at
// build time, so flipping requires a redeploy.

export type SalesMode = "waitlist" | "live" | "dev-live";

function parseMode(raw: string | undefined): SalesMode {
  if (raw === "live" || raw === "dev-live" || raw === "waitlist") return raw;
  return "waitlist";
}

export const SALES_MODE: SalesMode = parseMode(process.env.NEXT_PUBLIC_SALES_MODE);

export function isWaitlist(): boolean {
  return SALES_MODE === "waitlist";
}

export function isLive(): boolean {
  return SALES_MODE === "live" || SALES_MODE === "dev-live";
}
