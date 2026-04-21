import { Resend } from "resend";
import { render } from "@react-email/components";
import type { EmailProvider } from "@/lib/email/provider";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { OtpEmail } from "@/lib/email/templates/otp";

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
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
