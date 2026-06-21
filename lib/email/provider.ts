import { env } from "@/lib/env";
import { consoleProvider } from "@/lib/email/console";
import { resendProvider } from "@/lib/email/resend";

export interface LoginAlertContext {
  ip: string;
  userAgent: string;
  occurredAt: Date;
}

export interface EmailProvider {
  sendOtp(to: string, code: string): Promise<void>;
  sendLoginAlert(to: string, ctx: LoginAlertContext): Promise<void>;
  // W8 — waitlist join confirmation. Single send per user; the join service
  // calls this fire-and-forget so SMTP failure never blocks the signup
  // response.
  sendWaitlistJoined(to: string, position: number): Promise<void>;
}

export const emailProvider: EmailProvider =
  env.NODE_ENV === "production" ? resendProvider : consoleProvider;
