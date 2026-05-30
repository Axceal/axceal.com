import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/services/profile";
import { rateLimit } from "@/lib/http/rate-limit";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ViewDetailsShell } from "./ViewDetailsShell";

export const dynamic = "force-dynamic";

export default async function ViewDetailsPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account/view-details");

    await rateLimit(`page:view-details:${session.userId}`, { limit: 120, windowSec: 60 });

    // F15.5 — phone now lives only on `users.phone`. Fetch alongside the
    // profile so the shell can render it without resurrecting the legacy
    // user_profiles.phone* columns.
    const [profile, userRow] = await Promise.all([
        getProfile(session.userId),
        db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { phone: true },
        }),
    ]);
    return <ViewDetailsShell initial={profile} phone={userRow?.phone ?? null} />;
}
