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
            <main className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <SvgText text="Something went wrong." weight="600" height={16} className="text-[#1e1e1e]" />
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/auth" })}
                        className="rounded-full px-6 py-3 bg-[#ff0000] cursor-pointer focus:outline-none focus-visible:outline-none flex items-center"
                    >
                        <SvgText text="Sign out and try again" weight="600" height={14} className="text-white" />
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <SvgText text="Something went wrong." weight="600" height={16} className="text-[#1e1e1e]" />
                <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full px-6 py-3 bg-[#0000f4] focus:outline-none focus-visible:outline-none"
                >
                    <SvgText text="Try again" weight="600" height={14} className="text-white" />
                </button>
            </div>
        </main>
    );
}
