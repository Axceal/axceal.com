"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewDetailsAddIcon } from "../../components/icons/action/ViewDetailsAddIcon";
import { ViewDetailsSaveIcon } from "../../components/icons/action/ViewDetailsSaveIcon";
import { AxcealLogo } from "../../components/icons/brand/AxcealLogo";
import { SvgText } from "../../components/text/SvgText";
import { useEditDetailsForm } from "./hooks/useEditDetailsForm";
import type { Profile } from "@/lib/contracts/profile";

export function ViewDetailsShell({ initial, phone: initialPhone }: { initial: Profile; phone: string | null }) {
    const {
        firstName, lastName, birthday, gender, phone,
        firstNameRef, lastNameRef, birthdayRef, genderRef, phoneRef,
    } = useEditDetailsForm(initial, initialPhone);

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="relative flex flex-col items-center w-full px-1 lg:px-0 lg:w-[360px] max-w-[360px]">

                {/* Header */}
                <div className="relative flex items-center justify-center w-full mb-6">
                    {/* Back Button */}
                    <Link href="/account" className="absolute left-0 flex items-center whitespace-nowrap hover:opacity-80 transition-opacity">
                        <SvgText text="Back" weight="600" height={16} className="text-[#0000f4]" />
                    </Link>
                    {/* Logo Circle */}
                    <div className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center">
                        <AxcealLogo className="w-[24px] h-auto text-white mt-0.5" />
                    </div>
                </div>

                {/* Fields */}
                <div className="w-full flex flex-col gap-[10px]">
                    <DetailRow label="First Name" value={firstName} innerRef={firstNameRef} />
                    <DetailRow label="Last Name" value={lastName} innerRef={lastNameRef} />
                    <DetailRow label="Birthday" value={birthday} innerRef={birthdayRef} />
                    <DetailRow label="Gender" value={gender === "private" ? "Keep it Private" : (gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "")} innerRef={genderRef} />
                    <DetailRow label="Phone Number" value={phone} innerRef={phoneRef} />
                </div>

                {/* Footer Text */}
                <div className="flex flex-col items-center gap-1 mt-10 w-full">
                    <SvgText
                        text="Your details are private and securely stored with"
                        weight="500"
                        height={12}
                        className="text-[#aaaaaa]"
                    />
                    <div className="flex items-center">
                        <SvgText
                            text="Axceal. Take a look at"
                            weight="500"
                            height={12}
                            className="text-[#aaaaaa]"
                        />
                        <Link href="/privacy-policy" className="hover:opacity-80 transition-opacity">
                            <SvgText
                                text=" Privacy Policies"
                                weight="500"
                                maxWidth={400}
                                height={12}
                                className="text-[#0000f4]"
                            />
                        </Link>
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
    const router = useRouter();
    const isPhone = label === "Phone Number";

    let displayValue: React.ReactNode = null;
    if (value) {
        if (isPhone) {
            const last4 = value.slice(-4);
            displayValue = (
                <div className="flex items-center gap-[4px]">
                    <span className="block w-[8px] h-[8px] rounded-full bg-[#1e1e1e]" />
                    <span className="block w-[8px] h-[8px] rounded-full bg-[#1e1e1e]" />
                    <span className="block w-[8px] h-[8px] rounded-full bg-[#1e1e1e]" />
                    <div className="ml-1 flex items-center gap-[4px]">
                        {last4.split("").map((digit, i) => (
                            <SvgText key={i} text={digit} weight="600" height={16} className="text-[#1e1e1e]" />
                        ))}
                    </div>
                </div>
            );
        } else {
            displayValue = <SvgText text={value} weight="600" height={16} className="text-[#1e1e1e]" />;
        }
    }

    return (
        <div
            ref={innerRef}
            onClick={() => router.push("/account/details-unified")}
            className="relative w-full h-[50px] bg-[#f1f1f1] rounded-full flex items-center justify-center px-4 cursor-pointer"
        >
            {/* Left Icon (Absolute) */}
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 flex items-center justify-center w-[26px] h-[26px]">
                {value ? (
                    <ViewDetailsSaveIcon className="text-[#aaaaaa] w-[24px] h-[24px]" />
                ) : (
                    <ViewDetailsAddIcon className="text-[#aaaaaa] w-[26px] h-[26px]" />
                )}
            </div>

            {/* Centered Content */}
            <div className="w-full">
                {value ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                        <div className="flex justify-end">
                            <SvgText text={label} weight="600" height={16} className="text-[#aaaaaa]" />
                        </div>
                        <span className="block w-[8px] h-[8px] rounded-full bg-[#aaaaaa]" />
                        <div className={`flex ${isPhone ? "justify-end pr-6" : "justify-start"}`}>
                            {displayValue}
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <SvgText text={label} weight="600" height={16} className="text-[#aaaaaa]" />
                    </div>
                )}
            </div>
        </div>
    );
}
