import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  AddressSchema,
  AddressResponseSchema,
  AddressListResponseSchema,
} from "@/lib/contracts/address";
import { createAddress, listAddresses } from "@/lib/services/address";

export const runtime = "nodejs";

export const GET = withHandler({
  output: AddressListResponseSchema,
  handler: async () => {
    const session = await requireSession();
    return listAddresses(session.userId);
  },
});

export const POST = withHandler({
  input: AddressSchema,
  output: AddressResponseSchema,
  handler: async ({ input }) => {
    const session = await requireSession();
    return createAddress(session.userId, input);
  },
});
