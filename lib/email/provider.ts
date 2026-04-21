import { env } from "@/lib/env";
import { consoleProvider } from "@/lib/email/console";
import { resendProvider } from "@/lib/email/resend";

export interface EmailProvider {
  sendOtp(to: string, code: string): Promise<void>;
}

export const emailProvider: EmailProvider =
  env.NODE_ENV === "production" ? resendProvider : consoleProvider;
