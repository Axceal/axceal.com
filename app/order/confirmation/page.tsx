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

    if (!id || !UUID_RE.test(id)) notFound();

    await rateLimit(`page:confirmation:${session.userId}`, { limit: 60, windowSec: 60 });

    const order = await getOrder(session.userId, id).catch((err): never => {
        if (err instanceof AppError && err.code === ErrorCode.NOT_FOUND) notFound();
        throw err;
    });

    return <ConfirmationView initial={order} />;
}
