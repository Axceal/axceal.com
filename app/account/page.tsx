import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/http/rate-limit";
import { ComponentLoading } from "../components/feedback/ComponentLoading";
import { AccountShell } from "./AccountShell";
import { UserCard } from "./UserCard";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account");

    await rateLimit(`page:account:${session.userId}`, { limit: 120, windowSec: 60 });

    return (
        <AccountShell
            userCard={
                <Suspense
                    fallback={
                        <ComponentLoading width={300} height={300} borderRadius={24} />
                    }
                >
                    <UserCard />
                </Suspense>
            }
        />
    );
}
