import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  AddressSchema,
  AddressResponseSchema,
  AddressListResponseSchema,
} from "@/lib/contracts/address";
import { createAddress, listAddresses } from "@/lib/services/address";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export const GET = withHandler({
  output: AddressListResponseSchema,
  handler: async () => {
    const session = await requireSession();
    await rateLimit(`addresses:list:${session.userId}`, { limit: 60, windowSec: 60 });
    return listAddresses(session.userId);
  },
});

export const POST = withHandler({
  input: AddressSchema,
  output: AddressResponseSchema,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`addresses:create:${session.userId}`, { limit: 20, windowSec: 3600 });
    return createAddress(session.userId, input);
  },
});
