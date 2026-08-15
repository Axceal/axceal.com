"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { SvgText } from "../components/text/SvgText";
import { ErrorIcon } from "../components/icons/state/ErrorIcon";

export default function OrderError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [retries, setRetries] = useState(0);

    useEffect(() => {
        // F15.2 — see comment in app/account/error.tsx.
        console.error("[order error]", error.digest ?? "no-digest");
    }, [error]);

    const handleReset = () => {
        setRetries((n) => n + 1);
        reset();
    };

    if (retries >= 2) {
        return (
            <main className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
                <ErrorIcon className="w-[24px] h-[24px]" />
                
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/auth" })}
                        className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
                    >
                        <SvgText text="Sign out," weight="600" height={14} className="text-[#1e1e1e]" />
                        <SvgText text="try again" weight="600" height={14} className="text-[#0000f4]" />
                    </button>
                    <Link
                        href="/"
                        className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
                    >
                        <SvgText text="Back to" weight="600" height={14} className="text-[#1e1e1e]" />
                        <SvgText text="Store" weight="600" height={14} className="text-[#0000f4]" />
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
            <ErrorIcon className="w-[24px] h-[24px]" />
            
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={handleReset}
                    className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
                >
                    <SvgText text="Something failed," weight="600" height={14} className="text-[#1e1e1e]" />
                    <SvgText text="Try again" weight="600" height={14} className="text-[#0000f4]" />
                </button>
                <Link
                    href="/"
                    className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
                >
                    <SvgText text="Back to" weight="600" height={14} className="text-[#1e1e1e]" />
                    <SvgText text="Store" weight="600" height={14} className="text-[#0000f4]" />
                </Link>
            </div>
        </main>
    );
}
