"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { Squircle } from "../components/layout/Squircle";
import { OrdersIcon } from "../components/icons/account/OrdersIcon";
import { AnchorDockIcon } from "../components/icons/brand/AnchorDockIcon";
import { signOut } from "next-auth/react";

export function AccountShell({ userCard }: { userCard: ReactNode }) {
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        await signOut({ callbackUrl: "/auth" });
    };

    return (
        <main className="flex-1 flex items-center  justify-center">
            <div className="flex-col">
                {userCard}

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
