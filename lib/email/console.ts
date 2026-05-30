import type { EmailProvider } from "@/lib/email/provider";

export const consoleProvider: EmailProvider = {
  async sendOtp(to, code) {
    // Plain console.log bypasses pino redaction so the code is actually visible
    // in dev terminal output. NEVER enabled in production.
    // eslint-disable-next-line no-console
    console.log(`\n[dev-email] OTP for ${to}: ${code}\n`);
  },
  async sendLoginAlert(to, ctx) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[dev-email] login alert for ${to}: ip=${ctx.ip} ua=${ctx.userAgent} at=${ctx.occurredAt.toISOString()}\n`,
    );
  },
};
