import type { Session } from "next-auth";
import { auth, signOut } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/http/errors";

export type RequiredSession = Session & { userId: string };

export async function getSession(): Promise<Session | null> {
  return await auth();
}

export async function requireSession(): Promise<RequiredSession> {
  const session = await getSession();
  if (!session?.userId) {
    throw new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401);
  }
  return session as RequiredSession;
}

/**
 * Server-side sign-out + redirect. Returns `never` so callers can use it as a
 * type guard (`if (!user) await forceSignOut(); user.email`). Throws if
 * NextAuth's signOut fails to redirect, preventing accidental fall-through.
 */
export async function forceSignOut(redirectTo: string = "/auth"): Promise<never> {
  await signOut({ redirectTo });
  throw new Error("forceSignOut: signOut did not redirect");
}
