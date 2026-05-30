"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SvgText } from "../components/text/SvgText";
import { Squircle } from "../components/layout/Squircle";
import { AxcealLogo } from "../components/icons/brand/AxcealLogo";
import { sessionKeys, readSession, writeSession, clearSession } from "@/lib/sessionKeys";

type Pending = { signupSessionToken: string; from: string; issuedAt?: number };

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
        router.push("/account/details/name");
    };

    if (!pending) return null;

    return (
        <main className="flex-1 flex flex-col items-center justify-center -mt-10">
            <div className="flex flex-col items-stretch gap-[10px] w-max max-w-full">
                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] pt-6 pb-8 px-6 flex flex-col items-center gap-5">
                    <div className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center">
                        <AxcealLogo className="w-[20px] h-auto text-white mt-0.5" />
                    </div>

                    <SvgText
                        text={"Your Axceal Account is ready,\nEnter few additional safety details"}
                        weight="500"
                        height={16}
                        align="center"
                        className="text-[#aaaaaa] leading-[1.6]"
                    />
                </Squircle>
                <div className="bg-[#f1f1f1] rounded-full p-1">
                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                            className="bg-[#0000f4] rounded-full flex items-center justify-center px-8 py-4 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Skip" weight="600" height={16} className="text-white" />
                        </button>
                        <span
                            className="block w-[10px] aspect-square rounded-full bg-[#aaaaaa]"
                            aria-hidden
                        />
                        <button
                            type="button"
                            onClick={handleAddDetails}
                            disabled={submitting}
                            className="bg-[#0000f4] rounded-full flex items-center justify-center px-8 py-4 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Add safety details" weight="600" height={16} className="text-white" />
                        </button>
                    </div>
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
