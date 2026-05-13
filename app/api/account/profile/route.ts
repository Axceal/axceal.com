import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import { ProfileSchema, UpdateProfileRequest } from "@/lib/contracts/profile";
import { getProfile, updateProfile } from "@/lib/services/profile";
import { rateLimit } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

export const GET = withHandler({
  output: ProfileSchema,
  handler: async () => {
    const session = await requireSession();
    await rateLimit(`profile:get:${session.userId}`, { limit: 120, windowSec: 60 });
    return getProfile(session.userId);
  },
});

export const PUT = withHandler({
  input: UpdateProfileRequest,
  output: ProfileSchema,
  handler: async ({ input }) => {
    const session = await requireSession();
    await rateLimit(`profile:update:${session.userId}`, { limit: 30, windowSec: 3600 });
    return updateProfile(session.userId, input);
  },
});
