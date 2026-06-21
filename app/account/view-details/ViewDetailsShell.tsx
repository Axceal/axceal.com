"use client";

import Link from "next/link";
import { AddButtonIcon } from "../../components/icons/action/AddButtonIcon";
import { SvgText } from "../../components/text/SvgText";
import { useEditDetailsForm } from "./hooks/useEditDetailsForm";
import { Squircle } from "@/app/components/layout/Squircle";
import type { Profile } from "@/lib/contracts/profile";

export function ViewDetailsShell({ initial, phone: initialPhone }: { initial: Profile; phone: string | null }) {
    const {
        firstName, lastName, birthday, gender, phone,
        firstNameRef, lastNameRef, birthdayRef, genderRef, phoneRef,
    } = useEditDetailsForm(initial, initialPhone);

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="relative flex flex-col items-center gap-6 w-full px-6 lg:px-0 lg:w-[400px] max-w-[400px]">
                {/* Mobile Back Button */}
                <div className="flex lg:hidden w-full items-center justify-start -mb-[5px]">
                    <Link href="/account" className="flex items-center w-fit shrink-0 whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e] " />
                    </Link>
                </div>

                {/* Header */}
                <div className="relative flex items-center justify-center w-full mb-2 lg:mb-0">
                    {/* Desktop Back Button */}
                    <Link href="/account" className="hidden lg:flex absolute right-full mr-[30px] top-[22px] whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e] " />
                    </Link>
                    <Squircle smoothing={60} borderRadius={15} className="bg-[#0000f4] w-full py-5 flex items-center justify-center">
                        <SvgText text="Details" weight="600" height={14} className="text-white" />
                    </Squircle>
                </div>

                {/* Card */}
                <div className="bg-[#f1f1f1] rounded-[24px] w-full px-6 pt-[35px] pb-[35px] flex flex-col gap-6">
                    <DetailRow label="First Name" value={firstName} innerRef={firstNameRef} />
                    <DetailRow label="Last Name" value={lastName} innerRef={lastNameRef} />
                    <DetailRow label="Birthday" value={birthday} innerRef={birthdayRef} />
                    <DetailRow label="Gender" value={gender} innerRef={genderRef} />
                    <DetailRow label="Phone Number" value={phone} innerRef={phoneRef} />

                    <div className="flex flex-col items-center gap-0 mt-[10px] self-center">
                        <SvgText
                            text="Your details are private and securely stored with"
                            weight="500"
                            height={12}
                            className="text-[#aaaaaa]"
                        />
                        <div className="flex items-center">
                            <SvgText
                                text="Axceal. Take a look at "
                                weight="500"
                                height={12}
                                className="text-[#aaaaaa]"
                            />
                            <Link href="/privacy-policy">
                                <SvgText
                                    text="Privacy Policies"
                                    weight="500"
                                    height={12}
                                    className="text-[#0000f4]"
                                />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

type DetailRowProps = {
    label: string;
    value: string;
    innerRef: React.RefObject<HTMLDivElement | null>;
};

function DetailRow({ label, value, innerRef }: DetailRowProps) {
    return (
        <div ref={innerRef} className="flex items-center gap-4">
            <div className="flex-1 flex justify-end">
                <SvgText text={label} weight="600" height={16} className="text-[#aaaaaa]" />
            </div>
            <div className="flex-1 min-w-0 flex items-center">
                {value ? (
                    <SvgText text={value} weight="600" height={16} className="text-[#1e1e1e]" />
                ) : (
                    <button
                        type="button"
                        disabled
                        aria-label={`Add ${label}`}
                        className="focus:outline-none focus-visible:outline-none cursor-not-allowed mx-auto"
                    >
                        <AddButtonIcon className="text-[#aaaaaa]" />
                    </button>
                )}
            </div>
        </div>
    );
}
