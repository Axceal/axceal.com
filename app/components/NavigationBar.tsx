"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AxcealLogo } from "./icons/AxcealLogo";
import { UserIcon } from "./icons/UserIcon";
import { SvgText } from "./SvgText";

export function NavigationBar() {
    const pathname = usePathname();
    const isAccount = pathname === "/account" || pathname === "/login" || pathname === "/create-account";

    return (
        <nav className="h-[75px] flex items-center justify-between px-30">
            <Link href="/" className="flex flex-row gap-[10px]">
                <AxcealLogo className="w-[26px] h-[18px] text-black" />
                <SvgText
                    text="Axceal"
                    weight="600"
                    className="text-black mt-[1px]"
                    height={16}
                />
            </Link>

            <Link
                href="/account"
                className={`flex items-center gap-2 text-[16px] font-semibold px-5 py-3.5 rounded-full transition-colors ${isAccount ? "bg-[#1e1e1e] text-white" : "bg-transparent text-[#1e1e1e]"
                    }`}
            >
                <UserIcon className={`w-[20px] h-[20px] ${isAccount ? "text-white" : "text-[#aaaaaa]"}`} stroke={isAccount ? "#1e1e1e" : "white"} />
                <SvgText text="Account" weight="600" height={18} className={`h-[13px] ${isAccount ? "text-white" : "text-[#1e1e1e]"}`} />
            </Link>
        </nav>
    );
}
