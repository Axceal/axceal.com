import { CSRF_COOKIE, CSRF_HEADER } from "./csrf";

// ─── Client HTTP wrappers ────────────────────────────────────────────────────
// Two transports live in this codebase. Pick deliberately:
//
//   1. apiFetch (below) — for every /api/account/*, /api/orders/*,
//      /api/addresses/*, /api/payments/*, /api/validate-address request.
//      Reads the double-submit CSRF cookie + attaches the x-csrf-token header
//      on mutating methods. Required because middleware.ts enforces CSRF on
//      these PROTECTED_API routes.
//
//   2. Raw `fetch` from window — for /api/auth/* only (send-otp, verify-otp,
//      register, otp-login, verify-password, reset-password, login-otp).
//      These routes are CSRF-EXEMPT in middleware.ts because token-based
//      flows (OTP, pendingMfaToken) bind the request to an out-of-band proof
//      that CSRF can't supply. Attaching a CSRF header is harmless but the
//      route doesn't need it.
//
// Adding a new mutating route under /api/account/** → use apiFetch.
// Adding a new mutating route under /api/auth/** → use plain fetch (and add
// the path to CSRF_EXEMPT in middleware.ts if applicable).

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE);
    if (token) headers.set(CSRF_HEADER, token);
  }
  return fetch(input, { ...init, headers });
}
