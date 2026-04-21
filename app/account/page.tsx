"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserIcon } from "../components/icons/UserIcon";
import { SvgText } from "../components/SvgText";
import { Squircle } from "../components/Squircle";
import { ordinal } from "./details/_helpers";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;
// user card width (300) + gap-[10px] (10) = 310px horizontal shift
const SHIFT = 500;

type AccountOverview = {
    email: string;
    createdAt: string;
    profile: {
        firstName: string | null;
        lastName: string | null;
        birthday: string | null;
        gender: "female" | "male" | "private" | null;
        phoneCountryCode: string | null;
        phone: string | null;
        phoneSign: "+" | "-";
    };
};

const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function formatCreatedAt(iso: string): string {
    const d = new Date(iso);
    return `${ordinal(d.getDate())} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function splitEmail(email: string): [string, string] {
    const at = email.indexOf("@");
    if (at === -1) return [email, ""];
    return [email.slice(0, at), email.slice(at)];
}

export default function Account() {
    const [ordersOpen, setOrdersOpen] = useState(false);
    const [data, setData] = useState<AccountOverview | null>(null);

    useEffect(() => {
        const ac = new AbortController();
        fetch("/api/account/me", { signal: ac.signal, cache: "no-store" })
            .then(async (r) => (r.ok ? r.json() : null))
            .then((body: { ok?: boolean; data?: AccountOverview } | null) => {
                if (body?.ok && body.data) setData(body.data);
            })
            .catch(() => { /* ignore */ });
        return () => ac.abort();
    }, []);

    const [localPart, domainPart] = data ? splitEmail(data.email) : ["", ""];
    const createdLine = data
        ? `Account created on ${formatCreatedAt(data.createdAt)}.`
        : "";

    const p = data?.profile;
    const hasAny = p && (p.firstName || p.lastName || p.birthday || p.gender || p.phone);
    const filled: string[] = [];
    if (p?.firstName || p?.lastName) filled.push("Name");
    if (p?.birthday) filled.push("Birthday");
    if (p?.gender) filled.push("Gender");
    if (p?.phone) filled.push("Phone Number");
    const descriptionTail = hasAny
        ? `Includes ${filled.join(", ")}`
        : "Add your Name, Birthday, Gender & Phone Number";

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
                            <SvgText text={localPart || " "} weight="600" height={16} className="text-black" />
                            <SvgText text={domainPart || " "} weight="500" height={16} className="text-[#aaaaaa]" />
                        </div>
                    </div>

                    {/* Account description */}
                    <p className="text-[14px] font-semibold text-[#aaaaaa] leading-[1.5]">
                        <SvgText
                            text={`${createdLine}\n${descriptionTail}`}
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
