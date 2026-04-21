"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { SvgInput } from "../../components/SvgInput";
import { RightArrow } from "../../components/icons/RightArrow";
import { useRouter, useSearchParams } from "next/navigation";
const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;
const GAP = 2.5; // px above the active row's top edge

const STEPS = [
    { label: "Credentials", active: true },
    { label: "Order", active: true },
    { label: "Billing & Shipping", active: true },
    { label: "Payment", active: false },
];

// Each input is its own field so the indicator centers over that single pill.
type BillingField = "bFirst" | "bLast" | "bAddress" | "bCountry" | "bState" | "bZip" | "bPhone";
type ShippingField = "sFirst" | "sLast" | "sAddress" | "sCountry" | "sState" | "sZip" | "sPhone";

// Derive indicator position from a ref element:
// top  = offsetTop  - GAP (sits just above the row)
// left = offsetLeft + offsetWidth/2 - 20 (centers the 40px bar over the element)
function indicatorPos(el: HTMLDivElement | null): { top: number; left: number } | null {
    if (!el) return null;
    return {
        top: el.offsetTop - GAP,
        left: el.offsetLeft + el.offsetWidth / 2 - 20,
    };
}

function formatPhoneInput(v: string, oldVal: string) {
    let d = v.replace(/[^\d]/g, "");
    const oldD = oldVal.replace(/[^\d]/g, "");

    // Handle backspace over hyphen/spaces smoothly
    if (d === oldD && v.length < oldVal.length) {
        // User deleted a non-digit (like a hyphen). Cut the last digit of the first group.
        // Assuming the hyphen is in the middle:
        const half = Math.ceil(oldD.length / 2);
        d = oldD.slice(0, half - 1) + oldD.slice(half);
    }

    if (d.length > 20) return oldVal;
    if (d.length === 0) return "";

    // Instead of always splitting right in the half (which causes digits to "jump" sides as you type),
    // let's wait until digits are reasonably large. 
    // Wait, the prompt requested: split in half. Let's do that but be careful about edge cases.
    const half = Math.ceil(d.length / 2);
    if (d.length <= 1) return d;
    return `${d.slice(0, half)} - ${d.slice(half)}`;
}

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
    // ── Billing state ──────────────────────────────────────────────────────────
    const [billingFirst, setBillingFirst] = useState("");
    const [billingLast, setBillingLast] = useState("");
    const [billingAddress, setBillingAddress] = useState("");
    const [billingCountry, setBillingCountry] = useState("");
    const [billingState, setBillingState] = useState("");
    const [billingZip, setBillingZip] = useState("");
    const [billingPhone, setBillingPhone] = useState("");
    const [billingCode, setBillingCode] = useState(["9", "1", ""]);
    const [billingSign, setBillingSign] = useState("+");

    // ── Shipping state ─────────────────────────────────────────────────────────
    const [shippingFirst, setShippingFirst] = useState("");
    const [shippingLast, setShippingLast] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [shippingCountry, setShippingCountry] = useState("");
    const [shippingState, setShippingState] = useState("");
    const [shippingZip, setShippingZip] = useState("");
    const [shippingPhone, setShippingPhone] = useState("");
    const [shippingCode, setShippingCode] = useState(["9", "1", ""]);
    const [shippingSign, setShippingSign] = useState("+");

    const [showShipping, setShowShipping] = useState(false);

    // ── Active field tracking ──────────────────────────────────────────────────
    const [activeBilling, setActiveBilling] = useState<BillingField>("bFirst");
    const [activeShipping, setActiveShipping] = useState<ShippingField>("sFirst");

    // One ref per individual input pill so the indicator centers over that pill only.
    const bFirstRef = useRef<HTMLDivElement>(null);
    const bLastRef = useRef<HTMLDivElement>(null);
    const bAddressRef = useRef<HTMLDivElement>(null);
    const bCountryRef = useRef<HTMLDivElement>(null);
    const bStateRef = useRef<HTMLDivElement>(null);
    const bZipRef = useRef<HTMLDivElement>(null);
    const bPhoneRef = useRef<HTMLDivElement>(null);

    const sFirstRef = useRef<HTMLDivElement>(null);
    const sLastRef = useRef<HTMLDivElement>(null);
    const sAddressRef = useRef<HTMLDivElement>(null);
    const sCountryRef = useRef<HTMLDivElement>(null);
    const sStateRef = useRef<HTMLDivElement>(null);
    const sZipRef = useRef<HTMLDivElement>(null);
    const sPhoneRef = useRef<HTMLDivElement>(null);

    // Two effects with constant dep-array sizes (React rule).
    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);
    useEffect(() => { forceUpdate(n => n + 1); }, [showShipping]);

    // ── Indicator positions ────────────────────────────────────────────────────
    const billingRefMap: Record<BillingField, React.RefObject<HTMLDivElement | null>> = {
        bFirst: bFirstRef, bLast: bLastRef, bAddress: bAddressRef,
        bCountry: bCountryRef, bState: bStateRef, bZip: bZipRef, bPhone: bPhoneRef,
    };
    const bPos = indicatorPos(billingRefMap[activeBilling].current);

    const shippingRefMap: Record<ShippingField, React.RefObject<HTMLDivElement | null>> = {
        sFirst: sFirstRef, sLast: sLastRef, sAddress: sAddressRef,
        sCountry: sCountryRef, sState: sStateRef, sZip: sZipRef, sPhone: sPhoneRef,
    };
    const sPos = indicatorPos(shippingRefMap[activeShipping].current);
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
    const onBillingFocus = useCallback((f: BillingField) => setActiveBilling(f), []);
    const onBillingBlur = useCallback(() => setActiveBilling("bFirst"), []);
    const onShippingFocus = useCallback((f: ShippingField) => setActiveShipping(f), []);
    const onShippingBlur = useCallback(() => setActiveShipping("sFirst"), []);
    const router = useRouter();
    const searchParams = useSearchParams();

    // qty arrives as ?qty=N from /order/units; clamp to the server-enforced range.
    const quantity = (() => {
        const raw = Number(searchParams.get("qty"));
        if (!Number.isFinite(raw) || raw < 1) return 1;
        if (raw > 5) return 5;
        return Math.floor(raw);
    })();

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const idempotencyKeyRef = useRef<string>("");
    useEffect(() => {
        const STORAGE_KEY = "order:idempotency-key";
        let key = sessionStorage.getItem(STORAGE_KEY);
        if (!key) {
            key = crypto.randomUUID();
            sessionStorage.setItem(STORAGE_KEY, key);
        }
        idempotencyKeyRef.current = key;
    }, []);

    function extractDigits(s: string): string {
        return s.replace(/\D/g, "");
    }

    function buildAddress(side: "billing" | "shipping") {
        const isB = side === "billing";
        return {
            firstName: (isB ? billingFirst : shippingFirst).trim(),
            lastName: (isB ? billingLast : shippingLast).trim(),
            line1: (isB ? billingAddress : shippingAddress).trim(),
            country: (isB ? billingCountry : shippingCountry).trim(),
            state: (isB ? billingState : shippingState).trim(),
            zip: (isB ? billingZip : shippingZip).trim(),
            phoneCountryCode: extractDigits((isB ? billingCode : shippingCode).join("")),
            phone: extractDigits(isB ? billingPhone : shippingPhone),
            phoneSign: (isB ? billingSign : shippingSign) as "+" | "-",
        };
    }

    async function handleProceed() {
        if (submitting) return;
        setErrorMsg(null);

        const billing = buildAddress("billing");
        // "Same as Billing" → copy billing into shipping client-side so the
        // server always receives both addresses (user decision 2026-04-21).
        const shipping = showShipping ? buildAddress("shipping") : billing;

        setSubmitting(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    quantity,
                    billingAddress: billing,
                    shippingAddress: shipping,
                    idempotencyKey: idempotencyKeyRef.current,
                }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Could not place order. Please check your details and try again.");
                return;
            }
            const orderId = body.data.id as string;
            router.push(`/order/payment?orderId=${orderId}`);
        } catch {
            setErrorMsg("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // pill height: height={14} + py-[20px] (20 × 2) = 54 px — every input row uses this
    const pill = "bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-5 py-[18px]";

    return (
        <main className="flex-1 flex flex-col items-center pt-8 pb-2">

            {/* ── Progress stepper ── */}
            <div className="flex items-center gap-10 mb-14">
                {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-10">
                        <SvgText
                            text={step.label}
                            weight="600"
                            height={16}
                            className={step.active ? "text-[#0000f4]" : "text-[#1e1e1e]"}
                        />
                        {i < STEPS.length - 1 && (
                            <RightArrow
                                className={STEPS[i + 1].active ? "text-[#0000f4]" : "text-[#1e1e1e]"}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* ── Form area ── */}
            <div className="flex gap-50 items-start">

                {/* ── Billing Address ── */}
                <div className="relative flex flex-col gap-4 w-[430px]">

                    {/* Blue sliding indicator — left derived from active input's offsetLeft+width */}
                    <div
                        className="absolute w-[40px] h-[2.5px] bg-[#0000f4] rounded-full pointer-events-none transition-[top,left,opacity] duration-200 ease-in-out"
                        style={{
                            top: bPos ? `${bPos.top}px` : undefined,
                            left: bPos ? `${bPos.left}px` : undefined,
                            opacity: bPos ? 1 : 0,
                        }}
                    />

                    <div className="flex flex-col items-center gap-1.5 mb-2">
                        <SvgText text="Billing Address" weight="600" height={18} className="text-[#1e1e1e]" />
                    </div>

                    {/* Name — each pill gets its own ref so indicator centers over just that pill */}
                    <div className="w-full flex items-center gap-3">
                        <SvgText
                            text={showShipping ? "Payer's" : "Payer's Name"}
                            weight="600"
                            height={14}
                            className="text-[#1e1e1e] shrink-0 w-[90px] "
                        />
                        <div ref={bFirstRef} className="flex-1">
                            <SvgInput
                                value={billingFirst}
                                onChange={setBillingFirst}
                                placeholder="First Name"
                                weight="600"
                                height={14}
                                className={`w-full ${pill} flex px-8`}
                                onFocus={() => onBillingFocus("bFirst")}
                                onBlur={onBillingBlur}
                            />
                        </div>
                        <div ref={bLastRef} className="flex-1">
                            <SvgInput
                                value={billingLast}
                                onChange={setBillingLast}
                                placeholder="Last Name"
                                weight="600"
                                height={14}
                                className={`w-full ${pill} px-8`}
                                onFocus={() => onBillingFocus("bLast")}
                                onBlur={onBillingBlur}
                            />
                        </div>
                    </div>

                    {/* Home Address — full width, no label */}
                    <div ref={bAddressRef} className="w-full">
                        <SvgInput
                            value={billingAddress}
                            onChange={(v) => { if (v.length <= 50) setBillingAddress(v); }}
                            placeholder="Home Address"
                            weight="600"
                            height={14}
                            className={`w-full ${pill} px-8`}
                            onFocus={() => onBillingFocus("bAddress")}
                            onBlur={onBillingBlur}
                            rightSlot={
                                <SvgText text="50 characters" weight="600" height={14} className="text-[#aaaaaa] pr-2 shrink-0" />
                            }
                        />
                    </div>

                    {/* Country + State — each pill gets its own ref */}
                    <div className="w-full flex gap-3">
                        <div ref={bCountryRef} className="flex-1">
                            <SvgInput
                                value={billingCountry}
                                onChange={setBillingCountry}
                                placeholder="Country"
                                weight="600"
                                height={14}
                                className={`w-full ${pill} px-8`}
                                onFocus={() => onBillingFocus("bCountry")}
                                onBlur={onBillingBlur}
                            />
                        </div>
                        <div ref={bStateRef} className="flex-1">
                            <SvgInput
                                value={billingState}
                                onChange={setBillingState}
                                placeholder="State"
                                weight="600"
                                height={14}
                                className={`w-full ${pill} px-8`}
                                onFocus={() => onBillingFocus("bState")}
                                onBlur={onBillingBlur}
                            />
                        </div>
                    </div>

                    {/* Zip */}
                    <div ref={bZipRef} className="w-full">
                        <SvgInput
                            value={billingZip}
                            onChange={setBillingZip}
                            placeholder="zipcode/pincode"
                            weight="600"
                            height={14}
                            className={`w-full ${pill} px-8`}
                            onFocus={() => onBillingFocus("bZip")}
                            onBlur={onBillingBlur}
                        />
                    </div>

                    {/* Phone — 4-circle country code + grouped number input */}
                    <div
                        ref={bPhoneRef}
                        className="w-full flex items-center gap-2 h-[50px] bg-[#f1f1f1] rounded-full px-[8px]"
                        onFocus={() => onBillingFocus("bPhone")}
                        onBlur={onBillingBlur}
                    >
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setBillingSign(s => s === "+" ? "-" : "+")}
                                className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none hover:bg-gray-50 transition-colors shrink-0"
                            >
                                <SvgText text={billingSign} weight="600" height={18} className="text-[#0000f4]" />
                            </button>
                            {billingCode.map((val, i) => (
                                <SvgInput
                                    key={`bcode-${i}`}
                                    id={`bcode-${i}`}
                                    value={val}
                                    onChange={(v) => {
                                        const cleanV = v.replace(/\D/g, "");
                                        const newCode = [...billingCode];
                                        newCode[i] = cleanV.slice(-1);
                                        setBillingCode(newCode);
                                        if (cleanV && i < 2) {
                                            const next = document.getElementById(`bcode-${i + 1}`);
                                            if (next) next.focus();
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Backspace" && !val && i > 0) {
                                            const prev = document.getElementById(`bcode-${i - 1}`);
                                            if (prev) prev.focus();
                                        }
                                    }}
                                    align="center"
                                    weight="600"
                                    height={16}
                                    className="w-[40px] h-[40px] rounded-full bg-white text-[#0000f4]  shrink-0"
                                />
                            ))}
                        </div>

                        <div className="w-[2px] h-[20px] rounded-full bg-[#aaaaaa] shrink-0 mx-1" />

                        <SvgInput
                            value={billingPhone}
                            onChange={v => setBillingPhone(formatPhoneInput(v, billingPhone))}
                            placeholder="9xxxx - 9xxxx"
                            weight="600"
                            height={16}
                            className="flex-1 text-[#1e1e1e] tracking-[3px]"
                        />
                    </div>

                    {/* Deliver To */}
                    <div className="flex items-center gap-3 mt-1">
                        <SvgText text="Deliver To" weight="600" height={14} className="text-[#1e1e1e] shrink-0" />
                        <button
                            type="button"
                            onClick={() => setShowShipping(false)}
                            className="flex-1 flex justify-center items-center bg-[#f1f1f1] rounded-full px-4 py-[18px] cursor-pointer focus:outline-none focus-visible:outline-none"
                        >
                            <SvgText
                                text="Same as Billing Address"
                                weight="600"
                                height={12}
                                className={!showShipping ? "text-[#0000f4]" : "text-[#aaaaaa]"}
                            />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowShipping(true)}
                            className={`flex-1 flex justify-center items-center rounded-full px-4 py-[18px] cursor-pointer transition-colors focus:outline-none focus-visible:outline-none ${showShipping ? "bg-[#0000f4]" : "bg-[#f1f1f1]"}`}
                        >
                            <SvgText
                                text="Add Shipping Address"
                                weight="600"
                                height={12}
                                className={showShipping ? "text-white" : "text-[#1e1e1e]"}
                            />
                        </button>
                    </div>
                </div>

                {/* ── Shipping Address ── */}
                <AnimatePresence>
                    {showShipping && (
                        <motion.div
                            initial={{ opacity: 0, x: 32 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 32 }}
                            transition={SPRING}
                            className="relative flex flex-col gap-4 w-[430px]"
                        >
                            {/* Blue sliding indicator */}
                            <div
                                className="absolute w-[40px] h-[2.5px] bg-[#0000f4] rounded-full pointer-events-none transition-[top,left,opacity] duration-200 ease-in-out"
                                style={{
                                    top: sPos ? `${sPos.top}px` : undefined,
                                    left: sPos ? `${sPos.left}px` : undefined,
                                    opacity: sPos ? 1 : 0,
                                }}
                            />

                            <div className="flex flex-col items-center gap-1.5 mb-2">
                                <SvgText text="Shipping Address" weight="600" height={18} className="text-[#1e1e1e]" />
                            </div>

                            {/* Receiver's Name — each pill gets its own ref */}
                            <div className="w-full flex items-center gap-3">
                                <SvgText text="Receiver's" weight="600" height={14} className="text-[#1e1e1e] shrink-0 w-[90px]" />
                                <div ref={sFirstRef} className="flex-1">
                                    <SvgInput
                                        value={shippingFirst}
                                        onChange={setShippingFirst}
                                        placeholder="First Name"
                                        weight="600"
                                        height={14}
                                        className={`w-full ${pill} px-8`}
                                        onFocus={() => onShippingFocus("sFirst")}
                                        onBlur={onShippingBlur}
                                    />
                                </div>
                                <div ref={sLastRef} className="flex-1">
                                    <SvgInput
                                        value={shippingLast}
                                        onChange={setShippingLast}
                                        placeholder="Last Name"
                                        weight="600"
                                        height={14}
                                        className={`w-full ${pill} px-8`}
                                        onFocus={() => onShippingFocus("sLast")}
                                        onBlur={onShippingBlur}
                                    />
                                </div>
                            </div>

                            {/* Home Address */}
                            <div ref={sAddressRef} className="w-full">
                                <SvgInput
                                    value={shippingAddress}
                                    onChange={(v) => { if (v.length <= 50) setShippingAddress(v); }}
                                    placeholder="Home Address"
                                    weight="600"
                                    height={14}
                                    className={`w-full ${pill} px-8`}
                                    onFocus={() => onShippingFocus("sAddress")}
                                    onBlur={onShippingBlur}
                                    rightSlot={
                                        <SvgText text="50 characters" weight="600" height={14} className="text-[#aaaaaa] pr-2 shrink-0" />
                                    }
                                />
                            </div>

                            {/* Country + State — each pill gets its own ref */}
                            <div className="w-full flex gap-3">
                                <div ref={sCountryRef} className="flex-1">
                                    <SvgInput
                                        value={shippingCountry}
                                        onChange={setShippingCountry}
                                        placeholder="Country"
                                        weight="600"
                                        height={14}
                                        className={`w-full ${pill} px-8`}
                                        onFocus={() => onShippingFocus("sCountry")}
                                        onBlur={onShippingBlur}
                                    />
                                </div>
                                <div ref={sStateRef} className="flex-1">
                                    <SvgInput
                                        value={shippingState}
                                        onChange={setShippingState}
                                        placeholder="State"
                                        weight="600"
                                        height={14}
                                        className={`w-full ${pill} px-8`}
                                        onFocus={() => onShippingFocus("sState")}
                                        onBlur={onShippingBlur}
                                    />
                                </div>
                            </div>

                            {/* Zip */}
                            <div ref={sZipRef} className="w-full">
                                <SvgInput
                                    value={shippingZip}
                                    onChange={setShippingZip}
                                    placeholder="zipcode/pincode"
                                    weight="600"
                                    height={14}
                                    className={`w-full ${pill} px-8`}
                                    onFocus={() => onShippingFocus("sZip")}
                                    onBlur={onShippingBlur}
                                />
                            </div>

                            {/* Phone — 4-circle country code + grouped number input */}
                            <div
                                ref={sPhoneRef}
                                className="w-full flex items-center gap-2 h-[50px] bg-[#f1f1f1] rounded-full px-[8px]"
                                onFocus={() => onShippingFocus("sPhone")}
                                onBlur={onShippingBlur}
                            >
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShippingSign(s => s === "+" ? "-" : "+")}
                                        className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shrink-0 focus:outline-none focus-visible:outline-none"
                                    >
                                        <SvgText text={shippingSign} weight="600" height={18} className="text-[#0000f4]" />
                                    </button>
                                    {shippingCode.map((val, i) => (
                                        <SvgInput
                                            key={`scode-${i}`}
                                            id={`scode-${i}`}
                                            value={val}
                                            onChange={(v) => {
                                                const cleanV = v.replace(/\D/g, "");
                                                const newCode = [...shippingCode];
                                                newCode[i] = cleanV.slice(-1);
                                                setShippingCode(newCode);
                                                if (cleanV && i < 2) {
                                                    const next = document.getElementById(`scode-${i + 1}`);
                                                    if (next) next.focus();
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace" && !val && i > 0) {
                                                    const prev = document.getElementById(`scode-${i - 1}`);
                                                    if (prev) prev.focus();
                                                }
                                            }}
                                            align="center"
                                            weight="600"
                                            height={16}
                                            className="w-[40px] h-[40px] rounded-full bg-white text-[#0000f4] shrink-0"
                                        />
                                    ))}
                                </div>

                                <div className="w-[2px] h-[20px] rounded-full bg-[#aaaaaa] shrink-0 mx-1" />

                                <SvgInput
                                    value={shippingPhone}
                                    onChange={v => setShippingPhone(formatPhoneInput(v, shippingPhone))}
                                    placeholder="9xxxx - 9xxxx"
                                    weight="600"
                                    height={16}
                                    className="flex-1 text-[#1e1e1e] tracking-[3px]"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Proceed button ── */}
            <div className="flex flex-col items-center mt-14 gap-3">
                {errorMsg && (
                    <SvgText text={errorMsg} weight="600" height={12} className="text-[#c00000]" />
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
