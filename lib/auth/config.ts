import type { NextAuthConfig } from "next-auth";
import { env } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    userId: string;
  }
  interface User {
    id?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

const isProd = env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  secret: env.NEXTAUTH_SECRET,
  // F14.7 — Vercel sets / normalises `X-Forwarded-Host`, so trustHost is
  // safe there. Outside Vercel in production, a malicious upstream proxy or
  // DNS rebinding could spoof Host and reroute callbacks; require the deploy
  // to opt-in via NEXTAUTH_URL. In development we always trust host so
  // localhost / LAN IPs work without extra env setup.
  trustHost: !isProd || isVercel,
  // F14.10 — pin session-cookie attributes. `__Host-` prefix is the strictest
  // browser-enforced safety lock (no Domain attribute, Secure, Path=/), and
  // is supported by all major browsers. Outside production we use a plain
  // name so http://localhost works.
  cookies: isProd
    ? {
        sessionToken: {
          name: "__Host-next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax" as const,
            secure: true,
            path: "/",
          },
        },
      }
    : undefined,
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.userId = token.uid;
      return session;
    },
  },
} satisfies NextAuthConfig;
