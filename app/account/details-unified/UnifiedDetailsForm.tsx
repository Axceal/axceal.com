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

    const [firstName, setFirstName] = useState(initial.firstName || "");
    const [lastName, setLastName] = useState(initial.lastName || "");
    const [gender, setGender] = useState(initial.gender || "");
    const [birthdayIso, setBirthdayIso] = useState(initial.birthday || "");
    const [phone, setPhone] = useState(initialPhone || "");

    const [focusedField, setFocusedField] = useState<"first" | "last" | null>(null);
    const [showOtp, setShowOtp] = useState(false);
    const [phoneError, setPhoneError] = useState(false);

    const hasChanges =
        firstName !== (initial.firstName || "") ||
        lastName !== (initial.lastName || "") ||
        gender !== (initial.gender || "") ||
        birthdayIso !== (initial.birthday || "") ||
        phone !== (initialPhone || "");

    const isFullyEmpty = !firstName && !lastName && !gender && !birthdayIso && !phone;
    const isFullyFilled = !!(firstName && lastName && gender && birthdayIso && phone);

    let topButtonText = "Done for now";
    if (isFullyEmpty) topButtonText = "Skip for now";
    else if (isFullyFilled) topButtonText = "Done with details";

    const handleConfirm = () => {
        if (!phone || phone.replace(/\D/g, "").length < 8) {
            setPhoneError(true);
            setActiveRow("phone");
            return;
        }
        setPhoneError(false);
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
                        router.refresh();
                    }}
                    phone={phone}
                    firstName={firstName || null}
                    lastName={lastName || null}
                    gender={gender || null}
                    birthday={birthdayIso || null}
                />
            )}

            {/* Top Navigation */}
            <motion.div layout className="flex items-center justify-center w-full mb-8">
                <button type="button" onClick={() => router.back()} className="flex items-center whitespace-nowrap hover:opacity-80 transition-opacity">
                    <SvgText text={topButtonText} weight="600" height={16} className="text-[#0000f4] cursor-pointer" maxWidth={400} />
                </button>
            </motion.div>

            <Squircle as={motion.div} layout borderRadius={20} smoothing={60} className="w-[360px] bg-[#f1f1f1] flex flex-col items-center pt-[30px] pb-[40px] relative overflow-hidden">
                {/* Icon Circle */}
                <motion.div layout className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center shrink-0">
                    <UserIcon className="w-[24px] h-[24px] text-white stroke-[#0000f4]" />
                </motion.div>

                <motion.div layout className="mt-[10px] mb-[15px]">
                    <SvgText text="Account Details" weight="600" height={16} className="text-[#1e1e1e]" />
                </motion.div>

                {/* Fields Container */}
                <motion.div layout className="w-[300px] flex flex-col border-t-[1.5px] border-b-[1.5px] border-dashed border-[#aaaaaa] divide-y-[1.5px] divide-dashed divide-[#aaaaaa]">

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
                                    onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setFirstName(c.charAt(0).toUpperCase() + c.slice(1)); }}
                                    onFocus={() => { setFocusedField("first"); setActiveRow(null); }}
                                    onBlur={() => setFocusedField(null)}
                                    align="center"
                                    weight="500"
                                    height={20}
                                    cursorHeightScale={1.5}
                                    cursorColor="#0000f4"
                                    className="w-full text-[#1e1e1e] bg-transparent cursor-pointer focus:cursor-text"
                                />
                            </div>
                            <span className="block w-[8px] h-[8px] rounded-full bg-[#0000f4] shrink-0 mx-2" />
                            <div className="flex-1 relative flex items-center justify-start px-2">
                                <SvgInput
                                    placeholder="Last Name"
                                    value={lastName}
                                    onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setLastName(c.charAt(0).toUpperCase() + c.slice(1)); }}
                                    onFocus={() => { setFocusedField("last"); setActiveRow(null); }}
                                    onBlur={() => setFocusedField(null)}
                                    align="center"
                                    weight="500"
                                    height={20}
                                    cursorHeightScale={1.5}
                                    cursorColor="#0000f4"
                                    className="w-full text-[#1e1e1e] bg-transparent cursor-pointer focus:cursor-text"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Gender Row */}
                    <motion.div layout className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {activeRow !== "gender" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 60, opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    onClick={() => setActiveRow("gender")}
                                    className="flex items-center justify-center cursor-pointer overflow-hidden"
                                >
                                    <SvgText
                                        text={gender === "private" ? "Keep it Private" : gender === "female" ? "Female" : gender === "male" ? "Male" : "Gender"}
                                        weight={gender ? "600" : "500"}
                                        height={20}
                                        className={gender ? "text-[#1e1e1e]" : "text-[#aaaaaa]"}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence initial={false}>
                            {activeRow === "gender" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <GenderEditor
                                        initialGender={gender === "private" ? "Keep it Private" : gender === "female" ? "Female" : gender === "male" ? "Male" : ""}
                                        onSave={async (g) => {
                                            const mapped = g === "Female" ? "female" : g === "Male" ? "male" : "private";
                                            setGender(mapped);
                                            setActiveRow(null);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Birthday Row */}
                    <motion.div layout className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {activeRow !== "birthday" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 60, opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    onClick={() => setActiveRow("birthday")}
                                    className="flex items-center justify-center cursor-pointer overflow-hidden"
                                >
                                    <SvgText text={birthdayIso ? formatBirthday(birthdayIso) : "Birthday"} weight={birthdayIso ? "600" : "500"} height={20} className={birthdayIso ? "text-[#1e1e1e]" : "text-[#aaaaaa]"} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence initial={false}>
                            {activeRow === "birthday" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <BirthdayEditor
                                        initialBirthday={birthdayIso}
                                        onSave={async (iso) => {
                                            setBirthdayIso(iso);
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Phone Row */}
                    <motion.div layout className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {activeRow !== "phone" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 60, opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    onClick={() => setActiveRow("phone")}
                                    className="flex items-center justify-center cursor-pointer overflow-hidden"
                                >
                                    <SvgText text={phone ? formatPhoneSpaced(phone) : "Phone Number"} weight={phone ? "600" : "500"} height={20} className={phone ? "text-[#1e1e1e]" : phoneError ? "text-[#ff0000]" : "text-[#aaaaaa]"} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence initial={false}>
                            {activeRow === "phone" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <PhoneEditor
                                        initialPhone={phone}
                                        onSave={async (p) => {
                                            setPhone(p);
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

            {/* Confirmation Button */}
            <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-8 flex justify-center w-full"
                    >
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="group cursor-pointer w-[140px] h-[50px] rounded-full bg-[#f1f1f1] hover:bg-[#0000f4] flex items-center justify-center transition-colors duration-250"
                        >
                            <ViewDetailsSaveIcon className="text-[#0000f4] group-hover:text-white transition-colors duration-250 w-[26px] h-[26px]" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
