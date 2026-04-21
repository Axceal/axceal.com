import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

const PROTECTED_PAGE = [/^\/account(\/|$)/, /^\/order(\/|$)/];
const PROTECTED_API = [
  /^\/api\/account(\/|$)/,
  /^\/api\/orders(\/|$)/,
  /^\/api\/addresses(\/|$)/,
  /^\/api\/payments\/initiate(\/|$)/,
  /^\/api\/payments\/verify(\/|$)/,
];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isAuthed = !!req.auth?.userId;

  const isPage = PROTECTED_PAGE.some((r) => r.test(path));
  const isApi = PROTECTED_API.some((r) => r.test(path));
  if (!isPage && !isApi) return NextResponse.next();
  if (isAuthed) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "Login required" },
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", path + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/account/:path*",
    "/order/:path*",
    "/api/account/:path*",
    "/api/orders/:path*",
    "/api/addresses/:path*",
    "/api/payments/initiate",
    "/api/payments/verify",
  ],
};
