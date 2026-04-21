import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import {
  CreateOrderRequest,
  OrderResponse,
  OrderListResponse,
} from "@/lib/contracts/order";
import { createOrder, listOrders } from "@/lib/services/order";

export const runtime = "nodejs";

export const GET = withHandler({
  output: OrderListResponse,
  handler: async () => {
    const session = await requireSession();
    return listOrders(session.userId);
  },
});

export const POST = withHandler({
  input: CreateOrderRequest,
  output: OrderResponse,
  handler: async ({ input }) => {
    const session = await requireSession();
    return createOrder(session.userId, input);
  },
});
