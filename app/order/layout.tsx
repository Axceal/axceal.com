import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Defense-in-depth: see comment in app/account/layout.tsx.
export const dynamic = "force-dynamic";

// Per-user checkout flow — never index.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function OrderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/order");
    return <>{children}</>;
}
