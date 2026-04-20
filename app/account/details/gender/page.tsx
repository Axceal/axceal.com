"use client";
import { motion } from "framer-motion";
import { SvgText } from "../../../components/SvgText";
import { useAccountDetails } from "../_context";
import { SPRING } from "../_constants";

export default function GenderPage() {
    const { firstName, gender, setGender } = useAccountDetails();

    return (
        <div className="w-full flex flex-col gap-5 justify-center items-center">
            <SvgText
                text={`${firstName}, Select your gender`}
                weight="600" height={16} className="text-[#aaaaaa] self-center mt-[15px]"
            />
            <div className="flex flex-col gap-3 w-[200px] self-center">
                {["Female", "Male", "Keep it Private"].map(g => {
                    const active = gender === g;
                    return (
                        <motion.button
                            key={g}
                            onClick={() => setGender(g)}
                            initial={{ backgroundColor: "#f1f1f1" }}
                            animate={{ backgroundColor: active ? "#0000f4" : "#f1f1f1" }}
                            transition={SPRING}
                            className="rounded-[16px] px-8 py-5 cursor-pointer flex items-center justify-center"
                        >
                            <motion.div
                                animate={{ color: active ? "#ffffff" : "#1e1e1e" }}
                                transition={SPRING}
                                className="flex items-center justify-center text-center"
                            >
                                <SvgText text={g} weight="600" height={16} />
                            </motion.div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
