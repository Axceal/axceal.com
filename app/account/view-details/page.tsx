import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/services/profile";
import { rateLimit } from "@/lib/http/rate-limit";
import { ViewDetailsShell } from "./ViewDetailsShell";

export const dynamic = "force-dynamic";

export default async function ViewDetailsPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account/view-details");

    await rateLimit(`page:view-details:${session.userId}`, { limit: 120, windowSec: 60 });

    const profile = await getProfile(session.userId);
    return <ViewDetailsShell initial={profile} />;
}
