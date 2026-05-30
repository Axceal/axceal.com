// Typed sessionStorage registry. Centralises every key the client writes so
// renames / removals show up as TS errors instead of string-typo bugs.
//
// Usage:
//   import { sessionKeys, readSession, writeSession, clearSession } from "@/lib/sessionKeys";
//   writeSession(sessionKeys.pendingSignup, { signupSessionToken, from, issuedAt });
//   const pending = readSession(sessionKeys.pendingSignup);
//
// Reads parse JSON + run an optional shape guard. Failures clear the entry
// and return null so callers never need their own try/catch (F16.2 pattern).

export const sessionKeys = {
  pendingSignup: "pendingSignup",
  signupFrom: "signupFrom",
  forgotPwPrefilled: "fp:prefilled",
  orderIdempotencyKey: "order:idempotency-key",
} as const;

export type SessionKey = (typeof sessionKeys)[keyof typeof sessionKeys];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

// Reads + parses JSON. Returns null on missing / malformed entry. Optional
// `guard` runs a shape check; failing it clears the entry and returns null.
export function readSession<T>(
  key: SessionKey,
  guard?: (v: unknown) => v is T,
): T | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
  if (guard && !guard(parsed)) {
    window.sessionStorage.removeItem(key);
    return null;
  }
  return parsed as T;
}

// String-typed convenience for keys storing a single primitive string
// (e.g. signupFrom, idempotency UUID).
export function readSessionString(key: SessionKey): string | null {
  if (!isBrowser()) return null;
  return window.sessionStorage.getItem(key);
}

export function writeSession(key: SessionKey, value: unknown): void {
  if (!isBrowser()) return;
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  try {
    window.sessionStorage.setItem(key, payload);
  } catch {
    // Storage quota / private-mode block — caller can detect via readback.
  }
}

export function clearSession(key: SessionKey): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
