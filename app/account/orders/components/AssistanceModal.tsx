import { SvgText } from "../../../components/SvgText";

export function AssistanceModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[20px] h-[160px] px-8 py-6 flex items-center gap-6 max-w-[600px] w-full mx-6 "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-4 flex-1">
                    <SvgText
                        text={"You will shortly receive Email or Phone call from \nour side once you submit assistance request"}
                        weight="600"
                        height={16}
                        className="text-[#1e1e1e]"
                    />
                    <SvgText
                        text="Contact will be done to connected Email & Phone number"
                        weight="500"
                        height={14}
                        className="text-[#aaaaaa]"
                    />
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-[#0000f4] text-white rounded-full px-8 py-[15px] shrink-0 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-center"
                >
                    <SvgText text="Submit" weight="600" height={16} className="text-white" />
                </button>
            </div>
        </div>
    );
}
