// X (Twitter) Ads conversion tracking.
// Base pixel is injected sitewide from app/layout.tsx; event helpers below
// are safe to call before uwt.js finishes loading because the base snippet
// stubs `window.twq` with a queue.

export const X_PIXEL_ID = "rga7m";

export const X_EVENTS = {
    signUp: "tw-rga7m-rge5u",
} as const;

type TwqFn = (command: string, ...args: unknown[]) => void;

declare global {
    interface Window {
        twq?: TwqFn;
    }
}

/** Inline base code for X conversion tracking (rendered via next/script). */
export const X_PIXEL_BASE_SNIPPET = `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${X_PIXEL_ID}');`;

export function trackXEvent(eventId: string, params: Record<string, unknown> = {}) {
    if (typeof window === "undefined" || typeof window.twq !== "function") return;
    try {
        window.twq("event", eventId, params);
    } catch {
        // Tracking must never break the user flow.
    }
}

/** Fires the X "Sign Up" conversion once an account is successfully created.
 *  No PII (email/phone) is sent to X by design. */
export function trackXSignUp() {
    trackXEvent(X_EVENTS.signUp);
}
