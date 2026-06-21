import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { waitlist, users } from "@/lib/db/schema";
import { AppError, ErrorCode } from "@/lib/http/errors";
import { isLive } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";
import { emailProvider } from "@/lib/email/provider";
import type {
  WaitlistJoinResponse,
  WaitlistStatusResponse,
} from "@/lib/contracts/waitlist";

function ensureWaitlistMode(action: string): void {
  if (isLive()) {
    throw new AppError(
      ErrorCode.GONE,
      `Waitlist ${action} disabled in live sales mode`,
      410,
    );
  }
}

// W2 — idempotent join. ON CONFLICT DO NOTHING leaves an existing row
// untouched (so position never changes for repeat callers). The follow-up
// SELECT covers the conflict path; both paths return the row.
//
// Concurrent inserts for distinct users each consume a fresh nextval(), so
// positions are unique under contention without taking a table lock.
//
// W9 backend-review — pre-check SELECT before INSERT. Postgres evaluates
// the `position DEFAULT nextval()` expression BEFORE detecting the ON
// CONFLICT — meaning every repeat-join still burns a sequence value (the
// number just doesn't get stored). Buggy clients hammering /api/waitlist/
// join would widen gaps in the queue at the rate of every duplicate POST.
// Pre-checking turns repeat calls into a single covered-index lookup with
// no sequence advance.
export async function joinWaitlist(userId: string): Promise<WaitlistJoinResponse> {
  ensureWaitlistMode("join");

  const cached = await db.query.waitlist.findFirst({
    where: eq(waitlist.userId, userId),
    columns: { position: true, joinedAt: true },
  });
  if (cached) {
    return {
      position: cached.position,
      joinedAt: cached.joinedAt.toISOString(),
    };
  }

  const inserted = await db
    .insert(waitlist)
    .values({ userId })
    .onConflictDoNothing({ target: waitlist.userId })
    .returning({ position: waitlist.position, joinedAt: waitlist.joinedAt });

  if (inserted.length > 0) {
    const row = inserted[0];
    // W8 — best-effort welcome email on the first successful insert only.
    // Repeat-join idempotent path above (cached) does not resend. Errors
    // are swallowed because email delivery should never fail a join.
    void sendWaitlistJoinedEmail(userId, row.position);
    return { position: row.position, joinedAt: row.joinedAt.toISOString() };
  }

  // ON CONFLICT path — a concurrent INSERT landed between our SELECT and
  // our INSERT. Re-read to pick up the winning row's position.
  const existing = await db.query.waitlist.findFirst({
    where: eq(waitlist.userId, userId),
    columns: { position: true, joinedAt: true },
  });
  if (!existing) {
    // No row before, no row after — the cascade delete must have fired in
    // the same window. Surface as conflict rather than crashing the caller.
    logger.warn({ userId }, "waitlist join race: row vanished between insert and select");
    throw new AppError(ErrorCode.CONFLICT, "Waitlist join failed", 409);
  }
  return {
    position: existing.position,
    joinedAt: existing.joinedAt.toISOString(),
  };
}

export async function getWaitlistStatus(userId: string): Promise<WaitlistStatusResponse> {
  ensureWaitlistMode("status");
  const row = await db.query.waitlist.findFirst({
    where: eq(waitlist.userId, userId),
    columns: { position: true, joinedAt: true },
  });
  if (!row) return { inQueue: false, position: null, joinedAt: null };
  return {
    inQueue: true,
    position: row.position,
    joinedAt: row.joinedAt.toISOString(),
  };
}

// W4 — auto-join hook for existing users at flag-flip time. Called by
// `/api/waitlist/status` so every authed home visit in waitlist mode
// ensures the user holds a position. Idempotent.
//
// W9 backend-review — since `joinWaitlist` now pre-checks via SELECT, the
// repeat-caller path is just one indexed lookup; no longer worth doing the
// SELECT separately at this layer.
export async function ensureWaitlistMembership(
  userId: string,
): Promise<WaitlistStatusResponse> {
  ensureWaitlistMode("ensure");
  const joined = await joinWaitlist(userId);
  return {
    inQueue: true,
    position: joined.position,
    joinedAt: joined.joinedAt,
  };
}

// W8 — resolve email and dispatch the welcome mail. Fire-and-forget caller
// invokes via `void`; we still log failures so silent SMTP drops are visible
// in Axiom. A missing user row (cascade race) is treated as a no-op.
async function sendWaitlistJoinedEmail(userId: string, position: number): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    });
    if (!user) return;
    await emailProvider.sendWaitlistJoined(user.email, position);
  } catch (err) {
    logger.error({ err, userId, position }, "waitlist welcome email failed");
  }
}

// W2 — peek the next sequence value without consuming it.
// `last_value` on a sequence with no prior call returns the start value, and
// `is_called` is false until the first nextval(). Postgres semantics:
//   is_called=false → next nextval returns last_value (= start)
//   is_called=true  → next nextval returns last_value + 1
// Read-only — no write transaction, safe to cache at the edge.
export async function getNextWaitlistPosition(): Promise<number> {
  const rows = await db.execute<{ last_value: number; is_called: boolean }>(
    sql`SELECT last_value, is_called FROM waitlist_position_seq`,
  );
  // drizzle-orm/neon-http returns { rows: [...] } shape via execute.
  // Defensive narrow: support both array-style and { rows } envelopes.
  const row = (Array.isArray(rows) ? rows[0] : (rows as any).rows?.[0]) as
    | { last_value: number | string; is_called: boolean }
    | undefined;
  if (!row) {
    throw new AppError(
      ErrorCode.INTERNAL,
      "waitlist_position_seq missing",
      500,
    );
  }
  const last = typeof row.last_value === "string" ? Number(row.last_value) : row.last_value;
  return row.is_called ? last + 1 : last;
}
