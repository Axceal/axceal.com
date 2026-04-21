"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";

type ActiveField = "email" | "otp" | "password" | "repassword";

export default function CreateAccountPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");

    // Default: indicator points at Email (first field)
    const [activeField, setActiveField] = useState<ActiveField>("email");
    // Which OTP digit is currently focused (-1 = none)
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);

    const [sendingOtp, setSendingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

    // Wrapper refs for each field group (indicator anchors to these)
    const emailWrapRef = useRef<HTMLDivElement>(null);
    const otpWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const repasswordWrapRef = useRef<HTMLDivElement>(null);

    // Force re-render after mount so refs have real offsetTop values
    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    const handleSendOtp = async () => {
        if (!email || sendingOtp) return;
        setSendingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const body = await res.json();
            if (!res.ok || !body?.ok) {
                setMessage({
                    kind: "error",
                    text: body?.error?.message ?? "Could not send OTP. Please try again.",
                });
                return;
            }
            setMessage({ kind: "info", text: "OTP sent. Check your inbox." });
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSendingOtp(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = v;
        setOtp(updated);
        if (v && index < 3) {
            setTimeout(() => document.getElementById(`otp-digit-${index + 1}`)?.focus(), 10);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const otpCode = otp.join("");
        if (!email) return setMessage({ kind: "error", text: "Enter your email." });
        if (otpCode.length !== 4) return setMessage({ kind: "error", text: "Enter the 4-digit OTP." });
        if (password.length < 8) return setMessage({ kind: "error", text: "Password must be at least 8 characters." });
        if (password !== rePassword) return setMessage({ kind: "error", text: "Passwords do not match." });

        setSubmitting(true);
        setMessage(null);
        try {
            const verifyRes = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, otp: otpCode }),
            });
            const verifyBody = await verifyRes.json();
            if (!verifyRes.ok || !verifyBody?.ok) {
                setMessage({
                    kind: "error",
                    text: verifyBody?.error?.message ?? "OTP verification failed.",
                });
                return;
            }
            const otpToken: string = verifyBody.data.otpToken;

            const registerRes = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password, otpToken }),
            });
            const registerBody = await registerRes.json();
            if (!registerRes.ok || !registerBody?.ok) {
                setMessage({
                    kind: "error",
                    text: registerBody?.error?.message ?? "Could not create account.",
                });
                return;
            }

            const signInRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (!signInRes || signInRes.error || !signInRes.ok) {
                router.push("/login?registered=1");
                return;
            }
            router.push("/account");
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFocus = useCallback((field: ActiveField) => setActiveField(field), []);
    // On blur return to Email (first field)
    const handleBlur = useCallback(() => {
        setActiveField("email");
        setFocusedOtpIdx(-1);
    }, []);

    // Compute indicator top: 2.5px above the active field's wrapper top edge
    const GAP = 2.5;
    const refMap: Record<ActiveField, React.RefObject<HTMLDivElement | null>> = {
        email: emailWrapRef,
        otp: otpWrapRef,
        password: passwordWrapRef,
        repassword: repasswordWrapRef,
    };
    const activeRef = refMap[activeField];
    const indicatorTop = activeRef.current
        ? activeRef.current.offsetTop - GAP
        : null;

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-5 w-[280px]"
            >
                {/* Title */}
                <SvgText
                    text="Creating Axceal Account"
                    weight="600"
                    height={20}
                    className="text-[#1e1e1e] flex self-start mb-2"
                />

                {/* Sliding active-field indicator */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] bg-[#0000f4] rounded-full pointer-events-none transition-[top,opacity] duration-200 ease-in-out"
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: indicatorTop !== null ? 1 : 0,
                    }}
                />

                {/* Email + Send OTP */}
                <div ref={emailWrapRef} className="w-full">
                    <SvgInput
                        id="create-account-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                        weight="600"
                        height={14}
                        className="w-full  bg-[#f1f1f1] text-[#1e1e1e]  rounded-full pl-8 pr-1.5 py-1.5 transition-all"
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                        rightSlot={
                            <button
                                type="button"
                                id="send-otp-btn"
                                onClick={handleSendOtp}
                                disabled={sendingOtp || !email}
                                className="bg-[#aaaaaa]  text-white font-semibold rounded-full px-5 py-3 cursor-pointer hover:bg-[#0000f4] transition-colors shrink-0 flex items-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#aaaaaa]"
                            >
                                <SvgText text={sendingOtp ? "Sending..." : "Send OTP"} weight="600" height={14} className="text-white h-full" />
                            </button>
                        }
                    />
                </div>

                {/* OTP Section */}
                <div ref={otpWrapRef} className="bg-[#f1f1f1] rounded-[20px] px-4 flex flex-col justify-center items-center gap-2 w-full h-[100px]">
                    <SvgText
                        text="OTP"
                        weight="600"
                        height={14}
                        className="text-[#aaaaaa] flex self-start"
                    />
                    <div className="flex gap-3">
                        {otp.map((digit, i) => (
                            <div
                                key={`otp-${i}`}
                                onClick={() => document.getElementById(`otp-digit-${i}`)?.focus()}
                                className={`w-12 h-12 rounded-full bg-white flex shrink-0 transition-all cursor-text ${focusedOtpIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                            >
                                <SvgInput
                                    id={`otp-digit-${i}`}
                                    value={digit}
                                    onChange={(val) => handleOtpChange(i, val)}
                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                    onFocus={() => { handleFocus("otp"); setFocusedOtpIdx(i); }}
                                    onBlur={handleBlur}
                                    height={18}
                                    weight="600"
                                    align="center"
                                    className="text-[#1e1e1e] w-full"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Password */}
                <div ref={passwordWrapRef} className="w-full">
                    <SvgInput
                        id="create-account-password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        weight="600"
                        height={14}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4.5 transition-all"
                        onFocus={() => handleFocus("password")}
                        onBlur={handleBlur}
                    />
                </div>

                {/* Re-Enter Password */}
                <div ref={repasswordWrapRef} className="w-full">
                    <SvgInput
                        id="create-account-repassword"
                        type="password"
                        placeholder="Re-Enter Password"
                        value={rePassword}
                        onChange={setRePassword}
                        weight="600"
                        height={14}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4.5 transition-all"
                        onFocus={() => handleFocus("repassword")}
                        onBlur={handleBlur}
                    />
                </div>

                {/* Message / spacer (fixed height so layout stays stable) */}
                <div className="h-[40px] flex items-center justify-center text-center">
                    {message && (
                        <SvgText
                            text={message.text}
                            weight="600"
                            height={12}
                            className={message.kind === "error" ? "text-[#e11d48]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {/* Next button */}
                <button
                    id="create-account-submit"
                    type="submit"
                    disabled={submitting}
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                >
                    <SvgText text={submitting ? "Creating..." : "Next"} weight="600" height={16} className="text-[#aaaaaa] group-hover:text-white group-disabled:group-hover:text-[#aaaaaa]" />
                </button>

                {/* or */}
                <SvgText text="or" weight="600" height={16} className="text-[#1e1e1e]" />

                {/* Login link */}
                <Link
                    href="/login"
                    id="go-to-login"
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group"
                >
                    <SvgText text="Login" weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                </Link>
            </form>
        </main>
    );
}
