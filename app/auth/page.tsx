"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SvgText } from "../components/SvgText";
import { AxcealLogo } from "../components/icons/AxcealLogo";

export default function AuthChoicePage() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    const suffix = from ? `?from=${from}` : "";

    return (
        <main className="flex-1 flex flex-col items-center justify-center -mt-10">
            {/* Center Container */}
            <div className="flex flex-col items-center gap-8">
                {/* Logo Circle */}
                <div className="w-[50px] h-[50px] rounded-full bg-[#0000f4] flex items-center justify-center">
                    <AxcealLogo className="w-[20px] h-auto text-white mt-0.5" />
                </div>

                {/* Choices */}
                <div className="flex flex-col gap-5">
                    {/* Login Choice */}
                    <div className="w-[340px] bg-[#f1f1f1] rounded-full pl-8 pr-1 py-1 flex items-center justify-between group">
                        <SvgText
                            text="Already have a account"
                            weight="600"
                            height={16}
                            className="text-[#1e1e1e]"
                        />
                        <Link
                            href={`/login${suffix}`}
                            className="bg-[#0000f4] rounded-full w-[100px] py-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <SvgText text="Login" weight="600" height={16} className="text-white" />
                        </Link>
                    </div>

                    {/* Create Choice */}
                    <div className="w-[340px] bg-[#f1f1f1] rounded-full pl-8 pr-1 py-1 flex items-center justify-between group">
                        <SvgText
                            text="New to Axceal account"
                            weight="600"
                            height={16}
                            className="text-[#1e1e1e]"
                        />
                        <Link
                            href={`/create-account${suffix}`}
                            className="bg-[#0000f4] rounded-full w-[100px] py-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <SvgText text="Create" weight="600" height={16} className="text-white" />
                        </Link>
                    </div>
                    <div className="w-[140px] mt-6 self-center">
                        <Link
                            href="/"
                            className="bg-[#f1f1f1] rounded-full px-[30px] py-3 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                        >
                            <SvgText text="Back to Store" weight="600" height={14} className="text-[#0000f4]" />
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
