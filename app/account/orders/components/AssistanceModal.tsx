import { SvgText } from "../../../components/text/SvgText";
import { Squircle } from "../../../components/layout/Squircle";
import { motion } from "framer-motion";

export function AssistanceModal({ onClose }: { onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <motion.div
                layout
                initial={{ opacity: 0, y: 300 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 400 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="relative z-10 flex flex-col items-stretch gap-[5px] w-[320px] mx-6"
                onClick={(e) => e.stopPropagation()}
            >
                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-full h-[160px] flex flex-col items-center justify-center gap-5 px-6 text-center">
                    <SvgText
                        text={"You will shortly receive Email or Phone call\nfrom our side once you submit\nassistance request"}
                        weight="600"
                        height={14}
                        lineHeight={1.5}
                        align="center"
                        className="text-[#1e1e1e]"
                    />
                    <SvgText
                        text={"Contact will be done to connected\nEmail & Phone number"}
                        weight="600"
                        height={12}
                        lineHeight={1.5}
                        align="center"
                        className="text-[#aaaaaa]"
                    />
                </Squircle>

                <div className="bg-[#f1f1f1] rounded-full p-[5px]">
                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-[30%] shrink-0 bg-transparent rounded-full py-4.5 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-end hover:opacity-70 transition-opacity mr-4"
                        >
                            <SvgText text="Cancel" weight="600" height={14} className="text-[#ff0000]" />
                        </button>
                        <span className="block w-[8px] aspect-square rounded-full bg-[#aaaaaa] shrink-0 mr-2" aria-hidden />
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-[#0000f4] text-white rounded-full py-4.5 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                            <SvgText text="Submit Request" weight="600" height={14} className="text-white" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
