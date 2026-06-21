import { Resend } from "resend";
import { render } from "@react-email/components";
import type { EmailProvider } from "@/lib/email/provider";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { OtpEmail } from "@/lib/email/templates/otp";
import { WaitlistJoinedEmail } from "@/lib/email/templates/waitlist";

const client = new Resend(env.RESEND_API_KEY);

export const resendProvider: EmailProvider = {
  async sendOtp(to, code) {
    const html = await render(OtpEmail({ code }));
    const text = `Your Axceal verification code is ${code}. It expires in 10 minutes.`;

    const result = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Your Axceal verification code",
      html,
      text,
    });

    if (result.error) {
      logger.error({ err: result.error, to: maskEmail(to) }, "resend send failed");
      throw new AppError(
        ErrorCode.UPSTREAM_FAILED,
        "Failed to send verification email",
        502,
      );
    }
  },
  async sendLoginAlert(to, ctx) {
    // F13.6 — passwordless OTP login has no traditional canary (no password
    // reset alert), so notify the inbox owner directly when someone signs in
    // using only an email OTP. Plain text only; if Resend fails we log but
    // do not block the login (caller wraps this in a try/catch + fire-forget).
    const when = ctx.occurredAt.toUTCString();
    const text = [
      "We just signed in to your Axceal account using a one-time code sent to this email.",
      "",
      `When: ${when}`,
      `IP:   ${ctx.ip}`,
      `Device: ${ctx.userAgent || "unknown"}`,
      "",
      "If this was you, no action is needed.",
      "If this was NOT you, change your password immediately and contact support.",
    ].join("\n");

    const result = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "New Axceal sign-in via email code",
      text,
    });
    if (result.error) {
      logger.error({ err: result.error, to: maskEmail(to) }, "resend login-alert failed");
    }
  },
  async sendWaitlistJoined(to, position) {
    const html = await render(WaitlistJoinedEmail({ position }));
    const positionLabel = `#${position.toLocaleString("en-IN")}`;
    const text = [
      `You're in the Aero queue at ${positionLabel}.`,
      "",
      "Thanks for joining the waitlist. We'll be in touch when it's your turn to order.",
    ].join("\n");

    const result = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: `You're in the Aero queue (${positionLabel})`,
      html,
      text,
    });
    if (result.error) {
      logger.error(
        { err: result.error, to: maskEmail(to) },
        "resend waitlist-joined failed",
      );
    }
  },
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
