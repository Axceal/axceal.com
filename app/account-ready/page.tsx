"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SvgText } from "../components/SvgText";
import { AxcealLogo } from "../components/icons/AxcealLogo";

type Pending = { signupSessionToken: string; from: string };

export default function AccountReadyPage() {
    const router = useRouter();
    const [pending, setPending] = useState<Pending | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("pendingSignup");
        if (!raw) {
            router.replace("/auth");
            return;
        }
        // sessionStorage is only available client-side, so reading on mount
        // and then setting state is the standard pattern. The single setState
        // here cannot cascade — deps `[router]` are stable for the page's life.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPending(JSON.parse(raw) as Pending);
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
        sessionStorage.removeItem("pendingSignup");
        router.push(pending.from === "order" ? "/order/units" : "/");
    };

    const handleAddDetails = async () => {
        if (!pending || submitting) return;
        setSubmitting(true);
        setError(null);
        const ok = await signInWithCreds();
        if (!ok) { setSubmitting(false); return; }
        sessionStorage.setItem("signupFrom", pending.from);
        sessionStorage.removeItem("pendingSignup");
        router.push("/account/details/name");
    };

    if (!pending) return null;

    return (
        <main className="flex-1 flex flex-col items-center justify-center -mt-10">
            <div className="flex flex-col items-center gap-6">
                <div className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center">
                    <AxcealLogo className="w-[20px] h-auto text-white mt-0.5" />
                </div>

                <SvgText
                    text={"Your Axceal Account is ready,\nEnter few additional safety details"}
                    weight="600"
                    height={16}
                    align="center"
                    className="text-[#1e1e1e] leading-[1.6]"
                />
                <div className="bg-[#f1f1f1] rounded-full p-1">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                            className="bg-[#0000f4] rounded-full px-8 py-3.5 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Skip" weight="600" height={14} className="text-white" />
                        </button>
                        <span
                            className="block w-[10px] aspect-square rounded-full bg-[#aaaaaa]"
                            aria-hidden
                        />
                        <button
                            type="button"
                            onClick={handleAddDetails}
                            disabled={submitting}
                            className="bg-[#0000f4] rounded-full px-8 py-3.5 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Add safety details" weight="600" height={14} className="text-white" />
                        </button>
                    </div>
                </div>

                {error && (
                    <SvgText text={error} weight="600" height={12} className="text-[#e11d48]" />
                )}
            </div>
        </main>
    );
}
