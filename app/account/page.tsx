import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/http/rate-limit";
import { AccountShell } from "./AccountShell";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account");

    await rateLimit(`page:account:${session.userId}`, { limit: 120, windowSec: 60 });

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { email: true, createdAt: true },
    });
    if (!user) await signOut({ redirectTo: "/auth" });

    return (
        <AccountShell
            initial={{ email: user!.email, createdAt: user!.createdAt.toISOString() }}
        />
    );
}
