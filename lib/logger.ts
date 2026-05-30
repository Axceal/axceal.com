import pino from "pino";
import { env } from "@/lib/env";

const isDev = env.NODE_ENV === "development";
const isProd = env.NODE_ENV === "production";
const axiomEnabled = isProd && !!env.AXIOM_TOKEN && !!env.AXIOM_DATASET;

const transport = isDev
  ? { target: "pino-pretty", options: { colorize: true } }
  : axiomEnabled
    ? {
        targets: [
          {
            target: "pino/file",
            level: "info",
            options: { destination: 1 },
          },
          {
            target: "@axiomhq/pino",
            level: "info",
            options: {
              dataset: env.AXIOM_DATASET,
              token: env.AXIOM_TOKEN,
            },
          },
        ],
      }
    : undefined;

export const logger = pino({
  level: isProd ? "info" : "debug",
  redact: {
    paths: [
      "password",
      "passwordHash",
      "otp",
      "code",
      "razorpaySignature",
      "razorpayKeySecret",
      "authorization",
      "cookie",
      "token",
      "otpToken",
      // pino redact matches exact property names, so camelCase variants
      // need to be listed individually — `token` does not match `pendingMfaToken`.
      "pendingMfaToken",
      "signupSessionToken",
      // F14.6 — fields added by S16 (currentPassword) and F13.1
      // (loginToken). Exact-name match means future log calls would silently
      // leak them without these explicit entries.
      "currentPassword",
      "loginToken",
      "*.password",
      "*.passwordHash",
      "*.otp",
      "*.code",
      "*.token",
      "*.otpToken",
      "*.pendingMfaToken",
      "*.signupSessionToken",
      "*.currentPassword",
      "*.loginToken",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport,
});
