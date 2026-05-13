ALTER TABLE "orders" DROP CONSTRAINT "orders_idempotency_key_unique";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_idempotency_unique" UNIQUE("user_id","idempotency_key");