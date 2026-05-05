import { z } from "zod";

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

  AXIOM_TOKEN: z.string().min(1).optional(),
  AXIOM_DATASET: z.string().min(1).optional(),

  // Twilio Verify — required for phone OTP verification
  TWILIO_ACCOUNT_SID: z.string().optional().transform(v => v || undefined),
  TWILIO_AUTH_TOKEN: z.string().optional().transform(v => v || undefined),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().transform(v => v || undefined),

  GOOGLE_ADDRESS_VALIDATION_API_KEY: z.string().optional().transform(v => v || undefined),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

export const env = parsed.data;
export type Env = typeof env;
