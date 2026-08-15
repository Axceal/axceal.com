import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession, forceSignOut } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { UserIcon } from "../components/icons/account/UserIcon";
import { SvgText } from "../components/text/SvgText";
import { ordinal } from "./details-unified/helpers";
import { elideEmail } from "@/lib/format";
import { Squircle } from "../components/layout/Squircle";

const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function formatCreatedAt(iso: string): string {
    const d = new Date(iso);
    return `${ordinal(d.getUTCDate())} ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function splitEmail(email: string): [string, string] {
    const at = email.indexOf("@");
    if (at === -1) return [email, ""];
    return [email.slice(0, at), email.slice(at)];
}

export async function UserCard() {
    const session = await requireSession();
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { email: true, createdAt: true },
    });
    if (!user) {
        await forceSignOut("/auth");
        throw new Error("unreachable");
    }

    const [localPart, domainPart] = splitEmail(elideEmail(user.email));
    const createdDate = formatCreatedAt(user.createdAt.toISOString());
    const createdLine = `Account created on ${createdDate}.`;
    const descriptionTail = "Includes Name, Phone Number,\nGender and Birthday";

    return (
        <div className="relative p-8 w-[300px] h-[300px] flex flex-col gap-6 z-10">
            <Squircle borderRadius={20} smoothing={60} className="absolute inset-0 bg-[#f1f1f1] -z-10" />
            <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-full pb-[2px] bg-[#0000f4] flex items-center justify-center shrink-0">
                    <UserIcon className="w-[24px] h-[24px] text-white stroke-[#0000f4]" />
                </div>
                <div className="flex flex-col gap-1 w-full overflow-visible">
                    <SvgText text={localPart || " "} weight="600" height={16} className="text-[#1e1e1e] truncate" />
                    <SvgText text={domainPart || " "} weight="600" height={14} className="text-[#aaaaaa]" />
                </div>
            </div>

            <SvgText
                text={`${createdLine}\n${descriptionTail}`}
                weight="600"
                height={14}
                className="text-[#aaaaaa] leading-[1.5]"
            />

            <div className="flex flex-col gap-6 items-center mt-auto relative">
                <Link href="/account/view-details" className="focus:outline-none">
                    <SvgText text="Details" weight="600" height={18} maxWidth={400} className="text-[#1e1e1e] hover:text-[#0000f4] transition-colors" />
                </Link>
                {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-[#aaaaaa]" /> */}
                <Link href="/account/change-password" className="focus:outline-none">
                    <SvgText text="Change Password" weight="600" height={18} maxWidth={400} className="text-[#1e1e1e] hover:text-[#0000f4] transition-colors" />
                </Link>
            </div>
        </div>
    );
}
