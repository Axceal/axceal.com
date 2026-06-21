ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_converted_order_id_orders_id_fk";
--> statement-breakpoint
DROP INDEX "waitlist_position_idx";--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_position_unique" UNIQUE("position");