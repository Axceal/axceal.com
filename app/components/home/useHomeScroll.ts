"use client";
import { useState, useEffect, useRef } from "react";
import { S1_SUBSLIDE_COUNT } from "./constants";

// Manages section (0–2) and subSlide (0–4) navigation via wheel, keyboard, and touch.
// Desktop only — all handlers early-exit when window.innerWidth < 768.
//
// Why refs alongside state:
//   Event listeners are registered once ([] deps). Without refs, handlers would
//   close over the initial state values (0) and never see updates.
export function useHomeScroll() {
  const [section, setSection] = useState(0);
  const [subSlide, setSubSlide] = useState(0);
  const sectionRef = useRef(0);
  const subSlideRef = useRef(0);

  // 900ms debounce prevents rapid-fire section jumps from momentum scrolling
  const locked = useRef(false);
  const touchStartY = useRef(0);

  // Keep refs in sync with state so event handlers always read current values
  const goSection = (next: number) => { sectionRef.current = next; setSection(next); };
  const goSubSlide = (next: number) => { subSlideRef.current = next; setSubSlide(next); };

  useEffect(() => {
    const slide = (dir: 1 | -1) => {
      if (locked.current) return;
      locked.current = true;

      const cur = sectionRef.current;

      if (cur === 1) {
        // S1 has subslides — exhaust them before crossing to the next section
        const nextSub = subSlideRef.current + dir;
        if (nextSub >= 0 && nextSub < S1_SUBSLIDE_COUNT) {
          goSubSlide(nextSub);
          setTimeout(() => { locked.current = false; }, 900);
          return;
        }
        // Subslides exhausted — change section and reset subslide to 0
        const nextSec = Math.min(2, Math.max(0, cur + dir));
        if (nextSec !== cur) { goSubSlide(0); goSection(nextSec); }
        setTimeout(() => { locked.current = false; }, 900);
        return;
      }

      goSection(Math.min(2, Math.max(0, cur + dir)));
      setTimeout(() => { locked.current = false; }, 900);
    };

    const onWheel = (e: WheelEvent) => {
      if (window.innerWidth < 768) return; // mobile scrolls normally
      e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return;  // ignore tiny trackpad noise
      slide(e.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth < 768) return;
      if (["ArrowDown", "PageDown"].includes(e.key)) slide(1);
      else if (["ArrowUp", "PageUp"].includes(e.key)) slide(-1);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth < 768) return;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (window.innerWidth < 768) return;
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 40) slide(diff > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return { section, subSlide, goSection, goSubSlide };
}
