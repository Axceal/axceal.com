import { z } from "zod";

export const Email = z.string().email().toLowerCase().trim();
export const Password = z.string().min(8).max(128);
export const Otp4 = z.string().regex(/^\d{4}$/);
export const PhoneCountryCode = z.string().regex(/^\d{1,4}$/);
export const PhoneDigits = z.string().regex(/^\d{7,15}$/);
export const Paise = z.number().int().nonnegative();
export const UUID = z.string().uuid();
