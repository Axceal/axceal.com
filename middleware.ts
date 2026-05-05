import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  generateCsrfToken,
  timingSafeEqual,
} from "@/lib/http/csrf";

const { auth } = NextAuth(authConfig);

const PROTECTED_PAGE = [/^\/account(\/|$)/, /^\/order(\/|$)/];
const PROTECTED_API = [
  /^\/api\/account(\/|$)/,
  /^\/api\/orders(\/|$)/,
  /^\/api\/addresses(\/|$)/,
  /^\/api\/payments\/initiate(\/|$)/,
  /^\/api\/payments\/verify(\/|$)/,
];

const CSRF_EXEMPT = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/payments\/webhook(\/|$)/,
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function ensureCsrfCookie(req: NextRequest, res: NextResponse): NextResponse {
  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

function csrfReject(): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "FORBIDDEN", message: "Invalid CSRF token" } },
    { status: 403 },
  );
}

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  const isApi = path.startsWith("/api/");
  const isMutating = MUTATING_METHODS.has(method);
  const isCsrfExempt = CSRF_EXEMPT.some((r) => r.test(path));

  if (isApi && isMutating && !isCsrfExempt) {
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get(CSRF_HEADER);
    if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
      return csrfReject();
    }
  }

  const isAuthed = !!req.auth?.userId;
  const isPage = PROTECTED_PAGE.some((r) => r.test(path));
  const isProtectedApi = PROTECTED_API.some((r) => r.test(path));

  if (!isPage && !isProtectedApi) {
    return ensureCsrfCookie(req, NextResponse.next());
  }
  if (isAuthed) {
    return ensureCsrfCookie(req, NextResponse.next());
  }

  if (isProtectedApi) {
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
  return ensureCsrfCookie(req, NextResponse.redirect(loginUrl));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assests/).*)"],
};
