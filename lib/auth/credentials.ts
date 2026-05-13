import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";

export type VerifiedCredentials = { id: string; email: string };

// Real bcrypt hash at the same cost as production hashes — required so that
// bcrypt.compare does the full work and timing matches a real user lookup.
// A malformed hash short-circuits in bcryptjs and reveals user existence
// via a ~770× timing differential (see SECURITY_FINDINGS §F8.1).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-normalization", 12);

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<VerifiedCredentials | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}
