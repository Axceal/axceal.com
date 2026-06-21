import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestUser } from "@/tests/helpers/db";
import {
  joinWaitlist,
  getWaitlistStatus,
  getNextWaitlistPosition,
} from "@/lib/services/waitlist";
import { db } from "@/lib/db/client";
import { waitlist } from "@/lib/db/schema";

describe("services/waitlist", () => {
  const cleanups: (() => Promise<void>)[] = [];

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) await fn();
  });

  it("joinWaitlist returns a position >= 1001 on first join", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    const res = await joinWaitlist(user.id);
    expect(res.position).toBeGreaterThanOrEqual(1001);
    expect(typeof res.joinedAt).toBe("string");
  });

  it("joinWaitlist is idempotent — same user, same position on repeat", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    const first = await joinWaitlist(user.id);
    const second = await joinWaitlist(user.id);
    expect(second.position).toBe(first.position);
    expect(second.joinedAt).toBe(first.joinedAt);
  });

  it("getWaitlistStatus reports inQueue=false before join, true after", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    const before = await getWaitlistStatus(user.id);
    expect(before.inQueue).toBe(false);
    expect(before.position).toBeNull();

    await joinWaitlist(user.id);

    const after = await getWaitlistStatus(user.id);
    expect(after.inQueue).toBe(true);
    expect(after.position).toBeGreaterThanOrEqual(1001);
  });

  it("positions are monotonic across distinct users — deleting a row leaves a gap", async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    const u3 = await createTestUser();
    cleanups.push(() => u1.cleanup(), () => u2.cleanup(), () => u3.cleanup());

    const p1 = (await joinWaitlist(u1.id)).position;
    const p2 = (await joinWaitlist(u2.id)).position;
    expect(p2).toBeGreaterThan(p1);

    // Delete u2's waitlist row; sequence does not roll back.
    await db.delete(waitlist).where(eq(waitlist.userId, u2.id));

    const p3 = (await joinWaitlist(u3.id)).position;
    expect(p3).toBeGreaterThan(p2);
  });

  it("concurrent joins assign distinct positions", async () => {
    const users = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser(),
      createTestUser(),
    ]);
    cleanups.push(...users.map((u) => () => u.cleanup()));

    const results = await Promise.all(users.map((u) => joinWaitlist(u.id)));
    const positions = results.map((r) => r.position);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("20 concurrent joins yield 20 distinct, contiguous-or-monotonic positions", async () => {
    // W9 robustness — stress the sequence under parallel load. Even with
    // 20 in-flight inserts, every position must be unique and the set must
    // span [min, max] without dupes. Gaps are allowed (other test users in
    // the same DB may have consumed nextval between calls), but duplicates
    // would break the contract.
    const users = await Promise.all(
      Array.from({ length: 20 }, () => createTestUser()),
    );
    cleanups.push(...users.map((u) => () => u.cleanup()));

    const results = await Promise.all(users.map((u) => joinWaitlist(u.id)));
    const positions = results.map((r) => r.position);
    expect(new Set(positions).size).toBe(20);
    for (const p of positions) expect(p).toBeGreaterThanOrEqual(1001);
  });

  it("repeat joinWaitlist for same user does NOT advance the sequence", async () => {
    // W9 backend-review — Postgres evaluates DEFAULT nextval() before
    // detecting ON CONFLICT, so a naive insert-then-conflict path would
    // burn one sequence value per repeat call. The service now pre-checks
    // via SELECT, so the second + third joins must leave the next sequence
    // value untouched.
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    await joinWaitlist(user.id);
    const nextAfterFirst = await getNextWaitlistPosition();
    await joinWaitlist(user.id);
    await joinWaitlist(user.id);
    const nextAfterRepeats = await getNextWaitlistPosition();

    expect(nextAfterRepeats).toBe(nextAfterFirst);
  });

  it("getNextWaitlistPosition returns a value strictly greater than the last assigned position", async () => {
    const user = await createTestUser();
    cleanups.push(() => user.cleanup());

    const joined = await joinWaitlist(user.id);
    const next = await getNextWaitlistPosition();
    expect(next).toBeGreaterThan(joined.position);
  });
});
