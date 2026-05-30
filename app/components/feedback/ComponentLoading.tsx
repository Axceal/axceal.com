import { LoadingBar } from "./LoadingBar";

interface ComponentLoadingProps {
    width: number | string;
    height: number | string;
    borderRadius?: number | string;
    className?: string;
    barClassName?: string;
}

export function ComponentLoading({
    width,
    height,
    borderRadius = 24,
    className = "",
    barClassName = "w-[150px]",
}: ComponentLoadingProps) {
    return (
        <div
            className={`bg-[#f1f1f1] flex items-center justify-center ${className}`}
            style={{ width, height, borderRadius }}
            aria-busy="true"
            aria-live="polite"
        >
            <LoadingBar className={barClassName} trackClassName="bg-white" />
        </div>
    );
}
