"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SvgText } from "../components/SvgText";

export default function OrderError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [retries, setRetries] = useState(0);

    useEffect(() => {
        console.error("[order error]", error.digest ?? error.message);
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
                    <div className="flex gap-4">
                        <Link
                            href="/api/auth/signout?callbackUrl=/auth"
                            className="rounded-full px-6 py-3 bg-[#ff0000] focus:outline-none focus-visible:outline-none flex items-center"
                        >
                            <SvgText text="Sign out and try again" weight="600" height={14} className="text-white" />
                        </Link>
                        <Link
                            href="/"
                            className="rounded-full px-6 py-3 bg-[#f1f1f1] focus:outline-none focus-visible:outline-none flex items-center"
                        >
                            <SvgText text="Back to Store" weight="600" height={14} className="text-[#0000f4]" />
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <SvgText text="Something went wrong." weight="600" height={16} className="text-[#1e1e1e]" />
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-full px-6 py-3 bg-[#0000f4] focus:outline-none focus-visible:outline-none"
                    >
                        <SvgText text="Try again" weight="600" height={14} className="text-white" />
                    </button>
                    <Link
                        href="/"
                        className="rounded-full px-6 py-3 bg-[#f1f1f1] focus:outline-none focus-visible:outline-none flex items-center"
                    >
                        <SvgText text="Back to Store" weight="600" height={14} className="text-[#0000f4]" />
                    </Link>
                </div>
            </div>
        </main>
    );
}
