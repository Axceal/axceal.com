"use client";
import { useEffect, useState } from "react";

// Drives the post-hydration dual-tree unmount in HomeClient. Initial state is
// "both" so SSR HTML and first client paint contain the mobile + desktop
// trees (matches today's HTML exactly — no FOUC, no CLS, crawlers still see
// both subtrees). Once mounted, matchMedia collapses to the active viewport
// and the off-viewport subtree unmounts. Visual diff is zero because the
// hidden subtree was already `display:none` via Tailwind responsive utilities.
//
// MD_BREAKPOINT mirrors Tailwind's `md:` breakpoint (768px). Update both if
// the design system changes the value.
export type ResponsiveMode = "both" | "mobile" | "desktop";

const MD_BREAKPOINT_QUERY = "(min-width: 768px)";

export function useResponsiveMode(): ResponsiveMode {
  const [mode, setMode] = useState<ResponsiveMode>("both");

  useEffect(() => {
    const m = window.matchMedia(MD_BREAKPOINT_QUERY);
    const sync = () => setMode(m.matches ? "desktop" : "mobile");
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  return mode;
}
