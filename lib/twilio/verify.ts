import twilio from "twilio";
import { env } from "@/lib/env";
import { AppError, ErrorCode } from "@/lib/http/errors";

let _client: ReturnType<typeof twilio> | null = null;

function getClient(): [ReturnType<typeof twilio>, string] {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const serviceSid = env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio env vars not configured");
  }
  if (!_client) _client = twilio(sid, token);
  return [_client, serviceSid];
}
export async function sendPhoneOtp(phone: string): Promise<void> {
  const [client, serviceSid] = getClient();
  try {
    await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new AppError(
      ErrorCode.VALIDATION_FAILED,
      err.message || "Could not send OTP. Please check the phone number.",
      400
    );
  }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
  const [client, serviceSid] = getClient();
  const result = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to: phone, code });
  return result.status === "approved";
}
