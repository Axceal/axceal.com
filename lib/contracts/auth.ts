import { z } from "zod";
import { Email, Otp4, Password, UUID } from "@/lib/contracts/common";

export const SendOtpRequest = z.object({ email: Email });
export const SendOtpResponse = z.object({ sent: z.literal(true) });

export const VerifyOtpRequest = z.object({ email: Email, otp: Otp4 });
export const VerifyOtpResponse = z.object({ otpToken: z.string() });

export const RegisterRequest = z.object({
  email: Email,
  password: Password,
  otpToken: z.string(),
});
export const RegisterResponse = z.object({ userId: UUID });

export type SendOtpRequest = z.infer<typeof SendOtpRequest>;
export type SendOtpResponse = z.infer<typeof SendOtpResponse>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequest>;
export type VerifyOtpResponse = z.infer<typeof VerifyOtpResponse>;
export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type RegisterResponse = z.infer<typeof RegisterResponse>;
