import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  CreateOrderRequest,
  OrderResponse,
  OrderListResponse,
} from "@/lib/contracts/order";
import { createOrder, listOrders } from "@/lib/services/order";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export const GET = withHandler({
  output: OrderListResponse,
  handler: async () => {
    const session = await requireSession();
    await rateLimit(`orders:list:${session.userId}`, { limit: 60, windowSec: 60 });
    return listOrders(session.userId);
  },
});

export const POST = withHandler({
  input: CreateOrderRequest,
  output: OrderResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`orders:create:${session.userId}`, {
      limit: 20,
      windowSec: 3600,
    });
    return createOrder(session.userId, input);
  },
});
