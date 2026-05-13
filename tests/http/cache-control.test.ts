import { describe, it, expect } from "vitest";

/**
 * Asserts that RSC pages with `export const dynamic = "force-dynamic"` set
 * Cache-Control: no-store (no caching of authenticated pages).
 *
 * These tests call the route handlers directly via next/test-utils or just
 * verify the `dynamic` export is present in each page module.
 */

const FORCE_DYNAMIC_PAGES = [
    () => import("@/app/account/page"),
    () => import("@/app/account/orders/page"),
    () => import("@/app/account/view-details/page"),
    () => import("@/app/order/confirmation/page"),
];

describe("RSC pages — force-dynamic export", () => {
    for (const loader of FORCE_DYNAMIC_PAGES) {
        it(`${loader.toString().match(/import\("([^"]+)"\)/)?.[1] ?? "page"} exports dynamic = force-dynamic`, async () => {
            const mod = await loader();
            expect((mod as Record<string, unknown>).dynamic).toBe("force-dynamic");
        });
    }
});

describe("Home page — no force-dynamic (static)", () => {
    it("app/page exports no dynamic override (statically generated)", async () => {
        const mod = await import("@/app/page");
        expect((mod as Record<string, unknown>).dynamic).toBeUndefined();
    });
});
