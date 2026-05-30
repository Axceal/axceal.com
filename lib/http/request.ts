import { AppError, ErrorCode } from "@/lib/http/errors";
import { env } from "@/lib/env";

// S10 — read only the configured trusted header (env.TRUSTED_IP_HEADER).
// Reading multiple headers (x-real-ip, x-forwarded-for, x-vercel-forwarded-for)
// silently fails open if any of them gets through unstripped from a misconfig.
// Pin one source per deployment, document it, fail closed if absent in prod.
export function getClientIp(req: Request): string {
  const raw = req.headers.get(env.TRUSTED_IP_HEADER);
  if (raw) {
    // x-forwarded-for-style headers can carry "client, proxy1, proxy2".
    // Take the rightmost entry (appended by the trusted proxy itself).
    const parts = raw.split(",");
    return parts[parts.length - 1].trim();
  }

  if (env.NODE_ENV === "production") {
    throw new AppError(
      ErrorCode.INTERNAL,
      "Client IP unavailable",
      500,
    );
  }
  return "unknown";
}
