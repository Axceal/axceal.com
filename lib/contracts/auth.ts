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
// `accountExists` is included in the response so the create-account UI can
// branch to a "Login / Forgot Password" pathway once the caller has proven
// inbox control via OTP. Revealing existence here is acceptable because the
// caller already controls the email — they could equally start a password
// reset to learn the same fact.
export const VerifyOtpResponse = z.object({
  otpToken: z.string(),
  accountExists: z.boolean(),
});

// Passwordless login — caller has just proven inbox control via verify-otp
// and the returned otpToken. Issues a pendingMfaToken the NextAuth provider
// exchanges for a session.
export const OtpLoginRequest = z.object({
  email: Email,
  otpToken: z.string().min(1),
});
export const OtpLoginResponse = z.object({ pendingMfaToken: UUID });

// W6 — `intent` lets the create-account flow declare a post-signup action.
// "waitlist" means the user signed up from the queue popup; the route inserts
// a waitlist row and the client redirects to `/?joined=1`. Optional so the
// normal signup flow is unaffected.
export const RegisterRequest = z.object({
  email: Email,
  password: Password,
  otpToken: z.string(),
  intent: z.enum(["waitlist"]).optional(),
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

// S16 — defense-in-depth: require knowledge of the current password to
// rotate, on top of session + email-OTP. Prevents a session-cookie-only
// attacker (XSS / cookie theft) from silently changing the password if they
// also happen to have email access (combined attack chain).
export const VerifyCurrentPasswordRequest = z.object({ currentPassword: LoginPassword });
export const VerifyCurrentPasswordResponse = z.object({ verified: z.literal(true) });

export const ChangePasswordRequest = z.object({
  currentPassword: LoginPassword,
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
  code: z.string().length(4),
});
export const VerifyPhoneResponse = z.object({ verified: z.literal(true) });

// Details-flow email OTP — verifies ownership of user's email before
// persisting sensitive profile changes (e.g. phone number).
export const DetailsVerifyOtpRequest = z.object({
  code: Otp4,
  phone: z.string().regex(/^\+\d{8,16}$/),
});
export const DetailsVerifyOtpResponse = z.object({ verified: z.literal(true) });

export type VerifyPasswordRequest = z.infer<typeof VerifyPasswordRequest>;
export type VerifyPasswordResponse = z.infer<typeof VerifyPasswordResponse>;
export type LoginOtpRequest = z.infer<typeof LoginOtpRequest>;
export type LoginOtpResponse = z.infer<typeof LoginOtpResponse>;
export type SendOtpRequest = z.infer<typeof SendOtpRequest>;
export type SendOtpResponse = z.infer<typeof SendOtpResponse>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequest>;
export type VerifyOtpResponse = z.infer<typeof VerifyOtpResponse>;
export type OtpLoginRequest = z.infer<typeof OtpLoginRequest>;
export type OtpLoginResponse = z.infer<typeof OtpLoginResponse>;
export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type RegisterResponse = z.infer<typeof RegisterResponse>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponse>;
export type VerifyChangePasswordOtpRequest = z.infer<typeof VerifyChangePasswordOtpRequest>;
export type VerifyChangePasswordOtpResponse = z.infer<typeof VerifyChangePasswordOtpResponse>;
export type VerifyCurrentPasswordRequest = z.infer<typeof VerifyCurrentPasswordRequest>;
export type VerifyCurrentPasswordResponse = z.infer<typeof VerifyCurrentPasswordResponse>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponse>;
export type SendPhoneRequest = z.infer<typeof SendPhoneRequest>;
export type SendPhoneResponse = z.infer<typeof SendPhoneResponse>;
export type VerifyPhoneRequest = z.infer<typeof VerifyPhoneRequest>;
export type VerifyPhoneResponse = z.infer<typeof VerifyPhoneResponse>;
export type DetailsVerifyOtpRequest = z.infer<typeof DetailsVerifyOtpRequest>;
export type DetailsVerifyOtpResponse = z.infer<typeof DetailsVerifyOtpResponse>;
