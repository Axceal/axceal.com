"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Sitewide custom page scrollbar.
 *
 * - Mounted once in the root layout; it auto-shows only when the document is
 *   actually scrollable (and scrolling isn't locked by a modal), so short pages
 *   never render a visible bar.
 * - Zero React re-renders while scrolling: geometry is measured only on
 *   resize/DOM-size changes (ResizeObserver), and the thumb position is written
 *   straight to the DOM via a rAF-throttled `transform` (GPU-composited).
 * - Native scrollbar is hidden in globals.css; keyboard / wheel / touch scroll
 *   keep working natively. The thumb is draggable and the track is clickable.
 */

const TRACK_HEIGHT = 200;
const MIN_THUMB_HEIGHT = 24;

// Inline (not global CSS) so the bar is always out of layout flow and can
// never shift page content, whatever happens to stylesheet processing.
const TRACK_STYLE: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  right: 100,
  zIndex: 60,
  width: 10,
  height: TRACK_HEIGHT,
  borderRadius: 9999,
  background: "#aaaaaa85",
  overflow: "hidden",
  transform: "translateY(-50%)",
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  transition: "opacity 200ms ease, visibility 200ms",
  cursor: "pointer",
  touchAction: "none",
};

const THUMB_STYLE: React.CSSProperties = {
  width: 10,
  height: TRACK_HEIGHT,
  borderRadius: 9999,
  background: "#eeeeee",
  willChange: "transform",
  cursor: "grab",
};

export function PageScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const root = document.documentElement;
    const body = document.body;
    // Touch devices keep native behaviour. Also hide unconditionally on mobile viewports (<768px).
    const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");

    // Initialize to null so the first measure() forces a DOM update even if the
    // effect is just re-running on a route change (where the DOM node might already be visible).
    let active: boolean | null = null;
    let thumbHeight = TRACK_HEIGHT;
    let maxScroll = 0;
    let frame = 0;

    const travel = () => TRACK_HEIGHT - thumbHeight;

    const paint = () => {
      frame = 0;
      if (!active) return;
      // Always recalculate maxScroll during paint so it's never outdated
      const currentMaxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
      const progress = currentMaxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / currentMaxScroll)) : 0;
      thumb.style.transform = `translate3d(0, ${progress * travel()}px, 0)`;
    };

    const schedulePaint = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const isScrollLocked = () =>
      getComputedStyle(root).overflowY === "hidden" ||
      getComputedStyle(body).overflowY === "hidden";

    const measure = () => {
      const viewport = root.clientHeight;
      const content = root.scrollHeight;
      maxScroll = Math.max(0, content - viewport);

      const isMobileViewport = window.innerWidth < 769;
      const next = maxScroll > 1 && !isScrollLocked() && !coarsePointer.matches && !isMobileViewport;
      if (next !== active) {
        active = next;
        track.style.opacity = next ? "1" : "0";
        track.style.visibility = next ? "visible" : "hidden";
        track.style.pointerEvents = next ? "auto" : "none";
      }
      if (!next) return;

      thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        Math.min(TRACK_HEIGHT, Math.round((TRACK_HEIGHT * viewport) / content)),
      );
      thumb.style.height = `${thumbHeight}px`;
      schedulePaint();
    };

    // --- Drag thumb ---------------------------------------------------------
    let dragStartY = 0;
    let dragStartScroll = 0;

    const onThumbPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragStartY = e.clientY;
      dragStartScroll = window.scrollY;
      thumb.setPointerCapture(e.pointerId);
      thumb.style.cursor = "grabbing";
      body.style.userSelect = "none";
    };

    const onThumbPointerMove = (e: PointerEvent) => {
      if (!thumb.hasPointerCapture(e.pointerId)) return;
      const range = travel();
      if (range <= 0) return;
      const delta = ((e.clientY - dragStartY) / range) * maxScroll;
      window.scrollTo({ top: dragStartScroll + delta, behavior: "instant" });
    };

    const endDrag = (e: PointerEvent) => {
      if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
      thumb.style.cursor = "grab";
      body.style.userSelect = "";
    };

    // --- Click on track: jump so the thumb centres on the click point -------
    const onTrackPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.target === thumb) return;
      const range = travel();
      if (range <= 0) return;
      const offset = e.clientY - track.getBoundingClientRect().top - thumbHeight / 2;
      const progress = Math.min(1, Math.max(0, offset / range));
      window.scrollTo({ top: progress * maxScroll, behavior: "smooth" });
    };

    // --- Observers -----------------------------------------------------------
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    resizeObserver.observe(body);

    // Catch scroll-lock toggles and content changes (accordions, images, navigation)
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ["style", "class"] });
    mutationObserver.observe(body, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });

    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    coarsePointer.addEventListener("change", measure);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    thumb.addEventListener("pointermove", onThumbPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    track.addEventListener("pointerdown", onTrackPointerDown);

    measure();
    // Also paint immediately in case scroll isn't 0
    schedulePaint();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", measure);
      coarsePointer.removeEventListener("change", measure);
      thumb.removeEventListener("pointerdown", onThumbPointerDown);
      thumb.removeEventListener("pointermove", onThumbPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      track.removeEventListener("pointerdown", onTrackPointerDown);
    };
  }, [pathname]);

  return (
    <div ref={trackRef} style={TRACK_STYLE} aria-hidden="true">
      <div ref={thumbRef} style={THUMB_STYLE} />
    </div>
  );
}
