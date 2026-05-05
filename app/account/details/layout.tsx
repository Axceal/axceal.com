"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AccountDetailsProvider, useAccountDetails } from "./context";
import { apiFetch } from "@/lib/http/client";
import { SvgText } from "../../components/SvgText";
import { SPRING, STEP_SEGMENTS, STEP_ROUTES, MONTHS_FULL } from "./constants";
import { ordinal } from "./helpers";

const SLIDE_VARIANTS = {
    initial: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

const GENDER_UI_TO_SERVER: Record<string, "female" | "male" | "private"> = {
    "Female": "female",
    "Male": "male",
    "Keep it Private": "private",
};

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const {
        firstName, lastName,
        selDay, selMonth, yearPrefix, yearSuffix,
        gender,
        country, phone, phoneSign,
        phoneOtpSent, setPhoneOtpSent,
        phoneOtp,
        onSendPhoneOtp, onVerifyPhoneOtp,
    } = useAccountDetails();

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ── Step index ────────────────────────────────────────────────────────────
    const segment = pathname.split("/").pop() ?? "";
    const stepIndex = STEP_SEGMENTS.indexOf(segment as typeof STEP_SEGMENTS[number]);

    // Track direction (forward = 1, back = -1)
    const prevIndexRef = useRef(stepIndex);
    const dir = stepIndex >= prevIndexRef.current ? 1 : -1;
    useEffect(() => { prevIndexRef.current = stepIndex; });

    // ── Derived ───────────────────────────────────────────────────────────────
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const suffixLen = 2;
    const year = yearPrefix + yearSuffix;

    const birthdayText =
        selDay !== null && yearSuffix.length === suffixLen
            ? `${ordinal(selDay)} ${MONTHS_FULL[selMonth]} ${year}`
            : null;

    const isBirthdayValid = (() => {
        if (selDay === null || yearSuffix.length !== suffixLen) return false;
        const birth = new Date(parseInt(yearPrefix + yearSuffix), selMonth, selDay);
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 13);
        return birth <= cutoff;
    })();

    const canNext = Boolean([
        firstName.trim().length >= 2 && lastName.trim().length >= 2,
        isBirthdayValid,
        gender,
        phoneOtpSent
            ? phoneOtp.every(d => d !== "")   // OTP entry: all 6 digits filled
            : phone.every(d => d !== ""),      // Phone entry: all digits filled
    ][stepIndex]) && !submitting;

    // ── Sidebar (completed steps above current) ───────────────────────────────
    const sidebarItems: { text: string; href: string }[] = [];
    if (stepIndex >= 1 && name) sidebarItems.push({ text: name, href: STEP_ROUTES[0] });
    if (stepIndex >= 2 && birthdayText) sidebarItems.push({ text: birthdayText, href: STEP_ROUTES[1] });
    if (stepIndex >= 3 && gender) sidebarItems.push({ text: gender, href: STEP_ROUTES[2] });

    const buildStepPatch = (): Record<string, unknown> | null => {
        if (stepIndex === 0) {
            return {
                firstName: firstName.trim() || null,
                lastName: lastName.trim() || null,
            };
        }
        if (stepIndex === 1) {
            if (selDay === null || yearSuffix.length !== suffixLen) return null;
            const yyyy = yearPrefix + yearSuffix;
            const mm = String(selMonth + 1).padStart(2, "0");
            const dd = String(selDay).padStart(2, "0");
            return { birthday: `${yyyy}-${mm}-${dd}` };
        }
        if (stepIndex === 2) {
            if (!gender) return null;
            const mapped = GENDER_UI_TO_SERVER[gender];
            if (!mapped) return null;
            return { gender: mapped };
        }
        if (stepIndex === 3) {
            if (!phone.every(d => d !== "")) return null;
            const code = country.code.replace(/\D/g, "");
            return {
                phoneCountryCode: code,
                phone: phone.join(""),
                phoneSign,
            };
        }
        return null;
    };

    const handleNext = async () => {
        if (!canNext || submitting) return;

        // Step 3 — "Send": trigger OTP via phone page callback
        if (stepIndex === 3 && !phoneOtpSent) {
            setSubmitting(true);
            setErrorMsg(null);
            try {
                const sent = await onSendPhoneOtp.current?.();
                if (sent) setPhoneOtpSent(true);
            } catch {
                setErrorMsg("Could not send OTP. Please try again.");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // Step 3 — "Proceed": verify OTP, save phone, redirect
        if (stepIndex === 3 && phoneOtpSent) {
            setSubmitting(true);
            setErrorMsg(null);
            try {
                const verified = await onVerifyPhoneOtp.current?.();
                if (!verified) return;
                const patch = buildStepPatch();
                if (!patch) return;
                const res = await apiFetch("/api/account/profile", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(patch),
                });
                const body = await res.json().catch(() => null);
                if (!res.ok || !body?.ok) {
                    setErrorMsg(body?.error?.message ?? "Could not save. Please try again.");
                    return;
                }
                const from = sessionStorage.getItem("signupFrom") ?? "";
                sessionStorage.removeItem("signupFrom");
                router.push(from === "order" ? "/order/units" : "/");
            } catch {
                setErrorMsg("Network error. Please try again.");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // Steps 0–2: save per step
        const patch = buildStepPatch();
        if (!patch) return;

        setSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await apiFetch("/api/account/profile", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(patch),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Could not save. Please try again.");
                return;
            }
        } catch {
            setErrorMsg("Network error. Please try again.");
            return;
        } finally {
            setSubmitting(false);
        }

        router.push(STEP_ROUTES[stepIndex + 1]);
    };

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex gap-20 items-start">

                {/* ── Left sidebar ── */}
                <div className="absolute left-[10%] top-[30%] gap-1 w-[100px] p-2 hidden lg:flex flex-col">
                    {sidebarItems.map(item => (
                        <motion.button
                            key={item.text}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={SPRING}
                            onClick={() => router.push(item.href)}
                            className="flex items-center gap-3 pt-2 cursor-pointer text-left group"
                        >
                            <div className="w-[2.5px] h-8 bg-[#0000f4] pt-2 gap-5 rounded-full shrink-0" />
                            <SvgText
                                text={item.text}
                                weight="600" height={16}
                                className="text-[#aaaaaa] group-hover:text-[#1e1e1e] transition-colors"
                            />
                        </motion.button>
                    ))}

                </div>

                {/* ── Main content ── */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[400px] px-4 sm:px-0">
                    <SvgText text="Account Details" weight="600" height={20} className="text-[#1e1e1e] mt-[10px]" />

                    {/* Animated step content */}
                    <div className="relative overflow-visible w-full" style={{ height: 400 }}>
                        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                            <motion.div
                                key={pathname}
                                custom={dir}
                                variants={SLIDE_VARIANTS}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={SPRING}
                                className="w-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Spacer / error */}
                    <div className="h-6 flex items-center justify-center text-center">
                        {errorMsg && (
                            <SvgText text={errorMsg} weight="600" height={12} className="text-[#e11d48]" />
                        )}
                    </div>

                    {/* Bottom actions */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        {stepIndex === 3 && phoneOtpSent && (
                            <SvgText text="Clicking on proceed confirms your agreement with Axceal&apos;s Terms and conditions" weight="600" height={12} />
                        )}

                        <motion.button
                            onClick={handleNext}
                            animate={{ backgroundColor: canNext ? "#0000f4" : "#f1f1f1" }}
                            transition={SPRING}
                            disabled={!canNext}
                            className="w-fit rounded-full px-10 py-4.5 cursor-pointer flex items-center justify-center"
                            style={{ pointerEvents: canNext ? "auto" : "none" }}
                        >
                            <motion.div animate={{ color: canNext ? "#ffffff" : "#aaaaaa" }} transition={SPRING} className="flex items-center justify-center text-center">
                                <SvgText
                                    text={submitting ? "Saving..." : stepIndex === 3 ? (phoneOtpSent ? "Proceed" : "Send") : "Next"}
                                    weight="600" height={16}
                                />
                            </motion.div>
                        </motion.button>

                    </div>
                </div>

            </div>
        </main>
    );
}

export default function AccountDetailsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountDetailsProvider>
            <LayoutContent>{children}</LayoutContent>
        </AccountDetailsProvider>
    );
}
