import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account");
    return <>{children}</>;
}
