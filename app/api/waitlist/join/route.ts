import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/http/rate-limit";
import { WaitlistJoinResponse } from "@/lib/contracts/waitlist";
import { joinWaitlist } from "@/lib/services/waitlist";

export const runtime = "nodejs";

// W3 — idempotent join. Live-mode rejection happens inside joinWaitlist via
// the AppError(GONE, 410) guard, so this handler stays mode-agnostic.
export const POST = withHandler({
  output: WaitlistJoinResponse,
  handler: async () => {
    const session = await requireSession();
    await rateLimit(`waitlist:join:${session.userId}`, {
      limit: 10,
      windowSec: 60,
    });
    return joinWaitlist(session.userId);
  },
});
