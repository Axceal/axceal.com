"use client";

import { useState } from "react";
import Link from "next/link";
import { UserIcon } from "../components/icons/UserIcon";
import { SvgText } from "../components/SvgText";
import { Squircle } from "../components/Squircle";
import { signOut } from "next-auth/react";
import { ordinal } from "./details/helpers";

export type AccountShellInitial = { email: string; createdAt: string };

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

export function AccountShell({ initial }: { initial: AccountShellInitial }) {
    const [loggingOut, setLoggingOut] = useState(false);

    const [localPart, domainPart] = splitEmail(initial.email);
    const createdDate = formatCreatedAt(initial.createdAt);
    const createdLine = `Account created on ${createdDate}.`;
    const descriptionTail = "Includes Name, Phone Number,\nGender and Birthday";

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        await signOut({ callbackUrl: "/auth" });
    };

    return (
        <main className="flex-1 flex items-center  justify-center">
            <div className="flex-col">
                {/* User card */}
                <div className="bg-[#f1f1f1] rounded-3xl p-8 w-[300px] h-[300px] flex flex-col gap-6">
                    {/* Avatar + name/email */}
                    <div className="flex items-center gap-4">
                        <div className="w-[52px] h-[52px] rounded-full pb-[2px] bg-[#0000f4] flex items-center justify-center shrink-0">
                            <UserIcon className="w-[24px] h-[24px] text-white stroke-[#0000f4]" />
                        </div>
                        <div className="flex flex-col gap-1 w-full overflow-visible">
                            <SvgText text={localPart || " "} weight="600" height={16} className="text-[#1e1e1e] truncate" />
                            <SvgText text={domainPart || " "} weight="600" height={14} className="text-[#aaaaaa]" />
                        </div>
                    </div>

                    {/* Account description */}
                    <SvgText
                        text={`${createdLine}\n${descriptionTail}`}
                        weight="500"
                        height={14}
                        className="text-[#aaaaaa] leading-[1.5]"
                    />

                    {/* Navigation actions */}
                    <div className="flex flex-col gap-6 items-center mt-auto mb-2">
                        <Link href="/account/view-details" className="focus:outline-none">
                            <SvgText text="Details" weight="600" height={16} className="text-[#1e1e1e] hover:text-[#0000f4] transition-colors" />
                        </Link>
                        <Link href="/account/change-password" className="focus:outline-none">
                            <SvgText text="Change Password" weight="600" height={16} className="text-[#1e1e1e] hover:text-[#0000f4] transition-colors" />
                        </Link>
                    </div>
                </div>

                {/* Orders squircle */}
                <Link href="/account/orders">
                    <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[300px] h-[90px] mt-[10px]">
                        <div className="w-full h-full flex justify-center items-center cursor-pointer">
                            <SvgText text="Orders" weight="600" height={16} className="text-[#0000f4]" />
                        </div>
                    </Squircle>
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="group  mt-[10px] w-[120px] mx-auto rounded-full py-4 cursor-pointer hover:bg-[#ff0000] transition-colors focus:outline-none focus-visible:outline-none flex justify-center items-center"
                >
                    <SvgText text="Logout" weight="600" height={16} className="text-[#ff0000] group-hover:text-[#ffffff] transition-colors" />
                </button>
            </div>
        </main>
    );
}
