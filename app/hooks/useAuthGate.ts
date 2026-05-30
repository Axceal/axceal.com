"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// Set NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true in .env.local to disable all auth
// gating during development without touching production behaviour.
// F15.1 — `lib/env.ts` refuses to boot in NODE_ENV=production when this is
// set, so a misconfigured build fails closed at startup. Defense-in-depth
// NODE_ENV guard here in case this module is reached without lib/env.ts
// having been imported (e.g. tree-shaking edge cases).
const SKIP =
    process.env.NODE_ENV !== "production"
    && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH_GATES === "true";

/**
 * Redirects unauthenticated users to /auth?from=<current-path>.
 * Returns true while the session is still loading (so callers can
 * render nothing and avoid a content flash before the redirect fires).
 *
 *   const gating = useAuthGate();
 *   if (gating) return null;
 *
 * ── F15.6 — Layered auth defense ─────────────────────────────────────────
 * This hook is a UX gate only. It is NOT an auth boundary. The actual
 * gates that protect protected pages and APIs are, in order:
 *
 *   1. middleware.ts — matches PROTECTED_PAGE / PROTECTED_API regexes and
 *      either redirects to /auth?from=... (pages) or returns 401 (API). Runs
 *      at the edge before any route code.
 *   2. Layout-level `getSession() + redirect()` in app/account/layout.tsx
 *      and app/order/layout.tsx (added in F11.6). Catches the case where a
 *      future PROTECTED_PAGE regex misses a new sub-route.
 *   3. Per-route `requireSession()` in every protected API handler and the
 *      `getSession() + redirect()` at the top of every protected RSC page.
 *      The last and authoritative gate — IDOR queries scope by
 *      `session.userId`, so removing this line opens cross-user reads.
 *
 * Removing any one of these layers is a security regression. This hook can
 * be removed without consequence; layers 1–3 cannot.
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
