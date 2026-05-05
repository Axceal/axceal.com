import { z } from "zod";
import { Email, Otp4, Password, UUID } from "@/lib/contracts/common";

export const VerifyPasswordRequest = z.object({ email: Email, password: Password });
export const VerifyPasswordResponse = z.object({ pendingMfaToken: UUID });

export const LoginOtpRequest = z.object({ pendingMfaToken: UUID });
export const LoginOtpResponse = z.object({ sent: z.literal(true) });

export const SendOtpRequest = z.object({ email: Email });
export const SendOtpResponse = z.object({ sent: z.literal(true) });

export const VerifyOtpRequest = z.object({ email: Email, otp: Otp4 });
export const VerifyOtpResponse = z.object({ otpToken: z.string() });

export const RegisterRequest = z.object({
  email: Email,
  password: Password,
  otpToken: z.string(),
});
export const RegisterResponse = z.object({ userId: UUID, signupSessionToken: UUID });

export const ResetPasswordRequest = z.object({
  email: Email,
  otpToken: z.string().min(1),
  password: Password,
});
export const ResetPasswordResponse = z.object({ success: z.literal(true) });

export const ChangePasswordRequest = z.object({
  otp: Otp4,
  password: Password,
});
export const ChangePasswordResponse = z.object({ success: z.literal(true) });

export const SendPhoneRequest = z.object({
  phone: z.string().regex(/^\+\d{8,16}$/),
});
export const SendPhoneResponse = z.object({ sent: z.literal(true) });

export const VerifyPhoneRequest = z.object({
  phone: z.string().regex(/^\+\d{8,16}$/),
  code: z.string().length(6),
});
export const VerifyPhoneResponse = z.object({ verified: z.literal(true) });

export type VerifyPasswordRequest = z.infer<typeof VerifyPasswordRequest>;
export type VerifyPasswordResponse = z.infer<typeof VerifyPasswordResponse>;
export type LoginOtpRequest = z.infer<typeof LoginOtpRequest>;
export type LoginOtpResponse = z.infer<typeof LoginOtpResponse>;
export type SendOtpRequest = z.infer<typeof SendOtpRequest>;
export type SendOtpResponse = z.infer<typeof SendOtpResponse>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequest>;
export type VerifyOtpResponse = z.infer<typeof VerifyOtpResponse>;
export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type RegisterResponse = z.infer<typeof RegisterResponse>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponse>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponse>;
export type SendPhoneRequest = z.infer<typeof SendPhoneRequest>;
export type SendPhoneResponse = z.infer<typeof SendPhoneResponse>;
export type VerifyPhoneRequest = z.infer<typeof VerifyPhoneRequest>;
export type VerifyPhoneResponse = z.infer<typeof VerifyPhoneResponse>;
