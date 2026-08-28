"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Squircle } from "@/app/components/layout/Squircle";
import { UserIcon } from "@/app/components/icons/account/UserIcon";
import { ViewDetailsSaveIcon } from "@/app/components/icons/action/ViewDetailsSaveIcon";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";
import { sessionKeys, readSession, clearSession } from "@/lib/sessionKeys";
import type { Profile } from "@/lib/contracts/profile";
import { ordinal } from "./helpers";
import { MONTHS_FULL } from "./constants";

import { GenderEditor } from "./GenderEditor";
import { BirthdayEditor } from "./BirthdayEditor";
import { PhoneEditor } from "./PhoneEditor";
import { OtpModal } from "./OtpModal";

function formatBirthday(iso: string): string {
    if (!iso) return "Birthday";
    try {
        const d = new Date(iso);
        return `${ordinal(d.getUTCDate())} ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
        return "Birthday";
    }
}

function formatPhoneSpaced(p: string): string {
    if (!p) return "";
    const ccs = ["+1", "+44", "+61", "+81", "+86", "+33", "+49", "+39", "+55", "+7", "+34", "+52", "+31", "+46", "+41", "+91"];
    let cc = "";
    for (const code of ccs) {
        if (p.startsWith(code)) {
            cc = code;
            break;
        }
    }
    if (!cc) {
        const m = p.match(/^(\+\d{1,3})(\d+)$/);
        if (m) cc = m[1];
        else return p.split("").join(" ");
    }
    const rest = p.slice(cc.length);
    return `${cc.split("").join(" ")}   ${rest.split("").join(" ")}`;
}

export function UnifiedDetailsForm({ initial, phone: initialPhone }: { initial: Profile; phone: string | null }) {
    const router = useRouter();
    const [activeRow, setActiveRow] = useState<"name" | "gender" | "birthday" | "phone" | null>(null);
    const [phoneFocusTarget, setPhoneFocusTarget] = useState<"cc" | "phone">("cc");

    const [firstName, setFirstName] = useState(initial.firstName || "");
    const [lastName, setLastName] = useState(initial.lastName || "");
    const [gender, setGender] = useState(initial.gender || "");
    const [birthdayIso, setBirthdayIso] = useState(initial.birthday || "");
    const [phone, setPhone] = useState(initialPhone || "");

    const [focusedField, setFocusedField] = useState<"first" | "last" | null>(null);
    const [showOtp, setShowOtp] = useState(false);
    const [nameError, setNameError] = useState(false);
    const [genderError, setGenderError] = useState(false);
    const [birthdayError, setBirthdayError] = useState(false);
    const [phoneError, setPhoneError] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSkip = async () => {
        if (submitting) return;
        setSubmitting(true);
        // Short visual delay as requested
        await new Promise(r => setTimeout(r, 400));
        const from = readSession<string>(sessionKeys.signupFrom, (v): v is string => typeof v === "string");
        clearSession(sessionKeys.signupFrom);
        router.push(from === "order" ? "/order/units" : "/");
    };

    const hasChanges =
        firstName !== (initial.firstName || "") ||
        lastName !== (initial.lastName || "") ||
        gender !== (initial.gender || "") ||
        birthdayIso !== (initial.birthday || "") ||
        phone !== (initialPhone || "");

    const isFullyEmpty = !firstName && !lastName && !gender && !birthdayIso && !phone;
    const isFullyFilled = !!(firstName && lastName && gender && birthdayIso && phone);

    let topButtonText: string | null = null;
    if (isFullyEmpty) topButtonText = "Skip for now";

    const handleConfirm = () => {
        const pLen = phone.replace(/\D/g, "").length;
        const isPhoneInvalid = !phone || pLen < 8;
        const isNameInvalid = !firstName || !lastName;
        const isGenderInvalid = !gender;
        const isBdayInvalid = !birthdayIso;

        setNameError(isNameInvalid);
        setGenderError(isGenderInvalid);
        setBirthdayError(isBdayInvalid);
        setPhoneError(isPhoneInvalid);

        if (isNameInvalid || isGenderInvalid || isBdayInvalid || isPhoneInvalid) {
            if (isPhoneInvalid) {
                setActiveRow("phone");
            } else if (isNameInvalid) {
                setActiveRow("name");
            } else if (isGenderInvalid) {
                setActiveRow("gender");
            } else if (isBdayInvalid) {
                setActiveRow("birthday");
            }
            return;
        }

        setShowOtp(true);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-[360px] mb-[20px]">
            {showOtp && (
                <OtpModal
                    onClose={() => setShowOtp(false)}
                    onSuccess={() => {
                        setShowOtp(false);
                        setActiveRow(null);
                        router.push("/account");
                    }}
                    phone={phone!.replace(/\s+/g, "")}
                    firstName={firstName || null}
                    lastName={lastName || null}
                    gender={gender || null}
                    birthday={birthdayIso || null}
                />
            )}


            <Squircle as={motion.div} layout transition={{ type: "spring", bounce: 0, duration: 0.4 }} borderRadius={20} smoothing={60} className="w-[360px] bg-[#f1f1f1] flex flex-col items-center pt-[30px] pb-[40px] relative overflow-hidden">
                {/* Icon Circle */}
                <motion.div layout className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center shrink-0">
                    <UserIcon className="w-[24px] h-[24px] text-white stroke-[#0000f4]" />
                </motion.div>

                <motion.div layout className="mt-[10px] mb-[15px]">
                    <SvgText text="Account Details" weight="600" height={16} className="text-[#1e1e1e]" />
                </motion.div>

                {/* Fields Container */}
                <motion.div layout className="w-[320px] flex flex-col border-t-[1.5px] border-b-[1.5px] border-dashed border-[#aaaaaa] divide-y-[1.5px] divide-dashed divide-[#aaaaaa]">

                    {/* Name Row */}
                    <motion.div layout className="flex flex-col">
                        <div
                            className="h-[60px] flex items-center justify-center w-full px-2"
                            onClick={() => setActiveRow(null)}
                        >
                            <div className="flex-1 relative flex items-center justify-end px-2">
                                <SvgInput
                                    placeholder="First Name"
                                    value={firstName}
                                    onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setFirstName(c.charAt(0).toUpperCase() + c.slice(1)); setNameError(false); }}
                                    onFocus={() => { setFocusedField("first"); setActiveRow(null); }}
                                    onBlur={() => setFocusedField(null)}
                                    align="center"
                                    weight={firstName ? "600" : "500"}
                                    height={20}
                                    cursorHeightScale={1.5}
                                    cursorColor="#0000f4"
                                    placeholderOpacity={1}
                                    placeholderColor={nameError && !firstName ? "#ff0000" : "#aaaaaa"}
                                    className={`w-full cursor-pointer focus:cursor-text ${nameError && !firstName ? 'text-[#ff0000]' : 'text-[#1e1e1e]'}`}
                                />
                            </div>
                            <span className="block w-[8px] h-[8px] rounded-full bg-[#0000f4] shrink-0 mx-2" />
                            <div className="flex-1 relative flex items-center justify-start px-2">
                                <SvgInput
                                    placeholder="Last Name"
                                    value={lastName}
                                    onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setLastName(c.charAt(0).toUpperCase() + c.slice(1)); setNameError(false); }}
                                    onFocus={() => { setFocusedField("last"); setActiveRow(null); }}
                                    onBlur={() => setFocusedField(null)}
                                    align="center"
                                    weight={lastName ? "600" : "500"}
                                    height={20}
                                    cursorHeightScale={1.5}
                                    cursorColor="#0000f4"
                                    placeholderOpacity={1}
                                    placeholderColor={nameError && !lastName ? "#ff0000" : "#aaaaaa"}
                                    className={`w-full cursor-pointer focus:cursor-text ${nameError && !lastName ? 'text-[#ff0000]' : 'text-[#1e1e1e]'}`}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Gender Row */}
                    <motion.div layout className="flex flex-col relative justify-center min-h-[60px]">
                        <AnimatePresence initial={false} mode="popLayout">
                            {activeRow !== "gender" ? (
                                <motion.div
                                    key="collapsed"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => setActiveRow("gender")}
                                    className="h-[60px] w-full flex items-center justify-center cursor-pointer"
                                >
                                    <SvgText
                                        text={gender === "private" ? "Keep it Private" : gender === "female" ? "Female" : gender === "male" ? "Male" : "Gender"}
                                        weight={gender ? "600" : "500"}
                                        height={20}
                                        className={gender ? "text-[#1e1e1e]" : genderError ? "text-[#ff0000]" : "text-[#aaaaaa]"}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="expanded"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full flex flex-col justify-center"
                                >
                                    <GenderEditor
                                        initialGender={gender === "private" ? "Keep it Private" : gender === "female" ? "Female" : gender === "male" ? "Male" : ""}
                                        onSave={async (g) => {
                                            const mapped = g === "Female" ? "female" : g === "Male" ? "male" : "private";
                                            setGender(mapped);
                                            setGenderError(false);
                                            setActiveRow(null);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Birthday Row */}
                    <motion.div layout className="flex flex-col relative justify-center min-h-[60px]">
                        <AnimatePresence initial={false} mode="popLayout">
                            {activeRow !== "birthday" ? (
                                <motion.div
                                    key="collapsed"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => setActiveRow("birthday")}
                                    className="h-[60px] w-full flex items-center justify-center cursor-pointer"
                                >
                                    <SvgText text={birthdayIso ? formatBirthday(birthdayIso) : "Birthday"} weight={birthdayIso ? "600" : "500"} height={20} className={birthdayIso ? "text-[#1e1e1e]" : birthdayError ? "text-[#ff0000]" : "text-[#aaaaaa]"} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="expanded"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full flex flex-col justify-center"
                                >
                                    <BirthdayEditor
                                        initialBirthday={birthdayIso}
                                        onSave={async (iso) => {
                                            setBirthdayIso(iso);
                                            setBirthdayError(false);
                                            setActiveRow(null);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Phone Row */}
                    <motion.div layout className="flex flex-col relative justify-center min-h-[60px]">
                        <AnimatePresence initial={false} mode="popLayout">
                            {activeRow !== "phone" ? (
                                <motion.div
                                    key="collapsed"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => {
                                        setPhoneFocusTarget(phone ? "phone" : "cc");
                                        setActiveRow("phone");
                                    }}
                                    className="h-[60px] w-full flex items-center justify-center px-4 cursor-pointer"
                                >
                                    {phone ? (
                                        <SvgText text={formatPhoneSpaced(phone)} weight="600" height={20} className={phoneError ? "text-[#ff0000]" : "text-[#1e1e1e]"} />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full" onClick={(e) => { e.stopPropagation(); setPhoneFocusTarget("phone"); setActiveRow("phone"); }}>
                                            <SvgText text="Phone Number" weight="500" height={20} className={phoneError ? "text-[#ff0000]" : "text-[#aaaaaa]"} />
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="expanded"
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full flex flex-col justify-center"
                                >
                                    <PhoneEditor
                                        initialPhone={phone}
                                        initialFocus={phoneFocusTarget}
                                        error={phoneError}
                                        onSave={async (p) => {
                                            setPhone(p);
                                            if (p && p.replace(/\D/g, "").length >= 8) setPhoneError(false);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                </motion.div>

                {/* Footer Text */}
                <motion.div layout className="text-center mt-6 flex flex-col items-center gap-0">
                    <SvgText text="Your account is private and secured with" weight="500" height={12} className="text-[#aaaaaa]" />
                    <div className="flex items-center">
                        <SvgText text="Axceal. Take a look at" weight="500" height={12} className="text-[#aaaaaa]" />
                        <Link href="/privacy" className="hover:opacity-80 transition-opacity">
                            <SvgText text=" Privacy Policies" weight="600" height={12} maxWidth={400} className="text-[#0000f4]" />
                        </Link>
                    </div>
                </motion.div>
            </Squircle>

            {/* Action Buttons */}
            <AnimatePresence mode="wait">
                {hasChanges ? (
                    <motion.div
                        key="verify-btn"
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-8 flex justify-center w-full"
                    >

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={submitting}
                            className="cursor-pointer rounded-full px-[40px] h-[50px] flex items-center justify-center transition-colors group bg-[#f1f1f1] max-md:bg-[#0000f4] hover:bg-[#0000f4] active:bg-[#f1f1f1] max-md:active:bg-[#f1f1f1] disabled:bg-[#f1f1f1] max-md:disabled:bg-[#f1f1f1] disabled:hover:bg-[#f1f1f1] max-md:disabled:hover:bg-[#f1f1f1] disabled:cursor-not-allowed"
                        >
                            <SvgText text="Confirm" weight="600" height={16} maxWidth={Infinity} className="text-[#0000f4] max-md:text-white group-hover:text-white group-active:text-[#aaaaaa] max-md:group-active:text-[#aaaaaa] group-disabled:text-[#aaaaaa] max-md:group-disabled:text-[#aaaaaa] group-disabled:group-hover:text-[#aaaaaa] max-md:group-disabled:group-hover:text-[#aaaaaa]" />
                        </button>
                    </motion.div>
                ) : isFullyFilled ? (
                    <motion.div
                        key="continue-btn"
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-8 flex justify-center w-full"
                    >
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                            className="cursor-pointer bg-[#0000f4] rounded-full px-[30px] h-[50px] flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text="Go to Account" weight="600" height={16} maxWidth={Infinity} className="text-white" />
                        </button>
                    </motion.div>
                ) : topButtonText ? (
                    <motion.div
                        key="skip-btn"
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-8 flex justify-center w-full"
                    >
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={submitting}
                            className="flex items-center whitespace-nowrap hover:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <SvgText text={topButtonText} weight="600" height={16} maxWidth={Infinity} className="text-[#0000f4] cursor-pointer" />
                        </button>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
