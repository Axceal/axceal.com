import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/session";
import { createTestUser } from "@/tests/helpers/db";
import { makeRequest, readJson } from "@/tests/helpers/request";
import { makeSession } from "@/tests/helpers/session";
import { AppError, ErrorCode } from "@/lib/http/errors";

const { GET } = await import("@/app/api/account/me/route");

type OkBody = { ok: true; data: { email: string; createdAt: string; profile: unknown } };
type ErrBody = { ok: false; error: { code: string } };

describe("GET /api/account/me", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("authenticated → 200 with email and profile, no passwordHash", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    vi.mocked(requireSession).mockResolvedValueOnce(makeSession({ userId: user.id }));

    const res = await GET(makeRequest("GET", "/api/account/me"));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.data.email).toBe(user.email);
    expect(typeof body.data.createdAt).toBe("string");
    expect(body.data.profile).toBeDefined();
    expect(JSON.stringify(body.data)).not.toContain("passwordHash");
  });

  it("unauthenticated → 401", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(
      new AppError(ErrorCode.UNAUTHENTICATED, "Login required", 401),
    );
    const res = await GET(makeRequest("GET", "/api/account/me"));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
