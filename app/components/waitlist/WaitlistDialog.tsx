"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SvgText } from "../text/SvgText";
import { formatPosition } from "@/lib/format";
import { apiFetch } from "@/lib/http/client";
import { Squircle } from "../layout/Squircle";

// W5 — central context that any CTA can dispatch to. Two variants:
//   - "join":   unauth visitor invited to create an account
//   - "status": authed in-queue user reminded of their position
// Position for `status` is passed in by the caller (the CTA already loaded
// it via /api/waitlist/status). Position for `join` is fetched live from
// /api/waitlist/next when the dialog opens.

type DialogState =
  | { kind: "closed" }
  | { kind: "join" }
  | { kind: "status"; position: number };

interface WaitlistDialogContextValue {
  openJoin: () => void;
  openStatus: (position: number) => void;
  close: () => void;
}

const WaitlistDialogContext = createContext<WaitlistDialogContextValue | null>(null);

export function useWaitlistDialog(): WaitlistDialogContextValue {
  const ctx = useContext(WaitlistDialogContext);
  if (!ctx) {
    throw new Error("useWaitlistDialog must be used inside <WaitlistDialogProvider>");
  }
  return ctx;
}

const BACKDROP = "fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4";
const PANEL = "relative z-10 flex flex-col items-stretch gap-[5px] w-[320px] mx-6";
const FOOTER = "bg-[#f1f1f1] rounded-full p-[5px] flex items-center gap-4 w-full";

const SPRING = { type: "spring", stiffness: 400, damping: 35 } as const;

export function WaitlistDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ kind: "closed" });
  const router = useRouter();

  const openJoin = useCallback(() => setState({ kind: "join" }), []);
  const openStatus = useCallback(
    (position: number) => setState({ kind: "status", position }),
    [],
  );
  const close = useCallback(() => setState({ kind: "closed" }), []);

  const value = useMemo(
    () => ({ openJoin, openStatus, close }),
    [openJoin, openStatus, close],
  );

  // Escape-to-close. Pointer-down outside the panel also closes via the
  // backdrop click handler below.
  useEffect(() => {
    if (state.kind === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.kind, close]);

  return (
    <WaitlistDialogContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state.kind !== "closed" && (
          <motion.div
            key="waitlist-backdrop"
            className={BACKDROP}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              layout
              className={PANEL}
              initial={{ opacity: 0, y: 300 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 400 }}
              transition={SPRING}
            >
              {state.kind === "join" ? (
                <JoinDialog
                  onCancel={close}
                  onCreate={() => {
                    close();
                    router.push("/create-account?intent=waitlist");
                  }}
                />
              ) : (
                <StatusDialog position={state.position} onOkay={close} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </WaitlistDialogContext.Provider>
  );
}

function JoinDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: () => void;
}) {
  const [nextPosition, setNextPosition] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/waitlist/next", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as {
          ok: boolean;
          data?: { nextPosition: number };
        };
        if (!cancelled && body.ok && body.data) {
          setNextPosition(body.data.nextPosition);
        }
      })
      .catch(() => {
        // Soft-fail: dialog still renders without the position hint.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-full flex flex-col items-center justify-between pt-8 pb-[15px] text-center gap-3">
      <div className="flex flex-col gap-5 items-center justify-center px-6 w-full">
        <SvgText
          text={"Join the queue by creating an\nAxceal Account"}
          weight="600"
          height={16}
          lineHeight={1.5}
          align="center"
          className="text-[#1e1e1e]"
        />
        <SvgText
          text={
            nextPosition !== null
              ? `Queue up at ${formatPosition(nextPosition)}`
              : "Queue up next"
          }
          weight="500"
          height={16}
          lineHeight={1.5}
          align="center"
          className="text-[#aaaaaa]"
        />
      </div>

      <div className="flex relative items-center w-full px-[5px]">
        <button
          type="button"
          onClick={onCancel}
          className="w-[40%] bg-transparent rounded-full py-4.5 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <SvgText text="Cancel" weight="600" height={16} className="text-[#ff0000]" />
        </button>
        <div className="absolute left-[40%] -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="block w-[10px] aspect-square rounded-full bg-[#aaaaaa]" aria-hidden />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="w-[60%] py-4.5 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <SvgText text="Create Account" weight="600" height={16} maxWidth={200} className="text-[#0000f4]" />
        </button>
      </div>
    </Squircle>
  );
}

function StatusDialog({ position, onOkay }: { position: number; onOkay: () => void }) {
  return (
    <>
      <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-full h-[160px] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <SvgText
          text={"Your Axceal account is already in the\nqueue"}
          weight="600"
          height={16}
          lineHeight={1.5}
          align="center"
          className="text-[#1e1e1e]"
        />
        <SvgText
          text={"Keep an eye on\nyour inbox for updates"}
          weight="600"
          height={14}
          lineHeight={1.5}
          align="center"
          className="text-[#aaaaaa]"
        />
      </Squircle>
      <div className={FOOTER}>
        <div className="flex-1 pl-2 flex items-center justify-center min-w-0">
          <SvgText
            text={`In queue at ${formatPosition(position)}`}
            weight="600"
            height={16}
            className="text-[#aaaaaa]"
          />
        </div>
        <button
          type="button"
          onClick={onOkay}
          className="w-[120px] shrink-0 bg-transparent text-white rounded-full py-4.5 cursor-pointer focus:outline-none focus-visible:outline-none flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <SvgText text="Okay" weight="600" height={16} className="text-[#0000f4]" />
        </button>
      </div>
    </>
  );
}
