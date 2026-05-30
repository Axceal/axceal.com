"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import Script from "next/script";
import { SvgText } from "../../components/text/SvgText";
import { Stepper, type Step } from "../../components/feedback/Stepper";
import { apiFetch } from "@/lib/http/client";
import { AeroIcon } from "../../components/icons/brand/AeroIcon";
import { Squircle } from "../../components/layout/Squircle";
import { sessionKeys, clearSession } from "@/lib/sessionKeys";

const STEPS: Step[] = [
    { label: "Order", state: "past", href: "/order/units" },
    { label: "Billing & Shipping", state: "past", href: "/order/billing-shipping" },
    { label: "Payment", state: "current", href: "/order/payment" },
];

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type InitiateResponse = {
    razorpayOrderId: string;
    razorpayKeyId: string;
    amountPaise: number;
    currency: "INR";
};

type RazorpayHandlerArgs = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
};

type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description?: string;
    handler: (response: RazorpayHandlerArgs) => void;
    modal?: { ondismiss?: () => void };
    theme?: { color?: string };
};

type RazorpayInstance = { open: () => void };

declare global {
    interface Window {
        Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
    }
}

export default function PaymentPage() {
    return (
        <Suspense fallback={null}>
            <PaymentPageInner />
        </Suspense>
    );
}

function PaymentPageInner() {
    const gating = useAuthGate();
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    const [scriptReady, setScriptReady] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handlePay = useCallback(async () => {
        if (submitting) return;
        if (!orderId) {
            setErrorMsg("Missing order. Restart checkout.");
            return;
        }
        if (!scriptReady || typeof window === "undefined" || !window.Razorpay) {
            setErrorMsg("Payment library still loading. Try again in a moment.");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await apiFetch("/api/payments/initiate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ orderId }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(
                    body?.error?.message ?? "Could not start payment. Please try again.",
                );
                setSubmitting(false);
                return;
            }
            const data = body.data as InitiateResponse;

            const rp = new window.Razorpay({
                key: data.razorpayKeyId,
                amount: data.amountPaise,
                currency: data.currency,
                order_id: data.razorpayOrderId,
                name: "Axceal",
                description: "Aero x1",
                theme: { color: "#0000f4" },
                modal: {
                    ondismiss: () => setSubmitting(false),
                },
                handler: async (response: RazorpayHandlerArgs) => {
                    try {
                        const verifyRes = await apiFetch("/api/payments/verify", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                orderId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            }),
                        });
                        const verifyBody = await verifyRes.json().catch(() => null);
                        if (!verifyRes.ok || !verifyBody?.ok) {
                            router.push(
                                `/order/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=verify`,
                            );
                            return;
                        }
                        clearSession(sessionKeys.orderIdempotencyKey);
                        router.push(
                            `/order/confirmation?orderId=${encodeURIComponent(orderId)}`,
                        );
                    } catch {
                        router.push(
                            `/order/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=network`,
                        );
                    }
                },
            });
            rp.open();
        } catch {
            setErrorMsg("Network error. Please try again.");
            setSubmitting(false);
        }
    }, [orderId, scriptReady, router, submitting]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!orderId) setErrorMsg("Missing order. Restart checkout.");
    }, [orderId]);

    if (gating) return null;

    return (
        <main className="flex-1 flex flex-col items-center pt-4 pb-4">
            <Script
                src={RAZORPAY_SCRIPT}
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
                onError={() =>
                    setErrorMsg("Payment library failed to load. Check your connection.")
                }
            />

            {/* ── Progress stepper ── */}
            <Stepper steps={STEPS} className="mb-16" />

            {/* ── Mobile layout (hidden sm+) ── */}
            <div className="flex sm:hidden flex-col gap-4 items-center w-full px-4">
                <div className="flex items-center gap-3 w-[320px] justify-start mb-1">
                    <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                    <SvgText text="Payment" weight="600" height={18} className="text-[#1e1e1e]" />
                </div>

                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[320px] h-[320px] flex items-center justify-center">
                    <AeroIcon alt="Aero x1" className="w-[60%]" />
                </Squircle>

                <SvgText text="X  1" weight="600" height={18} className="text-[#1e1e1e]" />

                <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-6 py-[25px] flex items-center justify-between w-[320px]">
                    <SvgText text="Price" weight="500" height={14} className="text-[#aaaaaa]" />
                    <SvgText text="INR 9,999" weight="600" height={18} className="text-[#1e1e1e]" />
                    <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                </Squircle>

                <div className="flex flex-col items-center gap-1 w-full mt-[20px] text-center">
                    <SvgText
                        text="Clicking on Pay will take you to trusted payment gateway."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                    <SvgText
                        text="Choose a payment method of your wish and proceed to pay."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                </div>

                {errorMsg && (
                    <div className="mt-2 w-full text-center">
                        <SvgText text={errorMsg} weight="500" height={12} className="text-[#f42400]" />
                    </div>
                )}

                <button
                    type="button"
                    onClick={handlePay}
                    disabled={submitting || !orderId}
                    aria-disabled={submitting || !orderId}
                    className="bg-[#0000f4] rounded-full px-[50px] py-4.5 mt-[20px] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <SvgText text={submitting ? "Opening..." : "Pay"} weight="600" height={16} className="text-white" />
                </button>
            </div>

            {/* ── Desktop layout (hidden mobile) ── */}
            <div className="hidden sm:flex flex-col items-center">
                <div className="flex flex-col gap-4 items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                        <SvgText text="Payment" weight="600" height={18} className="text-[#1e1e1e]" />
                    </div>

                    {/* Product card — X 1 floats right */}
                    <div className="relative w-[300px] h-[300px]">
                        <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-full h-full flex items-center justify-center">
                            <AeroIcon alt="Aero x1" className="w-[200px]" />
                        </Squircle>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+32px)]">
                            <SvgText text="X  1" weight="600" height={18} className="text-[#1e1e1e]" />
                        </div>
                    </div>

                    {/* Price pill */}
                    <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-6 py-[25px] flex items-center justify-between w-[300px]">
                        <SvgText text="Price" weight="500" height={14} className="text-[#aaaaaa]" />
                        <SvgText text="INR 9,999" weight="600" height={18} className="text-[#1e1e1e]" />
                        <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                    </Squircle>
                </div>

                {/* Description */}
                <div className="flex flex-col items-center justify-between gap-1 w-[680px] mt-[20px] text-center">
                    <SvgText
                        text="Clicking on Pay will take you to trusted payment gateway. Choose a payment method of your wish and proceed to pay."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                    <SvgText
                        text="Wait until you land back on Axceal's website after payment for order and transaction status."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                </div>

                {errorMsg && (
                    <div className="mt-4 w-[680px] text-center">
                        <SvgText text={errorMsg} weight="500" height={12} className="text-[#f42400]" />
                    </div>
                )}

                <button
                    type="button"
                    onClick={handlePay}
                    disabled={submitting || !orderId}
                    aria-disabled={submitting || !orderId}
                    className="bg-[#0000f4] rounded-full px-[50px] py-4.5 mt-[30px] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <SvgText text={submitting ? "Opening..." : "Pay"} weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
