import { z } from "zod";
import { Email } from "@/lib/contracts/common";
import { ProfileSchema } from "@/lib/contracts/profile";

export const AccountOverviewSchema = z.object({
  email: Email,
  createdAt: z.string().datetime(),
  profile: ProfileSchema,
});

export type AccountOverview = z.infer<typeof AccountOverviewSchema>;
