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
}

export const emailProvider: EmailProvider =
  env.NODE_ENV === "production" ? resendProvider : consoleProvider;
