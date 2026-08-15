import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/services/profile";
import { rateLimit } from "@/lib/http/rate-limit";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { UnifiedDetailsForm } from "./UnifiedDetailsForm";

export const dynamic = "force-dynamic";

export default async function DetailsUnifiedPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account/details-unified");

    await rateLimit(`page:details-unified:${session.userId}`, { limit: 120, windowSec: 60 });

    const [profile, userRow] = await Promise.all([
        getProfile(session.userId),
        db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { phone: true },
        }),
    ]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <UnifiedDetailsForm initial={profile} phone={userRow?.phone ?? null} />
        </div>
    );
}
