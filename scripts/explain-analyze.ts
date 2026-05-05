/**
 * I.2 — EXPLAIN ANALYZE for key service queries
 * Usage: npx tsx scripts/explain-analyze.ts
 *
 * Requires DATABASE_URL in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

const queries: Array<{ label: string; query: string; params?: unknown[] }> = [
  {
    label: "listOrders(userId) — index: orders_user_id_created_at_idx",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT * FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    params: [PLACEHOLDER_UUID],
  },
  {
    label: "listAddresses(userId) — index: addresses_user_id_active_idx (partial)",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT * FROM addresses
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100`,
    params: [PLACEHOLDER_UUID],
  },
  {
    label: "getOrder(userId, orderId) — PK lookup + userId filter",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT o.id, o.status, o.quantity, o.total_paise, o.created_at,
             o.razorpay_payment_id, o.billing_address_snapshot,
             o.shipping_address_snapshot, u.email
      FROM orders o
      INNER JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 AND o.user_id = $2`,
    params: [PLACEHOLDER_UUID, PLACEHOLDER_UUID],
  },
  {
    label: "getProfile(userId) — PK lookup on user_profiles",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT * FROM user_profiles
      WHERE user_id = $1`,
    params: [PLACEHOLDER_UUID],
  },
  {
    label: "findByIdempotencyKey(userId, key) — unique index on idempotency_key",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT * FROM orders
      WHERE user_id = $1 AND idempotency_key = $2`,
    params: [PLACEHOLDER_UUID, "some-idempotency-key"],
  },
];

function checkPlan(plan: string): void {
  const hasSeqScan = /Seq Scan on (\w+)/i.test(plan);
  const hasIndexScan = /Index (Only )?Scan/i.test(plan);
  const hasBitmapScan = /Bitmap (Index|Heap) Scan/i.test(plan);

  const usesIndex = hasIndexScan || hasBitmapScan;

  if (hasSeqScan && !usesIndex) {
    console.warn(`  ⚠  SEQ SCAN detected — no index used`);
  } else if (usesIndex) {
    const match = plan.match(/Index (?:Only )?Scan using (\S+)/i);
    const idxName = match ? match[1] : "(unknown index)";
    console.log(`  ✓  Index scan: ${idxName}`);
  } else {
    // PK lookup or other efficient access
    console.log(`  ✓  Efficient access (no seq scan)`);
  }

  // Extract actual time if present
  const timeMatch = plan.match(/Execution Time:\s*([\d.]+)\s*ms/i);
  if (timeMatch) {
    const ms = parseFloat(timeMatch[1]);
    console.log(`  ⏱  Execution time: ${ms.toFixed(3)} ms`);
  }
}

async function main() {
  console.log("=== I.2 EXPLAIN ANALYZE — Service Layer Queries ===\n");

  for (const { label, query, params = [] } of queries) {
    console.log(`── ${label}`);
    try {
      const rows = await sql.query(query, params);
      const planText = rows.map((r: Record<string, unknown>) => Object.values(r)[0]).join("\n");
      console.log(planText);
      checkPlan(planText);
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
    }
    console.log();
  }

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
