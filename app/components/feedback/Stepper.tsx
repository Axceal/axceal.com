"use client";
import { useRouter } from "next/navigation";
import { SvgText } from "../text/SvgText";

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
        <div className={`flex justify-center items-center gap-x-6 sm:gap-x-10 ${className}`}>
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
                    <div key={step.label} className="flex items-center gap-4 sm:gap-10">
                        <button
                            type="button"
                            onClick={onClick}
                            disabled={disabled}
                            aria-disabled={disabled}
                            aria-current={step.state === "current" ? "step" : undefined}
                            className={`focus:outline-none flex items-center focus-visible:outline-none ${disabled
                                ? "cursor-not-allowed"
                                : "cursor-pointer"
                                }`}
                        >
                            <SvgText
                                text={step.label}
                                weight="600"
                                maxWidth={300}
                                height={16}
                                className={
                                    disabled ? "text-[#aaaaaa]" : "text-[#0000f4]"
                                }
                            />
                        </button>
                        {i < steps.length - 1 && (
                            <span
                                className={`block w-[8px] aspect-square rounded-full ${steps[i + 1].state === "upcoming"
                                    ? "bg-[#aaaaaa]"
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
