import { AppError, ErrorCode } from "@/lib/http/errors";
import { env } from "@/lib/env";

export function getClientIp(req: Request): string {
  // x-real-ip is set by Vercel/nginx to the actual client IP and is not
  // user-spoofable; prefer it over x-forwarded-for.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Take the rightmost entry — appended by the trusted proxy, not the client.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    return parts[parts.length - 1].trim();
  }
  // No trusted IP source. In production this means a misconfigured deploy:
  // collapsing all traffic into a single "unknown" rate-limit bucket would let
  // one attacker fill the bucket and DoS every other user. Fail closed.
  if (env.NODE_ENV === "production") {
    throw new AppError(
      ErrorCode.INTERNAL,
      "Client IP unavailable",
      500,
    );
  }
  return "unknown";
}
