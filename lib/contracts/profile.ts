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
export const UpdateProfileRequest = ProfileSchema.partial();

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
