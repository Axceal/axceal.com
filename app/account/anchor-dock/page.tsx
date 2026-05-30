import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/http/rate-limit";
import { elideEmail } from "@/lib/format";
import { Squircle } from "../../components/layout/Squircle";
import { SvgText } from "../../components/text/SvgText";
import { AnchorDockIcon } from "../../components/icons/brand/AnchorDockIcon";
import { DownloadIcon } from "../../components/icons/action/DownloadIcon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnchorDockPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/auth?from=/account/anchor-dock");

    await rateLimit(`page:anchor-dock:${session.userId}`, { limit: 120, windowSec: 60 });

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { email: true },
    });
    if (!user) redirect("/auth");

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex-col">
                <Squircle borderRadius={24} smoothing={50} className="bg-[#f1f1f1] p-8 w-[300px] h-[300px] flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-[52px] h-[52px] rounded-full bg-[#0000f4] flex items-center justify-center shrink-0">
                            <AnchorDockIcon className="text-white" />
                        </div>
                        <SvgText text="Anchor Dock" weight="600" height={16} className="text-[#1e1e1e]" />
                    </div>

                    <SvgText
                        text={`Connect ${elideEmail(user.email)}\nto Dock for persistent Aero\nconnection.`}
                        weight="500"
                        height={14}
                        className="text-[#aaaaaa] leading-[1.5]"
                    />

                    <div className="flex items-center justify-center gap-2 mt-auto mb-2">
                        <Link href="/account/anchor-dock/signed" className="flex items-center gap-2">
                            <DownloadIcon className="text-[#0000f4] w-[24px] h-[26px]" />
                            <SvgText text="Get or Update Dock" weight="600" height={16} className="text-[#0000f4]" />
                        </Link>
                    </div>
                </Squircle>

                <div className="mt-[20px] flex justify-center">
                    <SvgText
                        text={"To Connect, open Dock\nApplication"}
                        weight="600"
                        height={14}
                        align="center"
                        className="text-[#1e1e1e]"
                    />
                </div>
            </div>
        </main>
    );
}
