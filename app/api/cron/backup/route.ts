import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  users,
  userProfiles,
  addresses,
  orders,
  waitlist,
  paymentEvents,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Vercel Cron Jobs call this route on a schedule defined in vercel.json.
// Protected by CRON_SECRET — Vercel injects the `Authorization: Bearer <secret>`
// header automatically for cron invocations.

export const maxDuration = 60; // seconds — allow enough time for large tables
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── Auth gate ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.BACKUP_DATABASE_URL) {
    return NextResponse.json(
      { error: "BACKUP_DATABASE_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const backupSql = neon(env.BACKUP_DATABASE_URL);
    const backupDb = drizzle(backupSql);

    // ── Read all tables from live DB ─────────────────────────────────
    const [
      allUsers,
      allProfiles,
      allAddresses,
      allOrders,
      allWaitlist,
      allPaymentEvents,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(userProfiles),
      db.select().from(addresses),
      db.select().from(orders),
      db.select().from(waitlist),
      db.select().from(paymentEvents),
    ]);

    // ── Wipe backup tables (reverse FK order) ────────────────────────
    await backupSql`TRUNCATE payment_events, waitlist, orders, addresses, user_profiles, users CASCADE`;

    // ── Insert in FK order ───────────────────────────────────────────
    const CHUNK = 50;
    async function insertChunked(table: any, rows: any[]) {
      if (rows.length === 0) return;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await backupDb.insert(table).values(rows.slice(i, i + CHUNK));
      }
    }

    await insertChunked(users, allUsers);
    await insertChunked(userProfiles, allProfiles);
    await insertChunked(addresses, allAddresses);
    await insertChunked(orders, allOrders);
    await insertChunked(waitlist, allWaitlist);
    await insertChunked(paymentEvents, allPaymentEvents);

    // ── Sync waitlist sequence ───────────────────────────────────────
    if (allWaitlist.length > 0) {
      const maxPos = Math.max(...allWaitlist.map((w) => w.position));
      await backupSql`SELECT setval('waitlist_position_seq', ${maxPos + 1}, false)`;
    }

    const summary = {
      ok: true,
      backedUp: {
        users: allUsers.length,
        userProfiles: allProfiles.length,
        addresses: allAddresses.length,
        orders: allOrders.length,
        waitlist: allWaitlist.length,
        paymentEvents: allPaymentEvents.length,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("[cron/backup] Completed", summary);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/backup] Failed:", err);
    return NextResponse.json(
      { error: "Backup failed" },
      { status: 500 },
    );
  }
}
