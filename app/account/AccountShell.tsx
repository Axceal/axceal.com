"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { Squircle } from "../components/layout/Squircle";
import { OrdersIcon } from "../components/icons/account/OrdersIcon";
import { AnchorDockIcon } from "../components/icons/brand/AnchorDockIcon";
import { signOut } from "next-auth/react";
import { isWaitlist } from "@/lib/featureFlags";
import { useWaitlistStatus } from "../hooks/useWaitlistStatus";
import { formatPosition } from "@/lib/format";

export function AccountShell({ userCard }: { userCard: ReactNode }) {
    const [loggingOut, setLoggingOut] = useState(false);
    const waitlistMode = isWaitlist();
    const waitlistStatus = useWaitlistStatus();

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        await signOut({ callbackUrl: "/auth" });
    };

    // W9 polish — only render the position when it's known. Loading/error
    // states render an invisible spacer of the same line height so the
    // Logout button below doesn't jump when the status resolves.
    const queueReady = waitlistStatus.kind === "in";

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
                {userCard}

                {waitlistMode ? (
                    // W7 — Orders + Anchor Dock cards are hidden in waitlist
                    // mode. Position renders as plain blue text above Logout
                    // (matches the spec mock).
                    <div className="relative z-0 -mt-[40px] flex justify-center min-h-[106px] items-start">
                        {queueReady ? (
                            <Squircle borderRadius={24} smoothing={50} className="bg-[#0000f4] w-[300px] pt-[65px] pb-[25px] flex justify-center items-center">
                                <SvgText
                                    text={`In Queue at ${formatPosition(waitlistStatus.position)}`}
                                    weight="600"
                                    height={16}
                                    className="text-white"
                                />
                            </Squircle>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <Link href="/account/orders">
                            <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[300px] h-[90px] mt-[10px]">
                                <div className="w-full h-full flex justify-center items-center gap-3 cursor-pointer">
                                    <OrdersIcon className="text-[#0000f4]" />
                                    <SvgText text="Orders" weight="600" height={16} className="text-[#0000f4]" />
                                </div>
                            </Squircle>
                        </Link>
                        <Link href="/account/anchor-dock">
                            <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[300px] h-[90px] mt-[10px]">
                                <div className="w-full h-full flex justify-center items-center gap-3 cursor-pointer">
                                    <AnchorDockIcon className="text-[#0000f4]" />
                                    <SvgText text="Anchor Dock" weight="600" height={16} className="text-[#0000f4]" />
                                </div>
                            </Squircle>
                        </Link>
                    </>
                )}
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="group  mt-[20px] w-[120px] mx-auto rounded-full py-4 cursor-pointer hover:bg-[#ff0000] transition-colors focus:outline-none focus-visible:outline-none flex justify-center items-center"
                >
                    <SvgText text="Logout" weight="600" height={16} className="text-[#ff0000] group-hover:text-[#ffffff] transition-colors" />
                </button>
            </div>
        </main>
    );
}
