import { z } from "zod";

// F15.5 — phone fields were removed from the profile schema. F8.3 had
// previously stripped them from UpdateProfileRequest so they could not be set
// without verification, but the columns / response shape lingered as dead
// state. Phone now lives only on `users.phone` (written by
// /api/account/phone/verify).
export const ProfileSchema = z.object({
  firstName: z.string().min(1).max(80).nullable(),
  lastName: z.string().min(1).max(80).nullable(),
  birthday: z.string().date().nullable(),
  gender: z.enum(["female", "male", "private"]).nullable(),
});

export const UpdateProfileRequest = ProfileSchema.partial();

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
