"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";

type ActiveField = "email" | "password";

function LoginPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/account";
    const justRegistered = searchParams.get("registered") === "1";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [activeField, setActiveField] = useState<ActiveField>("email");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(
        justRegistered ? { kind: "info", text: "Account created. Log in to continue." } : null,
    );

    const emailWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!email || !password) {
            setMessage({ kind: "error", text: "Enter email and password." });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (!res || res.error || !res.ok) {
                setMessage({ kind: "error", text: "Invalid email or password." });
                return;
            }
            router.push(callbackUrl);
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    const GAP = 2.5;
    const activeRef = activeField === "email" ? emailWrapRef : passwordWrapRef;
    const indicatorTop = activeRef.current
        ? activeRef.current.offsetTop - GAP
        : null;

    const handleFocus = useCallback((field: ActiveField) => {
        setActiveField(field);
    }, []);

    const handleBlur = useCallback(() => {
        setActiveField("email");
    }, []);

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleLogin}
                className="relative flex flex-col items-center gap-6 w-[280px]"
            >
                <SvgText
                    text="Log into Axceal Account"
                    weight="600"
                    height={20}
                    className="text-[#1e1e1e] flex self-start"
                />

                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] bg-[#0000f4] rounded-full pointer-events-none transition-[top,opacity] duration-200 ease-in-out"
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: indicatorTop !== null ? 1 : 0,
                    }}
                />

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

                <Link href="/forgot-password" className="self-center mt-2">
                    <SvgText
                        text="Forgot Password"
                        weight="600"
                        height={16}
                        className="text-[#0000f4]"
                    />
                </Link>

                <div className="h-[120px] flex items-center justify-center text-center">
                    {message && (
                        <SvgText
                            text={message.text}
                            weight="600"
                            height={12}
                            className={message.kind === "error" ? "text-[#e11d48]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                <button
                    id="login-submit"
                    type="submit"
                    disabled={submitting}
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                >
                    <SvgText text={submitting ? "Logging in..." : "Login"} weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                </button>

                <SvgText text="or" weight="600" height={16} className="text-[#1e1e1e]" />

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

export default function LoginPage() {
    return (
        <Suspense fallback={<main className="flex-1" />}>
            <LoginPageInner />
        </Suspense>
    );
}
