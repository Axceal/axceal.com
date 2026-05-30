"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AxcealLogo } from "../icons/brand/AxcealLogo";
import { UserIcon } from "../icons/account/UserIcon";
import { SvgText } from "../text/SvgText";

export function NavigationBar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const isAccount = pathname === "/account" || pathname === "/login" || pathname === "/create-account" || pathname === "/auth" || pathname === "/forgot-password" || pathname === "/account-ready";
    // While session still resolving, point to /account. Server guard at
    // /account redirects unauthed users to /auth — same end state, no flash
    // for authed users who clicked before SessionProvider hydrated.
    const accountHref = status === "loading" || session ? "/account" : "/auth";

    return (
        <nav className="h-[75px] flex items-center justify-between px-[clamp(1.5rem,8vw,7.5rem)] sticky top-0 z-50 bg-white">
            <Link href="/" className="flex flex-row gap-[10px]">
                <AxcealLogo className="w-[26px] h-[18px] text-[#0000f4]" />
                <SvgText
                    text="Axceal"
                    weight="600"
                    className="text-[#0000f4] mt-[1px]"
                    height={16}
                />
            </Link>

            <Link
                href={accountHref}
                className={`flex items-center gap-2 text-[16px] font-semibold px-6 py-3.5 rounded-full transition-colors ${isAccount ? "bg-[#1e1e1e] text-white" : "bg-transparent text-[#1e1e1e]"
                    }`}
            >
                <UserIcon className={`w-[20px] h-[20px] ${isAccount ? "text-white" : "text-[#aaaaaa]"}`} stroke={isAccount ? "#1e1e1e" : "#ffffff"} />
                <SvgText text="Account" weight="600" height={16} className={`h-[14px] mt-[1px] ${isAccount ? "text-white" : "text-[#1e1e1e]"}`} />
            </Link>
        </nav>
    );
}
