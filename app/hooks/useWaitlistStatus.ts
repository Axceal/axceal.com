"use client";

// W9 robustness — this hook now reads from the shared WaitlistStatusProvider
// (mounted in app/components/layout/Providers.tsx). Every consumer reads the
// same in-memory state, so N components on a page produce one /status fetch,
// not N. Refetches are explicit via the provider's `refresh()` method.

export {
  useWaitlistStatus,
  type WaitlistStatusState,
} from "../components/waitlist/WaitlistStatusProvider";
