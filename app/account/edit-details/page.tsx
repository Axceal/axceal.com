"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PencilIcon } from "../../components/icons/PencilIcon";
import { SvgText } from "../../components/SvgText";
import { SvgInput } from "../../components/SvgInput";
import { useEditDetailsForm, type EditField } from "./hooks/useEditDetailsForm";

export default function EditDetailsPage() {
    const {
        firstName, lastName, birthday, gender, phone,
        pillSaving,
        saveMessage,
        activeEditField,
        pillInputValue, setPillInputValue,
        firstNameRef, lastNameRef, birthdayRef, genderRef, phoneRef,
        columnRef, cardRef,
        editPillPlaceholders,
        pillTop, indicatorTop,
        openEditPill,
        savePillField,
    } = useEditDetailsForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <div ref={columnRef} className="relative flex flex-col items-center gap-6 w-full px-6 lg:px-0 lg:w-[400px] max-w-[400px]">
                {/* Header row wrapper for mobile */}
                <div className="relative flex items-center justify-center w-full mb-2 lg:mb-0">
                    <Link href="/account" className="absolute left-0 lg:right-full lg:left-auto lg:mr-6 lg:top-[18px] whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e]" />
                    </Link>
                    <div className="bg-[#0000f4] rounded-[15px] w-[240px] lg:w-full py-5 flex items-center justify-center">
                        <SvgText text="Edit Details" weight="600" height={14} className="text-white" />
                    </div>
                </div>

                {/* Card */}
                <div ref={cardRef} className="bg-[#f1f1f1] rounded-[24px] w-full px-6 pt-8 pb-8 flex flex-col gap-6 relative">
                    {/* Blue sliver on right edge pointing to floating pill */}
                    <motion.div
                        className="absolute -right-[2px] w-[2.5px] h-[30px] bg-[#0000f4] rounded-full z-20 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: activeEditField ? 1 : 0, top: indicatorTop }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />

                    <DetailRow label="First Name" value={firstName} innerRef={firstNameRef} active={activeEditField === "firstName"} onEdit={() => openEditPill("firstName")} />
                    <DetailRow label="Last Name" value={lastName} innerRef={lastNameRef} active={activeEditField === "lastName"} onEdit={() => openEditPill("lastName")} />
                    <DetailRow label="Birthday" value={birthday} innerRef={birthdayRef} active={activeEditField === "birthday"} onEdit={() => openEditPill("birthday")} disabled />
                    <DetailRow label="Gender" value={gender} innerRef={genderRef} active={activeEditField === "gender"} onEdit={() => openEditPill("gender")} disabled />
                    <DetailRow label="Phone Number" value={phone} innerRef={phoneRef} active={activeEditField === "phone"} onEdit={() => openEditPill("phone")} disabled />

                    <SvgText
                        text={"Your details are private and securely stored\nwith Axceal"}
                        weight="500"
                        align="center"
                        height={12}
                        className="text-[#aaaaaa] self-center"
                    />
                </div>

                {/* Save feedback */}
                <div className="h-[20px] flex items-center justify-center">
                    {saveMessage && (
                        <SvgText
                            text={saveMessage.text}
                            weight="600"
                            height={12}
                            className={saveMessage.kind === "error" ? "text-[#e11d48]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {/* Floating Pill */}
                <AnimatePresence>
                    {activeEditField && (
                        <motion.div
                            className="absolute left-full ml-4 z-0 flex flex-col items-center"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0, top: pillTop }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        >
                            <div className="w-[40px] h-[2.5px] bg-[#0000f4] rounded-full" />
                            <div className="bg-[#f1f1f1] rounded-full pl-8 pr-1 py-1 flex items-center justify-between w-[300px]">
                                <SvgInput
                                    value={pillInputValue}
                                    onChange={setPillInputValue}
                                    placeholder={editPillPlaceholders[activeEditField]}
                                    weight="600"
                                    height={14}
                                    className="flex-1 bg-transparent text-[#1e1e1e]"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            savePillField();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={savePillField}
                                    disabled={!pillInputValue.trim() || pillSaving}
                                    className="bg-[#aaaaaa] rounded-full px-8 py-3.5 cursor-pointer hover:bg-[#0000f4] transition-colors shrink-0 flex items-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#aaaaaa] focus:outline-none"
                                >
                                    <SvgText text={pillSaving ? "..." : "Save"} weight="600" height={14} className="text-white" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

type DetailRowProps = {
    label: string;
    value: string;
    innerRef: React.RefObject<HTMLDivElement | null>;
    active: boolean;
    onEdit: () => void;
    disabled?: boolean;
};

function DetailRow({ label, value, innerRef, active, onEdit, disabled }: DetailRowProps) {
    return (
        <div ref={innerRef} className="flex gap-4">
            <div className="w-[120px] flex justify-end shrink-0">
                <SvgText text={label} weight="600" height={14} className="text-[#aaaaaa] self-center" />
            </div>
            <div className="flex-1 min-w-0 flex items-center">
                {value ? (
                    <SvgText text={value} weight="600" height={16} className="text-[#1e1e1e] self-center" />
                ) : null}
            </div>
            <button
                type="button"
                onClick={disabled ? undefined : onEdit}
                disabled={disabled}
                aria-label={`Edit ${label}`}
                className={`focus:outline-none focus-visible:outline-none shrink-0 ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <PencilIcon className={`mr-4 ${active ? "text-[#0000f4]" : "text-[#1e1e1e] opacity-70"}`} />
            </button>
        </div>
    );
}
