/**
 * Inserts one failed-status order stub for a given user.
 * Usage: npx tsx scripts/seed-failed-order.ts <userId>
 *
 * Requires DATABASE_URL in .env.local (loaded via dotenv).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: npx tsx scripts/seed-failed-order.ts <userId>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

const STUB_ADDRESS = {
  firstName: "Test",
  lastName: "User",
  line1: "123 Stub Street",
  country: "India",
  state: "Maharashtra",
  zip: "400001",
  phoneCountryCode: "91",
  phone: "9999999999",
  phoneSign: "+",
  isDefaultBilling: false,
  isDefaultShipping: false,
};

async function main() {
  const [billingRow] = await db
    .insert(schema.addresses)
    .values({ userId, ...STUB_ADDRESS })
    .returning();

  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      sku: "AERO_X1",
      quantity: 1,
      unitPricePaise: 999_900,
      totalPaise: 999_900,
      status: "failed",
      billingAddressId: billingRow.id,
      shippingAddressId: null,
      billingAddressSnapshot: STUB_ADDRESS,
      shippingAddressSnapshot: null,
      idempotencyKey: randomUUID(),
    })
    .returning();

  console.log("Inserted failed order:", order.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
