"use client";
import { SessionProvider } from "next-auth/react";
import { WaitlistDialogProvider } from "../waitlist/WaitlistDialog";
import { WaitlistStatusProvider } from "../waitlist/WaitlistStatusProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <WaitlistStatusProvider>
                <WaitlistDialogProvider>{children}</WaitlistDialogProvider>
            </WaitlistStatusProvider>
        </SessionProvider>
    );
}
