import { z } from "zod";

export const Email = z.string().trim().toLowerCase().email().max(254);
// Password used for *checking* an existing credential (login, verify-password).
// Length-only — must accept whatever passwords already exist in the DB so we
// don't reject legitimate users with older/simpler passwords during login.
export const LoginPassword = z.string().min(8).max(128);
// Password used for *setting* a new credential (register, reset, change).
// Full complexity — mirrors the client-side rule in useChangePasswordForm so
// the client check cannot be bypassed by direct API calls.
export const Password = z.string()
  .min(8).max(64)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a digit")
  .regex(/[^a-zA-Z0-9]/, "Must contain a special character");
export const Otp4 = z.string().regex(/^\d{4}$/);
export const PhoneCountryCode = z.string().regex(/^\d{1,4}$/);
export const PhoneDigits = z.string().regex(/^\d{7,15}$/);
export const Paise = z.number().int().nonnegative();
export const UUID = z.string().uuid();
