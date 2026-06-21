import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/http/rate-limit";
import { WaitlistStatusResponse } from "@/lib/contracts/waitlist";
import { ensureWaitlistMembership } from "@/lib/services/waitlist";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// W4 — `ensureWaitlistMembership` covers the auto-join requirement: every
// existing real user is dropped into the queue the first time their browser
// hits this endpoint after the flag flips. Idempotent for repeat callers.
//
// W9 robustness — direct handler so we can ship `Cache-Control: private`.
// `private` means only the user's browser caches; never a shared CDN cache
// (response is bound to the session). 10s is short enough that any newly-
// assigned position still appears promptly, and absorbs the rapid re-mounts
// of HomeClient + AccountShell on quick nav.
export async function GET(): Promise<Response> {
  try {
    const session = await requireSession();
    await rateLimit(`waitlist:status:${session.userId}`, {
      limit: 60,
      windowSec: 60,
    });
    const data = await ensureWaitlistMembership(session.userId);
    const body = WaitlistStatusResponse.parse(data);
    return NextResponse.json(
      { ok: true, data: body },
      {
        headers: {
          "Cache-Control": "private, max-age=10",
          // Belt-and-suspenders: tell intermediaries not to cache this
          // even if Cache-Control were ignored — the response carries
          // a per-user position.
          Vary: "Cookie",
        },
      },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    logger.error({ err }, "waitlist/status failed");
    return NextResponse.json(
      { ok: false, error: { code: ErrorCode.INTERNAL, message: "Internal error" } },
      { status: 500 },
    );
  }
}
