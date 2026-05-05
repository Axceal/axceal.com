import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  boolean,
  jsonb,
  index,
  check,
  customType,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  phone: text("phone").unique(),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    birthday: date("birthday"),
    gender: text("gender"),
    phoneCountryCode: text("phone_country_code"),
    phone: text("phone"),
    phoneSign: text("phone_sign").default("+"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      "user_profiles_gender_check",
      sql`${t.gender} is null or ${t.gender} in ('female','male','private')`,
    ),
    check(
      "user_profiles_phone_sign_check",
      sql`${t.phoneSign} is null or ${t.phoneSign} in ('+','-')`,
    ),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    line1: text("line1").notNull(),
    country: text("country").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    phoneCountryCode: text("phone_country_code").notNull(),
    phone: text("phone").notNull(),
    phoneSign: text("phone_sign").notNull().default("+"),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("addresses_line1_len_check", sql`char_length(${t.line1}) <= 50`),
    check("addresses_phone_sign_check", sql`${t.phoneSign} in ('+','-')`),
    index("addresses_user_id_active_idx")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    status: text("status").notNull().default("pending"),
    billingAddressId: uuid("billing_address_id").references(() => addresses.id),
    shippingAddressId: uuid("shipping_address_id").references(() => addresses.id),
    billingAddressSnapshot: jsonb("billing_address_snapshot").notNull(),
    shippingAddressSnapshot: jsonb("shipping_address_snapshot"),
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("orders_quantity_check", sql`${t.quantity} between 1 and 5`),
    check(
      "orders_status_check",
      sql`${t.status} in ('pending','paid','failed','cancelled')`,
    ),
    index("orders_user_id_created_at_idx").on(t.userId, sql`${t.createdAt} desc`),
  ],
);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  razorpayEventId: text("razorpay_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type NewPaymentEvent = typeof paymentEvents.$inferInsert;
