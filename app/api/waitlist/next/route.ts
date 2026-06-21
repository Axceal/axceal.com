import { NextResponse } from "next/server";
import { WaitlistNextResponse } from "@/lib/contracts/waitlist";
import { getNextWaitlistPosition } from "@/lib/services/waitlist";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// W3 — public preview of the next position for the join popup. No auth,
// no body. Even in live mode this stays cheap (single sequence lookup) and
// returns the value the next joiner *would* receive if we flipped back.
//
// W9 sec-review — unauthenticated + DB-touching, so a per-IP rate limit is
// the only ceiling on scraping / DoS. 30/min matches the join popup's
// realistic open rate (one fetch per dialog open) with headroom for tabs.
//
// W9 robustness — direct handler (skips withHandler) so the response can
// carry Cache-Control. 10s shared cache absorbs spikes: during a launch the
// CDN serves the same value to every dialog open within the window, so the
// DB sees one query per 10s per edge node, not one per visitor.
export async function GET(req: Request): Promise<Response> {
  try {
    const ip = getClientIp(req);
    await rateLimit(`waitlist:next:ip:${ip}`, { limit: 30, windowSec: 60 });
    const nextPosition = await getNextWaitlistPosition();
    const body = WaitlistNextResponse.parse({ nextPosition });
    return NextResponse.json(
      { ok: true, data: body },
      {
        headers: {
          // Public so any CDN can cache. SWR = 30s gives soft delivery
          // while the next origin fetch runs in the background.
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
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
    logger.error({ err }, "waitlist/next failed");
    return NextResponse.json(
      { ok: false, error: { code: ErrorCode.INTERNAL, message: "Internal error" } },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
