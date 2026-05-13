// Framer Motion spring config used across all home section transitions.
// Intentionally slow/floaty (stiffness 70, damping 15) to match the product feel.
export const SPRING = { type: "spring", stiffness: 70, damping: 15 } as const;

// Number of subslides inside S1 ("What can Aero do").
// Scroll exhausts subslides 0→N before advancing to the next section.
export const S1_SUBSLIDE_COUNT = 5;

// Left-nav label target positions for each active section.
// Constraint: top in % only (0 / 50 / 100%), y offsets in px only — never mix units
// in the same animated property (Framer Motion can't interpolate mixed units).
//   AeroText height ≈ 23px  → center offset -12px
//   WhatCan / WhatsInside height ≈ 69px → center offset -35px
export const NAV_S0 = {
  aero:        { top: "50%", y: "-12px", opacity: 1   },
  whatcan:     { top: "70%", y:  "27px", opacity: 0.4 },
  whatsinside: { top: "90%", y:  "20px", opacity: 0.4 },
} as const;

export const NAV_S1 = {
  aero:        { top:   "0%", y:  "20px", opacity: 0.4 },
  whatcan:     { top:  "50%", y: "-35px", opacity: 1   },
  whatsinside: { top: "100%", y: "-60px", opacity: 0.4 },
} as const;

export const NAV_S2 = {
  aero:        { top:  "0%", y:  "20px", opacity: 0.4 },
  whatcan:     { top:  "5%", y:  "60px", opacity: 0.4 },
  whatsinside: { top: "50%", y: "-35px", opacity: 1   },
} as const;

// Union type for whichever nav state is currently active
export type NavState = typeof NAV_S0 | typeof NAV_S1 | typeof NAV_S2;
