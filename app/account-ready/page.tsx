"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { Squircle } from "../components/layout/Squircle";
import { UserIcon } from "../components/icons/account/UserIcon";
import { AxcealFeatureIcon } from "../auth/components/AxcealFeatureIcon";
import { QuickCheckoutIcon } from "../auth/components/QuickCheckoutIcon";
import { SavedPreferencesIcon } from "../auth/components/SavedPreferencesIcon";
import { ReceiveUpdatesIcon } from "../auth/components/ReceiveUpdatesIcon";
import { RequestAssistanceIcon } from "../auth/components/RequestAssistanceIcon";
import { SecuredDataIcon } from "../auth/components/SecuredDataIcon";
import { sessionKeys, readSession, writeSession, clearSession } from "@/lib/sessionKeys";

type Pending = {
    signupSessionToken: string;
    from: string;
    issuedAt?: number;
    // W6 — waitlist signups skip the safety-details prompt entirely; the
    // landing page is `/?joined=1` which triggers the status popup.
    intent?: "waitlist";
};

// F15.7 — server-side TTL is 5 min on signupSessionToken
// (issuePendingMfaToken). Bail a hair earlier client-side so the user sees a
// clear message instead of NextAuth's generic "Could not sign in".
const PENDING_MAX_AGE_MS = 4.5 * 60 * 1000;

export default function AccountReadyPage() {
    const router = useRouter();
    const [pending, setPending] = useState<Pending | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // F16.2 / typed registry — `readSession` parses JSON, runs the shape
        // guard, and clears the entry on parse/shape failure so a malformed
        // payload (XSS plant, schema drift) routes the user to /login instead
        // of bubbling into the error boundary.
        const parsed = readSession<Pending>(
            sessionKeys.pendingSignup,
            (v): v is Pending =>
                !!v
                && typeof v === "object"
                && typeof (v as { signupSessionToken?: unknown }).signupSessionToken === "string",
        );
        if (!parsed) {
            router.replace("/auth");
            return;
        }
        // F15.7 — server-side token already expired? Don't show the Skip / Add
        // Safety Details UI just to have credentials-signup fail later. Clear
        // the stale entry and bounce to /login.
        if (typeof parsed.issuedAt === "number" && Date.now() - parsed.issuedAt > PENDING_MAX_AGE_MS) {
            clearSession(sessionKeys.pendingSignup);
            router.replace("/login?reason=signup-expired");
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPending(parsed);
    }, [router]);

    // W6 — waitlist signup: auto-sign-in and redirect to `/?joined=1` so the
    // home page opens the status popup. No UI prompt for safety details.
    useEffect(() => {
        if (!pending || pending.intent !== "waitlist") return;
        let cancelled = false;
        (async () => {
            const result = await signIn("credentials-signup", {
                signupSessionToken: pending.signupSessionToken,
                redirect: false,
            });
            if (cancelled) return;
            if (!result || result.error || !result.ok) {
                setError("Could not sign in. Please log in manually.");
                return;
            }
            clearSession(sessionKeys.pendingSignup);
            router.replace("/?joined=1");
        })();
        return () => {
            cancelled = true;
        };
    }, [pending, router]);

    const signInWithCreds = async (): Promise<boolean> => {
        if (!pending) return false;
        const result = await signIn("credentials-signup", {
            signupSessionToken: pending.signupSessionToken,
            redirect: false,
        });
        if (!result || result.error || !result.ok) {
            setError("Could not sign in. Please log in manually.");
            return false;
        }
        return true;
    };

    const handleSkip = async () => {
        if (!pending || submitting) return;
        setSubmitting(true);
        setError(null);
        const ok = await signInWithCreds();
        if (!ok) { setSubmitting(false); return; }
        clearSession(sessionKeys.pendingSignup);
        router.push(pending.from === "order" ? "/order/units" : "/");
    };

    const handleAddDetails = async () => {
        if (!pending || submitting) return;
        setSubmitting(true);
        setError(null);
        const ok = await signInWithCreds();
        if (!ok) { setSubmitting(false); return; }
        writeSession(sessionKeys.signupFrom, pending.from);
        clearSession(sessionKeys.pendingSignup);
        router.push("/account/details-unified");
    };

    if (!pending) return null;

    return (
        <main className="flex-1 flex flex-col items-center justify-center -mt-10">
            <div className="flex flex-col items-center gap-[10px] w-max max-w-full">
                {/* Squircle Rectangle */}
                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[320px] h-[400px] pt-[30px] px-[30px] pb-[40px] flex flex-col items-center">
                    {/* Header Icon */}
                    <div className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center shrink-0">
                        <UserIcon className="w-[24px] h-[24px] text-white" stroke="#0000f4" />
                    </div>

                    {/* Title */}
                    <div className="mt-2 shrink-0">
                        <SvgText text="Your Axceal Account is ready!" weight="600" height={16} className="text-[#1e1e1e]" />
                    </div>

                    {/* Features List */}
                    <div className="flex flex-col gap-[12px] pl-1 w-full mt-4">
                        <div className="flex items-center gap-3">
                            <AxcealFeatureIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Access to Axceal Tech" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <QuickCheckoutIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Quick Checkouts" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <SavedPreferencesIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Saved preferences" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <ReceiveUpdatesIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Receive Updates" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <RequestAssistanceIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Request Assistance" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <SecuredDataIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Secured personal data" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                    </div>
                    {/* Footer Text */}
                    <div className="flex flex-col items-center gap-1 mt-5 w-full">
                        <SvgText
                            text="Your details are private and securely stored with"
                            weight="500"
                            height={12}
                            className="text-[#aaaaaa]"
                        />
                        <div className="flex items-center">
                            <SvgText
                                text="Axceal. Take a look at"
                                weight="500"
                                height={12}
                                className="text-[#aaaaaa]"
                            />
                            <Link href="/privacy-policy" className="hover:opacity-80 transition-opacity">
                                <SvgText
                                    text=" Privacy Policies"
                                    weight="500"
                                    maxWidth={400}
                                    height={12}
                                    className="text-[#0000f4]"
                                />
                            </Link>
                        </div>
                    </div>
                </Squircle>

                {/* Bottom Pill */}
                <div className="w-[320px] bg-[#f1f1f1] rounded-full p-[5px] flex items-center justify-between">
                    <div className="flex-1 flex items-center justify-evenly">
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                            className="cursor-pointer flex-shrink-0 flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Skip" weight="600" height={16} className="text-[#0000f4]" />
                        </button>
                        <span className="block w-[10px] h-[10px] rounded-full bg-[#aaaaaa] flex-shrink-0" />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddDetails}
                        disabled={submitting}
                        className="cursor-pointer bg-[#0000f4] rounded-full px-[40px] py-[14px] flex items-center justify-center flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <SvgText text="Add Details" weight="600" height={16} className="text-white" />
                    </button>
                </div>

                {error && (
                    <div className="flex justify-center w-full mt-2">
                        <SvgText text={error} weight="600" align="center" height={14} className="text-[#ff0000]" />
                    </div>
                )}
            </div>
        </main>
    );
}
