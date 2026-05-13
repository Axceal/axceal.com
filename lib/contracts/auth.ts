import { z } from "zod";
import { Email, LoginPassword, Otp4, Password, UUID } from "@/lib/contracts/common";

// Login uses LoginPassword (length-only) so existing credentials with any
// composition are still accepted. Register/reset/change use the stricter
// Password schema so new passwords meet complexity requirements server-side.
export const VerifyPasswordRequest = z.object({ email: Email, password: LoginPassword });
export const VerifyPasswordResponse = z.object({ pendingMfaToken: UUID });

export const LoginOtpRequest = z.object({ pendingMfaToken: UUID });
export const LoginOtpResponse = z.object({ sent: z.literal(true) });

// Flow scopes the request so the route handler does the right thing per
// caller intent without leaking which side of the existence check ran.
//   - "register":  send if user does NOT exist (no-op if exists)
//   - "reset-pw":  send if user DOES exist (no-op if not)
// Both branches run through `constantTimeOtpSend` so wall-clock latency is
// identical regardless of which path was taken — closes the email-enumeration
// timing oracle (F10.1).
export const SendOtpRequest = z.object({
  email: Email,
  flow: z.enum(["register", "reset-pw"]),
});
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

export const VerifyChangePasswordOtpRequest = z.object({ otp: Otp4 });
export const VerifyChangePasswordOtpResponse = z.object({ otpToken: z.string() });

export const ChangePasswordRequest = z.object({
  otpToken: z.string().min(1),
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
export type VerifyChangePasswordOtpRequest = z.infer<typeof VerifyChangePasswordOtpRequest>;
export type VerifyChangePasswordOtpResponse = z.infer<typeof VerifyChangePasswordOtpResponse>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponse>;
export type SendPhoneRequest = z.infer<typeof SendPhoneRequest>;
export type SendPhoneResponse = z.infer<typeof SendPhoneResponse>;
export type VerifyPhoneRequest = z.infer<typeof VerifyPhoneRequest>;
export type VerifyPhoneResponse = z.infer<typeof VerifyPhoneResponse>;
