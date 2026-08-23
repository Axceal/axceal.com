"use client";

import { useState } from "react";
import { SvgText } from "../text/SvgText";
import { RightArrow } from "../icons/action/RightArrow";

export function ExpandableSection({ title, children }: { title: string, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section className="flex flex-col w-full gap-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-[50px] bg-[#f1f1f1] rounded-full flex items-center justify-between px-[30px] transition-colors cursor-pointer shrink-0"
            >
                <SvgText
                    as="h2"
                    text={title}
                    height={16}
                    weight="600"
                    className={isOpen ? "text-[#1e1e1e]" : "text-[#aaaaaa]"}
                />
                <RightArrow
                    className={`shrink-0 transition-transform duration-300 text-[#0000f4] ${isOpen ? "-rotate-90" : "rotate-90"}`}
                />
            </button>
            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="flex flex-col px-[30px] pt-2 pb-2">
                        <div className="w-full flex flex-col gap-4">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
