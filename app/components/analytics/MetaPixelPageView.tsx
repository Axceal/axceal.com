"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMetaEvent } from "@/lib/analytics/metaPixel";

// Fires a Meta PageView on client-side route changes. The very first page
// load is already tracked by the base snippet in layout.tsx, so the initial
// render is skipped to avoid a duplicate PageView.
export function MetaPixelPageView() {
    const pathname = usePathname();
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        trackMetaEvent("PageView");
    }, [pathname]);

    return null;
}
