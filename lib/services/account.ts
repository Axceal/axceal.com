import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { getProfile } from "@/lib/services/profile";
import type { AccountOverview } from "@/lib/contracts/account";

export async function getAccountOverview(
  userId: string,
): Promise<AccountOverview> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, createdAt: true },
  });
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, "User not found", 404);
  }
  const profile = await getProfile(userId);
  return {
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    profile,
  };
}
