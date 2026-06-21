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
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/http/client";
import { isWaitlist } from "@/lib/featureFlags";

// W9 robustness — single source of truth for waitlist queue state on the
// client. Mounted once at the layout root so every CTA / chip / hook reads
// the same state and a single GET /api/waitlist/status backs them all.
//
// - Fetch fires on session-id change (login / logout) in waitlist mode.
// - Live mode short-circuits to `idle` with no network call.
// - `refresh()` lets callers manually re-fetch (e.g. after a popup join).
// - In-flight requests are cancelled via AbortController when the user
//   re-auths mid-flight, preventing stale "out" responses from overwriting
//   a newer "in" response.

export type WaitlistStatusState =
  | { kind: "idle" }       // live mode / no session
  | { kind: "loading" }
  | { kind: "in"; position: number }
  | { kind: "error" };

interface WaitlistStatusContextValue {
  state: WaitlistStatusState;
  refresh: () => void;
}

const WaitlistStatusContext = createContext<WaitlistStatusContextValue | null>(null);

export function useWaitlistStatus(): WaitlistStatusState {
  const ctx = useContext(WaitlistStatusContext);
  // Without a provider we behave like the legacy hook — safer than throwing.
  return ctx?.state ?? { kind: "idle" };
}

export function useWaitlistStatusRefresh(): () => void {
  const ctx = useContext(WaitlistStatusContext);
  return ctx?.refresh ?? (() => {});
}

export function WaitlistStatusProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<WaitlistStatusState>({ kind: "idle" });
  // Track an opaque "fetch token" so a stale response can detect it was
  // superseded. AbortController also cancels the network call.
  const inflight = useRef<AbortController | null>(null);
  const userId = session?.userId;

  const fetchStatus = useCallback(() => {
    if (!isWaitlist()) {
      setState({ kind: "idle" });
      return;
    }
    if (status === "loading") {
      setState({ kind: "loading" });
      return;
    }
    if (status !== "authenticated" || !userId) {
      setState({ kind: "idle" });
      return;
    }

    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setState({ kind: "loading" });

    apiFetch("/api/waitlist/status", { method: "GET", signal: ctrl.signal })
      .then(async (res) => {
        if (ctrl.signal.aborted) return;
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const body = (await res.json()) as {
          ok: boolean;
          data?: { inQueue: boolean; position: number | null };
        };
        if (ctrl.signal.aborted) return;
        if (body.ok && body.data?.inQueue && body.data.position !== null) {
          setState({ kind: "in", position: body.data.position });
        } else {
          setState({ kind: "error" });
        }
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        setState({ kind: "error" });
      });
  }, [status, userId]);

  // Fire on auth-state changes; cleanup aborts any pending request.
  useEffect(() => {
    fetchStatus();
    return () => {
      inflight.current?.abort();
    };
  }, [fetchStatus]);

  const value = useMemo(
    () => ({ state, refresh: fetchStatus }),
    [state, fetchStatus],
  );

  return (
    <WaitlistStatusContext.Provider value={value}>
      {children}
    </WaitlistStatusContext.Provider>
  );
}
