-- W2 — position sequence created before the table so the column DEFAULT
-- can reference it. Start at 1001 so real users never collide with the
-- #1–#1000 conceptual range reserved for dummy/test accounts.
CREATE SEQUENCE IF NOT EXISTS "waitlist_position_seq" START WITH 1001;--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer DEFAULT nextval('waitlist_position_seq') NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_at" timestamp with time zone,
	"converted_order_id" uuid,
	CONSTRAINT "waitlist_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_position_idx" ON "waitlist" USING btree ("position");--> statement-breakpoint
-- Bind sequence lifecycle to the column so DROP TABLE waitlist also drops
-- the sequence. Done after CREATE TABLE because OWNED BY references the
-- materialised column.
ALTER SEQUENCE "waitlist_position_seq" OWNED BY "waitlist"."position";