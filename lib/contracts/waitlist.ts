import { z } from "zod";

// W2 — waitlist API contracts. Join takes no body; the user is read from the
// session. Status returns the caller's queue state. Next returns the live
// peek of the next sequence value (public, used by the join popup).

export const WaitlistStatusResponse = z.object({
  inQueue: z.boolean(),
  position: z.number().int().nullable(),
  joinedAt: z.string().nullable(),
});
export type WaitlistStatusResponse = z.infer<typeof WaitlistStatusResponse>;

export const WaitlistJoinResponse = z.object({
  position: z.number().int(),
  joinedAt: z.string(),
});
export type WaitlistJoinResponse = z.infer<typeof WaitlistJoinResponse>;

export const WaitlistNextResponse = z.object({
  nextPosition: z.number().int(),
});
export type WaitlistNextResponse = z.infer<typeof WaitlistNextResponse>;
