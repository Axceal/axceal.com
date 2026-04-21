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

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
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
