import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Defense-in-depth: middleware redirects unauthed users to /auth before this
// runs. Layout repeats the check so a future middleware misconfig can't expose
// any /account/* route. Auth.js v5 caches `auth()` per-request, so the page
// and child server components calling getSession() again do not re-verify the
// JWT or hit Redis.
export const dynamic = "force-dynamic";

// Per-user content — exclude every /account/* route from search indexing.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account");
    return <>{children}</>;
}
