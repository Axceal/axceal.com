import { withHandler } from "@/lib/http/handler";
import { requireSession } from "@/lib/auth/session";
import { ProfileSchema, UpdateProfileRequest } from "@/lib/contracts/profile";
import { getProfile, updateProfile } from "@/lib/services/profile";

export const runtime = "nodejs";

export const GET = withHandler({
  output: ProfileSchema,
  handler: async () => {
    const session = await requireSession();
    return getProfile(session.userId);
  },
});

export const PUT = withHandler({
  input: UpdateProfileRequest,
  output: ProfileSchema,
  handler: async ({ input }) => {
    const session = await requireSession();
    return updateProfile(session.userId, input);
  },
});
