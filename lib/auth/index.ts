import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./config";
import { consumePendingMfaToken, peekPendingMfaToken } from "./pending-mfa";
import { verifyLoginOtp } from "./otp";
import { UUID, Otp4 } from "@/lib/contracts/common";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { emailProvider } from "@/lib/email/provider";

const MfaCredentialsSchema = z.object({ pendingMfaToken: UUID, otp: Otp4 });
const SignupCredentialsSchema = z.object({ signupSessionToken: UUID });
const OtpLoginCredentialsSchema = z.object({ loginToken: UUID });

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
          // Peek (no consume) so a wrong OTP doesn't burn the pendingMfaToken
          // — UX: user can retry the code without re-entering the password.
          // verifyLoginOtp itself is bounded by MAX_ATTEMPTS on the OTP key
          // and rate limits on login-otp (re)sends, so retry is safe.
          const peeked = await peekPendingMfaToken(pendingMfaToken, "mfa-second-factor");
          if (!peeked) return null;
          await verifyLoginOtp(peeked.email, otp);
          // Only on OTP success do we consume the token. This also re-checks
          // the IP/UA binding, so a token leaked to a different client still
          // can't complete login even if the attacker knows the OTP.
          const { userId, email } = await consumePendingMfaToken(
            pendingMfaToken,
            ip,
            ua,
            "mfa-second-factor",
          );
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
          const { userId, email } = await consumePendingMfaToken(
            signupSessionToken,
            ip,
            ua,
            "signup-auto",
          );
          logger.info({ userId }, "signup auto-login completed");
          return { id: userId, email };
        } catch (err) {
          logger.warn({ err }, "signup auto-login failed");
          return null;
        }
      },
    }),
    // Passwordless OTP login. The /api/auth/otp-login REST endpoint already
    // consumed the email-verify OTP token and issued a pendingMfaToken bound
    // to this IP+UA. This provider just exchanges that token for a session —
    // all auth checks (rate limits, single-use, scope) ran at the REST hop.
    Credentials({
      id: "credentials-otp-login",
      credentials: { loginToken: {} },
      authorize: async (raw, request) => {
        const parsed = OtpLoginCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { loginToken } = parsed.data;

        const ip = request ? getClientIp(request as unknown as Request) : "unknown";
        const ua = request instanceof Request
          ? (request.headers.get("user-agent") ?? "")
          : "";

        try {
          const { userId, email } = await consumePendingMfaToken(
            loginToken,
            ip,
            ua,
            "otp-login",
          );
          logger.info({ userId }, "otp-login completed");

          // F13.6 — notify the inbox owner that a passwordless sign-in just
          // happened. Capped to one alert per 24h per user via Redis SET NX so
          // attackers cannot weaponize this into an email spam vector. Fire
          // and forget: if Resend or Redis is down, the login itself must
          // still succeed.
          (async () => {
            try {
              const dedupKey = `login-alert-sent:${userId}`;
              const set = await redis.set(dedupKey, 1, { nx: true, ex: 86400 });
              if (set !== "OK") return;
              await emailProvider.sendLoginAlert(email, {
                ip,
                userAgent: ua,
                occurredAt: new Date(),
              });
            } catch (alertErr) {
              logger.warn({ alertErr, userId }, "otp-login alert dispatch failed");
            }
          })();

          return { id: userId, email };
        } catch (err) {
          logger.warn({ err }, "otp-login token exchange failed");
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
      // On every session access, check if password changed after this token
      // was issued. S14 — explicit fail-closed: if Redis is unreachable we
      // invalidate the session rather than allow a potentially-revoked token
      // to remain valid. Cost: total auth outage during Redis incidents;
      // alternative (fail-open) would let a compromised pre-rotation token
      // keep working until Redis recovered. Prefer correctness over uptime.
      if (token.uid && token.iat) {
        try {
          const changedAt = await redis.get<number>(`pw:changed:${token.uid}`);
          if (changedAt && token.iat * 1000 < changedAt) {
            return { ...token, uid: undefined };
          }
        } catch (err) {
          logger.error(
            { err, uid: token.uid },
            "pw:changed lookup failed — failing closed (session invalidated)",
          );
          return { ...token, uid: undefined };
        }
      }
      return token;
    },
  },
});
