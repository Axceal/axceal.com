import { describe, it, expect } from "vitest";

/**
 * Asserts that RSC pages and layouts in protected routes are marked
 * `dynamic = "force-dynamic"` so they always serve `cache-control: no-store`
 * and never get cached at the CDN or browser layer.
 */

const FORCE_DYNAMIC_PAGES = [
    () => import("@/app/account/page"),
    () => import("@/app/account/orders/page"),
    () => import("@/app/account/view-details/page"),
    () => import("@/app/order/confirmation/page"),
];

const FORCE_DYNAMIC_LAYOUTS = [
    () => import("@/app/account/layout"),
    () => import("@/app/order/layout"),
];

describe("RSC pages — force-dynamic export", () => {
    for (const loader of FORCE_DYNAMIC_PAGES) {
        it(`${loader.toString().match(/import\("([^"]+)"\)/)?.[1] ?? "page"} exports dynamic = force-dynamic`, async () => {
            const mod = await loader();
            expect((mod as Record<string, unknown>).dynamic).toBe("force-dynamic");
        });
    }
});

describe("Protected layouts — force-dynamic export", () => {
    for (const loader of FORCE_DYNAMIC_LAYOUTS) {
        it(`${loader.toString().match(/import\("([^"]+)"\)/)?.[1] ?? "layout"} exports dynamic = force-dynamic`, async () => {
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
