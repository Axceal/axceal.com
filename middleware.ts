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

// W4 — when SALES_MODE=waitlist, all purchase flows are disabled. Pages
// redirect home, APIs return 403 SALES_DISABLED. Middleware also reads the
// env var directly (not via lib/featureFlags) so the edge bundle stays
// dependency-free. The default branch matches isWaitlist() — anything other
// than "live" / "dev-live" gates as waitlist mode.
const SALES_MODE_ENV = process.env.NEXT_PUBLIC_SALES_MODE;
const IS_WAITLIST_MODE =
  SALES_MODE_ENV !== "live" && SALES_MODE_ENV !== "dev-live";

const WAITLIST_BLOCKED_PAGE = [/^\/order(\/|$)/];
const WAITLIST_BLOCKED_API = [
  /^\/api\/orders(\/|$)/,
  /^\/api\/payments\/(initiate|verify)(\/|$)/,
  /^\/api\/addresses(\/|$)/,
  // W9 sec-review — `/api/validate-address` is part of the checkout flow and
  // touches the paid Google Address Validation API. Blocking it in waitlist
  // mode closes the only authenticated, paid-upstream endpoint that the
  // checkout block above doesn't already cover.
  /^\/api\/validate-address(\/|$)/,
];

// Mirror of the client-side flag — lets developers bypass the server-side
// redirect without changing code. Set NEXT_PUBLIC_DEV_SKIP_AUTH_GATES=true
// in .env.local. NODE_ENV guard is load-bearing: NEXT_PUBLIC_* vars are baked
// into the production build, so a stray .env.production entry would otherwise
// disable auth gates sitewide.
const DEV_SKIP_GATES =
  process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH_GATES === "true";
const PROTECTED_API = [
  /^\/api\/account(\/|$)/,
  /^\/api\/orders(\/|$)/,
  /^\/api\/addresses(\/|$)/,
  /^\/api\/payments\/initiate(\/|$)/,
  /^\/api\/payments\/verify(\/|$)/,
  /^\/api\/validate-address(\/|$)/,
];

const CSRF_EXEMPT = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/payments\/webhook(\/|$)/,
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// F16.1 — edge-rendered image routes. Strip any query string so the Vercel
// CDN sees a single canonical URL and serves cached PNG bytes for every
// repeat hit. Without this, `/icon?cb=1` and `/icon?cb=2` would each cache-
// miss and re-invoke the ImageResponse generator, turning the endpoints into
// a cost-amplification DoS vector.
const IMG_ROUTES = new Set(["/icon", "/apple-icon", "/opengraph-image"]);

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

  // F16.1 — collapse `/icon?...` → `/icon` so CDN cache key never varies on
  // attacker-supplied query strings. 301 permanent so legitimate clients
  // cache the redirect themselves.
  if (IMG_ROUTES.has(path) && req.nextUrl.search.length > 0) {
    const url = req.nextUrl.clone();
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  const isApi = path.startsWith("/api/");
  const isMutating = MUTATING_METHODS.has(method);
  const isCsrfExempt = CSRF_EXEMPT.some((r) => r.test(path));

  // W4 — waitlist gate runs before auth so blocked routes never reveal
  // whether the user was logged in. Pages bounce home; APIs return 403.
  if (IS_WAITLIST_MODE) {
    if (!isApi && WAITLIST_BLOCKED_PAGE.some((r) => r.test(path))) {
      const homeUrl = new URL("/", req.url);
      return ensureCsrfCookie(req, NextResponse.redirect(homeUrl));
    }
    if (isApi && WAITLIST_BLOCKED_API.some((r) => r.test(path))) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SALES_DISABLED",
            message: "Purchase flow disabled while waitlist is active",
          },
        },
        { status: 403 },
      );
    }
  }

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

  // Dev flag: let unauthenticated users through for local testing.
  if (DEV_SKIP_GATES) {
    return ensureCsrfCookie(req, NextResponse.next());
  }

  const authUrl = new URL("/auth", req.url);
  authUrl.searchParams.set("from", path + req.nextUrl.search);
  return ensureCsrfCookie(req, NextResponse.redirect(authUrl));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
