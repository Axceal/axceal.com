"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SvgText } from "../components/text/SvgText";
import { AxcealLogo } from "../components/icons/brand/AxcealLogo";
import { UserIcon } from "../components/icons/account/UserIcon";
import { Squircle } from "../components/layout/Squircle";
import { AxcealFeatureIcon } from "./components/AxcealFeatureIcon";
import { QuickCheckoutIcon } from "./components/QuickCheckoutIcon";
import { SavedPreferencesIcon } from "./components/SavedPreferencesIcon";
import { ReceiveUpdatesIcon } from "./components/ReceiveUpdatesIcon";
import { RequestAssistanceIcon } from "./components/RequestAssistanceIcon";
import { SecuredDataIcon } from "./components/SecuredDataIcon";

function AuthChoiceContent() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    // Encode so `&`/`=`/etc inside `from` cannot pollute downstream query params.
    const suffix = from ? `?from=${encodeURIComponent(from)}` : "";

    return (
        <main className="flex-1 flex flex-col items-center justify-center -mt-10">
            {/* Center Container */}
            <div className="flex flex-col items-center gap-[10px]">

                {/* Squircle Rectangle */}
                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-[320px] h-[380px] pt-[30px] px-[30px] pb-[40px] flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <AxcealLogo className="w-8 h-auto text-[#0000f4]" />
                        <span className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa]" />
                        <UserIcon className="w-[28px] h-[28px] text-[#aaaaaa] -mr-[5px]" />
                        <SvgText text="Axceal Account" weight="600" height={18} className="text-[#1e1e1e]" />
                    </div>

                    {/* Features List */}
                    <div className="flex flex-col gap-[12px] pl-1 mt-5">
                        <div className="flex items-center gap-3">
                            <AxcealFeatureIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Access to Axceal Tech" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <QuickCheckoutIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Quick Checkouts" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <SavedPreferencesIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Saved preferences" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <ReceiveUpdatesIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Receive Updates" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <RequestAssistanceIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Request Assistance" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex items-center gap-3">
                            <SecuredDataIcon className="w-[20px] h-auto text-[#aaaaaa]" />
                            <SvgText text="Secured personal data" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                    </div>

                    {/* Footer Text */}
                    <div className="text-center mt-6 flex flex-col items-center gap-1">
                        <SvgText text="By clicking 'Create Account', you acknowledge" weight="500" height={12} className="text-[#aaaaaa]" />
                        <SvgText text="that you have read and agree to the" weight="500" height={12} className="text-[#aaaaaa]" />
                        <div className="flex items-center gap-1 leading-none">
                            <Link href="/terms" className="hover:opacity-80 transition-opacity flex items-center">
                                <SvgText text="Terms of Service" weight="600" height={12} className="text-[#0000f4]" />
                            </Link>
                            <SvgText text="and" weight="500" height={12} className="text-[#aaaaaa]" />
                            <Link href="/privacy" className="hover:opacity-80 transition-opacity flex items-center">
                                <SvgText text="Privacy Policy." weight="600" height={12} className="text-[#0000f4]" />
                            </Link>
                        </div>
                    </div>
                </Squircle>

                {/* Bottom Action Buttons */}
                <div className="w-[320px] flex items-center justify-between">
                    <Link
                        href={`/login${suffix}`}
                        className="h-[50px] px-[30px] bg-[#ffffff] border-[2px] border-[#f1f1f1] rounded-full flex items-center justify-center flex-shrink-0"
                    >
                        <SvgText text="Login" weight="600" height={16} className="text-[#0000f4]" maxWidth={100} />
                    </Link>
                    <span className="w-[10px] h-[10px] rounded-full bg-[#aaaaaa] flex-shrink-0" />
                    <Link
                        href={`/create-account${suffix}`}
                        className="h-[50px] px-[30px] bg-[#0000f4] rounded-full flex items-center justify-center flex-shrink-0"
                    >
                        <SvgText text="Create Account" weight="600" height={16} className="text-white" />
                    </Link>
                </div>

            </div>
        </main>
    );
}

export default function AuthChoicePage() {
    return (
        <Suspense>
            <AuthChoiceContent />
        </Suspense>
    );
}
