import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import { AccountOverviewSchema } from "@/lib/contracts/account";
import { getAccountOverview } from "@/lib/services/account";

export const runtime = "nodejs";

export const GET = withHandler({
  output: AccountOverviewSchema,
  handler: async () => {
    const session = await requireSession();
    return getAccountOverview(session.userId);
  },
});
