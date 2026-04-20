"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";

type ActiveField = "email" | "password";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Default to "email" — the indicator always points to the first field
    const [activeField, setActiveField] = useState<ActiveField>("email");

    const emailWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: implement auth
    };

    // Force a re-render after mount so refs resolve and indicatorTop is correct
    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    // Position indicator just ABOVE the active pill (8px gap above top edge)
    const GAP = 2.5;
    const activeRef = activeField === "email" ? emailWrapRef : passwordWrapRef;
    const indicatorTop = activeRef.current
        ? activeRef.current.offsetTop - GAP
        : null;

    const handleFocus = useCallback((field: ActiveField) => {
        setActiveField(field);
    }, []);

    // On blur return the indicator to the first field (email)
    const handleBlur = useCallback(() => {
        setActiveField("email");
    }, []);

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleLogin}
                className="relative flex flex-col items-center gap-6 w-[280px]"
            >
                {/* Title */}
                <SvgText
                    text="Log into Axceal Account"
                    weight="600"
                    height={20}
                    className="text-[#1e1e1e] flex self-start"
                />

                {/* 
                    Active-field indicator — always visible.
                    Starts above Email (first field). 
                    Slides to above whichever field is active.
                    Returns to Email on blur.
                */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] bg-[#0000f4] rounded-full pointer-events-none transition-[top,opacity] duration-200 ease-in-out"
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: indicatorTop !== null ? 1 : 0,
                    }}
                />

                {/* Email pill */}
                <div ref={emailWrapRef} className="w-full">
                    <SvgInput
                        id="login-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                        weight="500"
                        height={16}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4 transition-all"
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                    />
                </div>

                {/* Password pill */}
                <div ref={passwordWrapRef} className="w-full">
                    <SvgInput
                        id="login-password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        weight="500"
                        height={16}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4 transition-all"
                        onFocus={() => handleFocus("password")}
                        onBlur={handleBlur}
                    />
                </div>

                {/* Forgot password */}
                <Link href="/forgot-password" className="self-center mt-2">
                    <SvgText
                        text="Forgot Password"
                        weight="600"
                        height={16}
                        className="text-[#0000f4]"
                    />
                </Link>

                {/* Spacer */}
                <div className="h-[160px]" />

                {/* Login button */}
                <button
                    id="login-submit"
                    type="submit"
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group"
                >
                    <SvgText text="Login" weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                </button>

                {/* or */}
                <SvgText text="or" weight="600" height={16} className="text-[#1e1e1e]" />

                {/* Create account */}
                <Link
                    href="/create-account"
                    id="go-to-create-account"
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group"
                >
                    <SvgText text="Create Axceal Account" weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                </Link>
            </form>
        </main>
    );
}
