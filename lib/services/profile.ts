import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userProfiles, type UserProfile } from "@/lib/db/schema";
import type { Profile, UpdateProfileRequest } from "@/lib/contracts/profile";

function rowToProfile(row: UserProfile | undefined): Profile {
  // F15.5 — phone fields removed from user_profiles. Verified phone lives on
  // users.phone (written by /api/account/phone/verify) and is exposed
  // separately when needed.
  return {
    firstName: row?.firstName ?? null,
    lastName: row?.lastName ?? null,
    birthday: row?.birthday ?? null,
    gender: (row?.gender as Profile["gender"]) ?? null,
  };
}

export async function getProfile(userId: string): Promise<Profile> {
  const row = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
  return rowToProfile(row);
}

export async function updateProfile(
  userId: string,
  patch: UpdateProfileRequest,
): Promise<Profile> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return getProfile(userId);

  const set = Object.fromEntries(entries) as Partial<
    typeof userProfiles.$inferInsert
  >;

  await db
    .insert(userProfiles)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: userProfiles.userId, set });

  return getProfile(userId);
}
