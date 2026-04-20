import pino from "pino";
import { env } from "@/lib/env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
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
      "*.password",
      "*.otp",
      "*.token",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
