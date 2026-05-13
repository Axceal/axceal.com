import { z } from "zod";
import { PhoneCountryCode, PhoneDigits } from "@/lib/contracts/common";

export const ProfileSchema = z.object({
  firstName: z.string().min(1).max(80).nullable(),
  lastName: z.string().min(1).max(80).nullable(),
  birthday: z.string().date().nullable(),
  gender: z.enum(["female", "male", "private"]).nullable(),
  phoneCountryCode: PhoneCountryCode.nullable(),
  phone: PhoneDigits.nullable(),
  phoneSign: z.enum(["+", "-"]).default("+"),
});

// Phone fields are deliberately excluded — they must go through the
// /api/account/phone/send + /verify OTP flow so the verified `users.phone`
// stays consistent with the profile copy. Allowing PUT here would let an
// authenticated user set any phone without verification.
export const UpdateProfileRequest = ProfileSchema
  .omit({ phone: true, phoneCountryCode: true, phoneSign: true })
  .partial();

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
