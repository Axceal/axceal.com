"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { SvgText } from "../../../components/SvgText";
import { apiFetch } from "@/lib/http/client";

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

export default function PaymentFailedPage() {
    return (
        <Suspense fallback={null}>
            <PaymentFailedPageInner />
        </Suspense>
    );
}

function PaymentFailedPageInner() {
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
                        try {
                            sessionStorage.removeItem("order:idempotency-key");
                        } catch { }
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

    return (
        <main className="flex-1 flex flex-col items-center pt-8 pb-4">
            <Script
                src={RAZORPAY_SCRIPT}
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
                onError={() =>
                    setErrorMsg("Payment library failed to load. Check your connection.")
                }
            />

            {/* ── Stepper: Payment Failed — Retrying Payment ── */}
            <div className="flex items-center gap-6 mb-10">
                <SvgText
                    text="Payment Failed"
                    weight="600"
                    height={16}
                    className="text-[#f42400]"
                />
                <span
                    className="block h-[2px] w-[32px] bg-[#0000f4] rounded-full"
                    aria-hidden
                />
                <button
                    type="button"
                    onClick={() => {
                        if (typeof window !== "undefined") window.location.reload();
                    }}
                    className="cursor-pointer focus:outline-none focus-visible:outline-none"
                    aria-label="Retry payment"
                >
                    <SvgText
                        text="Retrying Payment"
                        weight="600"
                        height={16}
                        className="text-[#0000f4]"
                    />
                </button>
            </div>

            <div className="flex flex-col items-center">
                {/* Deduction notice */}
                <div className="flex flex-col items-center gap-[2px] w-[400px] text-center mb-4">
                    <SvgText
                        text="If any deductions were done, it will be added to your"
                        weight="500"
                        height={14}
                        className="text-[#aaaaaa]"
                    />
                    <SvgText
                        text="account shortly"
                        weight="500"
                        height={12}
                        className="text-[#aaaaaa]"
                    />
                </div>

                {/* See details or take action — no-op placeholder */}
                <button
                    type="button"
                    className="bg-[#f1f1f1] rounded-[15px] w-[300px] px-[60px] py-5 mb-5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                >
                    <SvgText
                        text="See details or take action"
                        weight="600"
                        height={14}
                        className="text-[#0000f4]"
                    />
                </button>

                {/* Product card + X 1 + price (same pattern as /order/payment) */}
                <div className="flex flex-col gap-4 items-start">
                    <div className="relative w-[300px] h-[300px]">
                        <div className="bg-[#f1f1f1] rounded-[20px] w-full h-full flex items-center justify-center">
                            <img src="/assests/aero svg.svg" alt="Aero x1" className="w-[200px]" />
                        </div>
                        {/* X 1 floats right of card on desktop */}
                        <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-[calc(100%+32px)]">
                            <SvgText text="X  1" weight="600" height={18} className="text-[#1e1e1e]" />
                        </div>
                    </div>

                    {/* Mobile only: X 1 between card and price pill */}
                    <div className="flex sm:hidden justify-center w-full">
                        <SvgText text="X  1" weight="600" height={18} className="text-[#1e1e1e]" />
                    </div>

                    <div className="bg-[#f1f1f1] rounded-[15px] px-6 py-[25px] flex items-center justify-between w-[300px]">
                        <SvgText text="Price" weight="500" height={14} className="text-[#aaaaaa]" />
                        <SvgText text="INR 9,999" weight="600" height={18} className="text-[#1e1e1e]" />
                        <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                    </div>
                </div>

                {/* Description */}
                <div className="flex flex-col items-center gap-1 w-[680px] mt-[60px] text-center">
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
                        <SvgText
                            text={errorMsg}
                            weight="500"
                            height={12}
                            className="text-[#f42400]"
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={handlePay}
                    disabled={submitting || !orderId}
                    aria-disabled={submitting || !orderId}
                    className="bg-[#0000f4] rounded-full px-[50px] mt-[30px] py-4.5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <SvgText
                        text={submitting ? "Opening..." : "Pay"}
                        weight="600"
                        height={16}
                        className="text-white"
                    />
                </button>
            </div>
        </main>
    );
}
