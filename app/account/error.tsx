"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { SvgText } from "../components/text/SvgText";

export default function AccountError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [retries, setRetries] = useState(0);

    useEffect(() => {
        // F15.2 — log only the digest. Client-side errors otherwise expose
        // raw stack messages (internal paths, fixture names) in browser
        // DevTools. The digest is enough to correlate with server logs.
        console.error("[account error]", error.digest ?? "no-digest");
    }, [error]);

    const handleReset = () => {
        setRetries((n) => n + 1);
        reset();
    };

    if (retries >= 2) {
        return (
            <main className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
                <img src="/assets/error%20svg.svg" alt="Error" className="w-[24px] h-[24px]" />
                
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/auth" })}
                    className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
                >
                    <SvgText text="Wrong Landing," weight="600" height={14} className="text-[#1e1e1e]" />
                    <SvgText text="back to Home" weight="600" height={14} className="text-[#0000f4]" />
                </button>
            </main>
        );
    }

    return (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
            <img src="/assets/error%20svg.svg" alt="Error" className="w-[24px] h-[24px]" />
            
            <button
                type="button"
                onClick={handleReset}
                className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
            >
                <SvgText text="Wrong Landing," weight="600" height={14} className="text-[#1e1e1e]" />
                <SvgText text="Try again" weight="600" height={14} className="text-[#0000f4]" />
            </button>
        </main>
    );
}
