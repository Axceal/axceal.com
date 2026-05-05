import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { getSession, requireSession } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/http/errors";

const mockedAuth = vi.mocked(auth as () => Promise<Session | null>);

function makeSession(userId?: string): Session {
  return {
    userId: userId ?? "00000000-0000-0000-0000-000000000001",
    user: { email: "test@example.com", name: null, image: null },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe("auth/session", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it("requireSession returns session when valid userId is present", async () => {
    const session = makeSession();
    mockedAuth.mockResolvedValue(session);

    const result = await requireSession();
    expect(result.userId).toBe(session.userId);
  });

  it("requireSession throws AppError UNAUTHENTICATED when auth() returns null", async () => {
    mockedAuth.mockResolvedValue(null);

    const err = await requireSession().catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(ErrorCode.UNAUTHENTICATED);
    expect((err as AppError).status).toBe(401);
  });

  it("requireSession throws AppError UNAUTHENTICATED when session has no userId", async () => {
    const session = {
      user: { email: "test@example.com", name: null, image: null },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as unknown as Session;
    mockedAuth.mockResolvedValue(session);

    const err = await requireSession().catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(ErrorCode.UNAUTHENTICATED);
    expect((err as AppError).status).toBe(401);
  });

  it("getSession returns null when auth() returns null (no throw)", async () => {
    mockedAuth.mockResolvedValue(null);

    await expect(getSession()).resolves.toBeNull();
  });

  it("getSession returns session without throwing", async () => {
    const session = makeSession();
    mockedAuth.mockResolvedValue(session);

    await expect(getSession()).resolves.toEqual(session);
  });
});
