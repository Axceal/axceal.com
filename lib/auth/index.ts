import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./config";
import { verifyCredentials } from "./credentials";
import { Email, Password } from "@/lib/contracts/common";
import { rateLimit } from "@/lib/http/rate-limit";
import { AppError } from "@/lib/http/errors";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/logger";

const CredentialsSchema = z.object({ email: Email, password: Password });

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw, request) => {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = request ? getClientIp(request as unknown as Request) : "unknown";
        try {
          await rateLimit(`login:email:${email}`, { limit: 10, windowSec: 60 * 60 });
          await rateLimit(`login:ip:${ip}`, { limit: 30, windowSec: 60 * 60 });
        } catch (err) {
          if (err instanceof AppError && err.code === "RATE_LIMITED") {
            logger.warn({ email, ip }, "login rate limited");
            return null;
          }
          throw err;
        }

        return verifyCredentials(email, password);
      },
    }),
  ],
});
