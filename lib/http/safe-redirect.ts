// Validate a user-supplied redirect target. Returns the path verbatim only if
// it is a same-origin absolute path (`/foo`, not `//evil.com`, not
// `https://evil.com`, not `\\evil.com`). Otherwise returns the fallback.
//
// `startsWith("/")` alone is not sufficient — protocol-relative URLs like
// `//evil.com` also start with `/` and browsers treat them as cross-origin.
// `\` is normalized to `/` by some browsers in URL parsing, so reject it too.
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/\\")) return fallback;
  return raw;
}
