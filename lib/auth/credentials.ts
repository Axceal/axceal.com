import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";

export type VerifiedCredentials = { id: string; email: string };

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<VerifiedCredentials | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true, passwordHash: true },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}
