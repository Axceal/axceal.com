// Meta (Facebook) Pixel.
// Base code is injected sitewide from app/layout.tsx. The initial PageView is
// fired by the base snippet itself; subsequent client-side route changes are
// tracked by <MetaPixelPageView /> because App Router navigations don't
// reload the page.

export const META_PIXEL_ID = "1851279246063270";

type FbqFn = (command: string, ...args: unknown[]) => void;

declare global {
    interface Window {
        fbq?: FbqFn;
    }
}

/** Inline base code for Meta Pixel (rendered via next/script). */
export const META_PIXEL_BASE_SNIPPET = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`;

/** Standard Meta event (e.g. "PageView", "CompleteRegistration", "Lead"). */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    try {
        if (params) window.fbq("track", event, params);
        else window.fbq("track", event);
    } catch {
        // Tracking must never break the user flow.
    }
}

/** Fires Meta's standard "CompleteRegistration" once an account is created.
 *  No PII (email/phone) is sent to Meta by design. */
export function trackMetaSignUp() {
    trackMetaEvent("CompleteRegistration");
}
