import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/services/order";
import { rateLimit } from "@/lib/http/rate-limit";
import { OrderList } from "./OrderList";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account/orders");

    await rateLimit(`page:orders:${session.userId}`, { limit: 120, windowSec: 60 });

    const orders = await listOrders(session.userId);
    return <OrderList initial={orders} />;
}
