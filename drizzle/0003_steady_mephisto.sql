ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_phone_sign_check";--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "phone_country_code";--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "phone_sign";