import type { Session } from "next-auth";

export function makeSession(overrides?: { userId?: string; email?: string }): Session {
  return {
    userId: overrides?.userId ?? "00000000-0000-0000-0000-000000000001",
    user: {
      email: overrides?.email ?? "test@example.com",
      name: null,
      image: null,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Returns vi.mock factory functions for @/lib/auth/session.
 * Usage: vi.mock("@/lib/auth/session", () => mockSession(makeSession()))
 */
export function mockSession(session: Session | null) {
  return {
    getSession: async () => session,
    requireSession: async () => {
      if (!session) throw new Error("UNAUTHORIZED");
      return session;
    },
  };
}
