"use client";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/text/SvgText";
import { Stepper, type Step } from "../../components/feedback/Stepper";
import { useBillingShippingForm } from "./hooks/useBillingShippingForm";
import { AddressForm } from "./components/AddressForm";
import { useAuthGate } from "@/app/hooks/useAuthGate";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;

const STEPS: Step[] = [
    { label: "Order", state: "past", href: "/order/units" },
    { label: "Billing & Shipping", state: "current", href: "/order/billing-shipping" },
    { label: "Payment", state: "upcoming", href: "/order/payment" },
];

// useSearchParams() triggers a build-time CSR bailout unless the caller is
// wrapped in a Suspense boundary — do it at the page shell so the inner
// component can read qty inline.
export default function BillingShippingPage() {
    return (
        <Suspense fallback={null}>
            <BillingShippingPageInner />
        </Suspense>
    );
}

function BillingShippingPageInner() {
    const gating = useAuthGate();
    const {
        billing,
        shipping,
        correctedFields,
        setCorrectedFields,
        showShipping,
        setShowShipping,
        submitting,
        errorMsg,
        handleProceed,
    } = useBillingShippingForm();

    if (gating) return null;

    return (
        <main className="flex-1 flex flex-col items-center pt-4 pb-4">

            {/* ── Progress stepper ── */}
            <Stepper steps={STEPS} className="mb-16" />

            {/* ── Form area ── */}
            <div className="flex gap-10 md:gap-50 items-start flex-wrap justify-center w-full px-4">

                {/* ── Billing Address ── */}
                <AddressForm
                    form={billing}
                    correctedFields={correctedFields}
                    setCorrectedFields={setCorrectedFields}
                    title="Billing Address"
                    nameLabel={showShipping ? "Payer's" : "Payer's "}
                    fieldPrefix="b"
                    footer={
                        <div className="flex items-center gap-2">
                            <SvgText text="Deliver To" weight="600" height={14} className="text-[#1e1e1e] shrink-0" />
                            <button
                                type="button"
                                onClick={() => setShowShipping(false)}
                                className="flex-1 flex justify-center items-center bg-[#f1f1f1] rounded-full px-4 py-[18px] cursor-pointer focus:outline-none focus-visible:outline-none"
                            >
                                <SvgText
                                    text="Billing Address"
                                    weight="600"
                                    height={14}
                                    className={!showShipping ? "text-[#0000f4]" : "text-[#aaaaaa]"}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowShipping(true)}
                                className={`flex-1 flex justify-center items-center rounded-full px-4 py-[18px] cursor-pointer transition-colors focus:outline-none focus-visible:outline-none ${showShipping ? "bg-[#0000f4]" : "bg-[#f1f1f1]"}`}
                            >
                                <SvgText
                                    text="Shipping Address"
                                    weight="600"
                                    height={14}
                                    className={showShipping ? "text-white" : "text-[#1e1e1e]"}
                                />
                            </button>
                        </div>
                    }
                />

                {/* ── Shipping Address ── */}
                <AnimatePresence>
                    {showShipping && (
                        <motion.div
                            initial={{ opacity: 0, x: 32 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 32 }}
                            transition={SPRING}
                            className="w-full max-w-[430px]"
                        >
                            <AddressForm
                                form={shipping}
                                correctedFields={correctedFields}
                                setCorrectedFields={setCorrectedFields}
                                title="Shipping Address"
                                nameLabel="Receiver's"
                                fieldPrefix="s"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Proceed button ── */}
            <div className="flex flex-col items-center mt-14 gap-3">
                {errorMsg && (
                    <SvgText text={errorMsg} weight="600" height={12} className="text-[#ff0000]" />
                )}
                <button
                    onClick={handleProceed}
                    disabled={submitting}
                    type="button"
                    className="bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group focus:outline-none focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <SvgText text={submitting ? "Placing order..." : "Proceed"} weight="600" height={16} className="text-[#aaaaaa] group-hover:text-white" />
                </button>
            </div>

        </main>
    );
}
