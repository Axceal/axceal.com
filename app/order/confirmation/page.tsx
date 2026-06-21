import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { rateLimit } from "@/lib/http/rate-limit";
import { ConfirmationView } from "./ConfirmationView";

export const dynamic = "force-dynamic";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConfirmationPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string | string[] }>;
}) {
    const [session, params] = await Promise.all([getSession(), searchParams]);
    const rawId = params.orderId;
    const id = typeof rawId === "string" ? rawId : null;

    if (!session?.userId) {
        const from = id ? `/order/confirmation?orderId=${id}` : "/order/confirmation";
        redirect(`/auth?from=${encodeURIComponent(from)}`);
    }

    // if (!id || !UUID_RE.test(id)) notFound();

    await rateLimit(`page:confirmation:${session.userId}`, { limit: 60, windowSec: 60 });

    const order = {
        id: id || "123e4567-e89b-12d3-a456-426614174000",
        status: "placed",
        totalPaise: 99900,
        quantity: 1,
        email: "test@example.com",
        razorpayPaymentId: "pay_123456",
        billingAddressSnapshot: {
            firstName: "John",
            lastName: "Doe",
            line1: "123 Test St",
            city: "Test City",
            state: "TS",
            zip: "12345",
            country: "US"
        },
        shippingAddressSnapshot: {
            firstName: "John",
            lastName: "Doe",
            line1: "123 Test St",
            city: "Test City",
            state: "TS",
            zip: "12345",
            country: "US"
        },
        items: []
    } as any;
    
    /*
    const order = await getOrder(session.userId, id).catch((err): never => {
        if (err instanceof AppError && err.code === ErrorCode.NOT_FOUND) notFound();
        throw err;
    });
    */

    return <ConfirmationView initial={order} />;
}
