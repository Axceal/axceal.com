import { EyeOpenIcon } from "../icons/state/EyeOpenIcon";
import { EyeClosedIcon } from "../icons/state/EyeClosedIcon";

export function PasswordToggle({
    shown,
    onToggle,
}: {
    shown: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="bg-[#0000f4] rounded-full w-[42px] h-[42px] flex items-center justify-center cursor-pointer transition-colors shrink-0 focus:outline-none focus-visible:outline-none"
        >
            {shown ? (
                <EyeOpenIcon className="text-white" />
            ) : (
                <EyeClosedIcon className="text-white" />
            )}
        </button>
    );
}
