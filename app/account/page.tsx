"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserIcon } from "../components/icons/UserIcon";
import { SvgText } from "../components/SvgText";
import { Squircle } from "../components/Squircle";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;
// user card width (300) + gap-[10px] (10) = 310px horizontal shift
const SHIFT = 500;

export default function Account() {
    const [ordersOpen, setOrdersOpen] = useState(false);

    return (
        <main className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="flex self-center gap-[10px] items-start ">

                {/* Left card: user info — slides out left when orders open */}
                <motion.div
                    className="bg-[#f1f1f1] rounded-3xl p-8 w-[300px] h-[300px] flex flex-col gap-6 shrink-0"
                    initial={{ x: 0, opacity: 1 }}
                    animate={{ x: ordersOpen ? -SHIFT : 0, opacity: ordersOpen ? 0 : 1 }}
                    transition={SPRING}
                    style={{ pointerEvents: ordersOpen ? "none" : "auto" }}
                >
                    {/* Avatar + name/email */}
                    <div className="flex items-center gap-4">
                        <div className="w-[52px] h-[52px] rounded-full pb-[2px] bg-[#0000f4] flex items-center justify-center shrink-0">
                            <UserIcon className="w-[28px] h-[28px] text-white stroke-[#0000f4]" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <SvgText text="userEmail" weight="600" height={16} className="text-black" />
                            <SvgText text="@example.com" weight="500" height={16} className="text-[#aaaaaa]" />
                        </div>
                    </div>

                    {/* Account description */}
                    <p className="text-[14px] font-semibold text-[#aaaaaa] leading-[1.5]">
                        <SvgText
                            text={"Account created on 04th June 2026.\nIncludes Phone Number, Birthday, \nBilling & Shipping address"}
                            weight="600"
                            height={14}
                            className="text-[#aaaaaa]"
                        />
                    </p>

                    {/* Actions */}
                    <div className="flex justify-center items-center gap-10 flex-col">
                        <SvgText text="Edit Details" weight="600" height={16} className="text-[#1e1e1e] cursor-pointer" />
                        <SvgText text="Change Password" weight="600" height={16} className="text-[#1e1e1e] cursor-pointer" />
                    </div>
                </motion.div>

                {/* Right section: orders card + content — slides left together */}
                <motion.div
                    className=""
                    initial={{ x: 0 }}
                    animate={{ x: ordersOpen ? -SHIFT : 0 }}
                    transition={SPRING}
                >
                    {/* Back button — always rendered, animates in sync with slide */}
                    <motion.button
                        className="absolute -top-8 left-0 cursor-pointer"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: ordersOpen ? 1 : 0, y: ordersOpen ? 0 : 6 }}
                        transition={ordersOpen ? SPRING : { duration: 0 }}
                        style={{ pointerEvents: ordersOpen ? "auto" : "none" }}
                        onClick={() => setOrdersOpen(false)}
                    >
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e]" />
                    </motion.button>

                    {/* Orders card */}
                    <Squircle borderRadius={22} smoothing={50} className="w-[300px] h-[100px]">
                        <motion.div
                            className="w-full h-full flex justify-center items-center cursor-pointer"
                            initial={{ backgroundColor: "#f1f1f1" }}
                            animate={{ backgroundColor: ordersOpen ? "#0000f4" : "#f1f1f1" }}
                            transition={SPRING}
                            onClick={() => !ordersOpen && setOrdersOpen(true)}
                        >
                            <motion.div className="flex items-center justify-center" initial={{ color: "#0000f4" }} animate={{ color: ordersOpen ? "#ffffff" : "#0000f4" }} transition={SPRING}>
                                <SvgText text="Orders" weight="600" height={18} />
                            </motion.div>
                        </motion.div>
                    </Squircle>

                    {/* Order list — always rendered, animates in sync with slide */}
                    <motion.div
                        className="absolute top-[15px] left-[310px] items-center px-2 py-6"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: ordersOpen ? 1 : 0, x: ordersOpen ? 0 : 16 }}
                        transition={ordersOpen ? SPRING : { duration: 0 }}
                        style={{ pointerEvents: ordersOpen ? "auto" : "none" }}
                    >
                        <SvgText text="No Orders made yet" weight="600" height={16} className="text-[#aaaaaa]" />
                    </motion.div>
                </motion.div>

            </div>
        </main>
    );
}
