"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AccountDetailsProvider, useAccountDetails } from "./_context";
import { SvgText } from "../../components/SvgText";
import { SPRING, STEP_SEGMENTS, STEP_ROUTES, MONTHS_FULL } from "./_constants";
import { ordinal } from "./_helpers";

const SLIDE_VARIANTS = {
    initial: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const {
        firstName, lastName,
        selDay, selMonth, yearPrefix, yearSuffix,
        gender,
        phone,
    } = useAccountDetails();

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

    const canNext = Boolean([
        firstName.trim() && lastName.trim(),
        selDay !== null && yearSuffix.length === suffixLen,
        gender,
        phone.every(d => d !== ""),
    ][stepIndex]);

    // ── Sidebar (completed steps above current) ───────────────────────────────
    const sidebarItems: { text: string; href: string }[] = [];
    if (stepIndex >= 1 && name) sidebarItems.push({ text: name, href: STEP_ROUTES[0] });
    if (stepIndex >= 2 && birthdayText) sidebarItems.push({ text: birthdayText, href: STEP_ROUTES[1] });
    if (stepIndex >= 3 && gender) sidebarItems.push({ text: gender, href: STEP_ROUTES[2] });

    const handleNext = () => {
        if (stepIndex < 3) router.push(STEP_ROUTES[stepIndex + 1]);
    };

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="flex gap-20 items-start">

                {/* ── Left sidebar ── */}
                <div className="absolute left-[10%] top-[30%] gap-5 w-[100px] p-2">
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
                <div className="flex flex-col items-center gap-2" style={{ width: 400 }}>
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

                    {/* Spacer */}
                    <div className="h-2" />

                    {/* Bottom actions */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        {stepIndex === 3 && (
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
                                    text={stepIndex === 3 ? "Proceed" : "Next"}
                                    weight="600" height={16}
                                />
                            </motion.div>
                        </motion.button>

                        <SvgText text="or" weight="600" height={14} className="text-[#1e1e1e]" />

                        <Link
                            href="/login"
                            className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 flex items-center justify-center hover:bg-[#0000f4] transition-colors group"
                        >
                            <SvgText text="Login" weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                        </Link>
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
