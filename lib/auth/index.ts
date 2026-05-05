import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./config";
import { consumePendingMfaToken } from "./pending-mfa";
import { verifyLoginOtp } from "./otp";
import { UUID, Otp4 } from "@/lib/contracts/common";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const MfaCredentialsSchema = z.object({ pendingMfaToken: UUID, otp: Otp4 });
const SignupCredentialsSchema = z.object({ signupSessionToken: UUID });

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials-with-otp",
      credentials: { pendingMfaToken: {}, otp: {} },
      authorize: async (raw, request) => {
        const parsed = MfaCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { pendingMfaToken, otp } = parsed.data;

        const ip = request ? getClientIp(request as unknown as Request) : "unknown";
        const ua = request instanceof Request
          ? (request.headers.get("user-agent") ?? "")
          : "";

        try {
          const { userId, email } = await consumePendingMfaToken(pendingMfaToken, ip, ua);
          await verifyLoginOtp(email, otp);
          logger.info({ userId }, "login 2FA completed");
          return { id: userId, email };
        } catch (err) {
          logger.warn({ err }, "login 2FA failed");
          return null;
        }
      },
    }),
    Credentials({
      id: "credentials-signup",
      credentials: { signupSessionToken: {} },
      authorize: async (raw, request) => {
        const parsed = SignupCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { signupSessionToken } = parsed.data;

        const ip = request ? getClientIp(request as unknown as Request) : "unknown";
        const ua = request instanceof Request
          ? (request.headers.get("user-agent") ?? "")
          : "";

        try {
          const { userId, email } = await consumePendingMfaToken(signupSessionToken, ip, ua);
          logger.info({ userId }, "signup auto-login completed");
          return { id: userId, email };
        } catch (err) {
          logger.warn({ err }, "signup auto-login failed");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.uid = user.id;
        return token;
      }
      // On every session access, check if password changed after this token was issued.
      if (token.uid && token.iat) {
        const changedAt = await redis.get<number>(`pw:changed:${token.uid}`);
        if (changedAt && token.iat * 1000 < changedAt) {
          return { ...token, uid: undefined };
        }
      }
      return token;
    },
  },
});
