import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXTAUTH_SECRET: z.string().trim().min(32),
  NEXTAUTH_URL: z.string().url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  AXIOM_TOKEN: z.string().min(1).optional(),
  AXIOM_DATASET: z.string().min(1).optional(),

  // Twilio Verify — required for phone OTP verification
  TWILIO_ACCOUNT_SID: z.string().optional().transform(v => v || undefined),
  TWILIO_AUTH_TOKEN: z.string().optional().transform(v => v || undefined),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().transform(v => v || undefined),

  GOOGLE_ADDRESS_VALIDATION_API_KEY: z.string().optional().transform(v => v || undefined),

  // S10 — single source of truth for the trusted client-IP header. Default
  // matches Vercel ("x-real-ip") but a non-Vercel deploy must set this
  // explicitly (e.g. "cf-connecting-ip" for Cloudflare). Reading any other
  // header would let attackers spoof per-IP rate-limit buckets.
  TRUSTED_IP_HEADER: z.string().min(1).default("x-real-ip"),

  // No default — must be set explicitly. Defaulting to "development" was
  // dangerous: rate-limit, getClientIp, emailProvider, and CSRF cookie
  // `secure` flag all silently degrade to dev behaviour when NODE_ENV is
  // "development". A missing env in production would have let unauth'd
  // requests bypass every per-IP rate limit and printed OTPs to stdout
  // instead of emailing them. Fail-closed is safer than fail-open.
  NODE_ENV: z.enum(["development", "test", "production"]),

  // F16.10 — public site origin used by metadata / OG image URLs / sitemap /
  // robots / JSON-LD. NEXT_PUBLIC_* is inlined at build, so a malformed value
  // would otherwise surface as a generic TypeError from `new URL(...)` at
  // module load and break the whole app. Zod gives a clear error instead.
  // Falls back to the production canonical when unset (matches the consumers'
  // `?? "https://axceal.com"` defaults).
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("https://axceal.com"),

  // W1 — sales mode flag. See lib/featureFlags.ts. Default `waitlist` matches
  // pre-launch posture. `dev-live` is rejected in production builds below.
  NEXT_PUBLIC_SALES_MODE: z
    .enum(["waitlist", "live", "dev-live"])
    .default("waitlist"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

// F15.1 — refuse to boot when the dev-only auth-skip flag is set in
// production. NEXT_PUBLIC_* is build-time inlined into the client bundle, so
// a misconfigured prod build would also disable the middleware page-redirect
// for /account/* and /order/*. Per-route requireSession() still gates the
// security boundary, but failing closed prevents the degraded UX state.
if (
  parsed.data.NODE_ENV === "production"
  && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH_GATES === "true"
) {
  throw new Error(
    "NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true is forbidden when NODE_ENV=production",
  );
}

// W1 — `dev-live` is a dev-only override that mirrors `live` behaviour without
// affecting the production posture. NEXT_PUBLIC_* is build-time inlined, so a
// stray `dev-live` value in a prod build would silently disable the waitlist
// gate site-wide. Fail-closed at boot.
if (
  parsed.data.NODE_ENV === "production"
  && parsed.data.NEXT_PUBLIC_SALES_MODE === "dev-live"
) {
  throw new Error(
    "NEXT_PUBLIC_SALES_MODE=dev-live is forbidden when NODE_ENV=production",
  );
}

export const env = parsed.data;
export type Env = typeof env;
