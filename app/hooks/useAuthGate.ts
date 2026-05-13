"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// Set NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true in .env.local to disable all auth
// gating during development without touching production behaviour.
const SKIP = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH_GATES === "true";

/**
 * Redirects unauthenticated users to /auth?from=<current-path>.
 * Returns true while the session is still loading (so callers can
 * render nothing and avoid a content flash before the redirect fires).
 *
 *   const gating = useAuthGate();
 *   if (gating) return null;
 */
export function useAuthGate(): boolean {
    const { status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (SKIP || status !== "unauthenticated") return;
        router.replace(`/auth?from=${encodeURIComponent(pathname)}`);
    }, [status, router, pathname]);

    return !SKIP && status === "loading";
}
