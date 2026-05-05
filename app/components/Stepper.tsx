"use client";
import { useRouter } from "next/navigation";
import { SvgText } from "./SvgText";

export type StepState = "past" | "current" | "upcoming";

export type Step = { label: string; state: StepState; href: string };

export function Stepper({
    steps,
    className = "",
}: {
    steps: Step[];
    className?: string;
}) {
    const router = useRouter();

    return (
        <div className={`hidden md:flex flex-wrap justify-center items-center gap-y-4 gap-x-2 sm:gap-6 ${className}`}>
            {steps.map((step, i) => {
                const disabled = step.state === "upcoming";
                const onClick = () => {
                    if (step.state === "past") {
                        router.push(step.href);
                    } else if (step.state === "current") {
                        if (typeof window !== "undefined") window.location.reload();
                    }
                };
                return (
                    <div key={step.label} className="flex items-center gap-2 sm:gap-6">
                        <button
                            type="button"
                            onClick={onClick}
                            disabled={disabled}
                            aria-disabled={disabled}
                            aria-current={step.state === "current" ? "step" : undefined}
                            className={`focus:outline-none focus-visible:outline-none ${disabled
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                        >
                            <SvgText
                                text={step.label}
                                weight="600"
                                height={16}
                                className={
                                    disabled ? "text-[#1e1e1e]" : "text-[#0000f4]"
                                }
                            />
                        </button>
                        {i < steps.length - 1 && (
                            <span
                                className={`block h-[2px] w-[15px] sm:w-[30px] rounded-full ${steps[i + 1].state === "upcoming"
                                        ? "bg-[#1e1e1e]"
                                        : "bg-[#0000f4]"
                                    }`}
                                aria-hidden
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
