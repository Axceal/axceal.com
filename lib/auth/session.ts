import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
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
