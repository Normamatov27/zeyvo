import { NextRequest, NextResponse } from "next/server";

// next-intl does not require middleware when not using locale-prefixed routes.
// This file exists so the Next.js middleware slot is not empty, and so that
// auth-protected routes redirect to /sign-in for unauthenticated users
// (client-side guards inside pages handle the actual redirection; this is a
// lightweight server-side fast-path for the admin and platform shells).

const PROTECTED_PREFIXES = ["/admin", "/platform"];
const AUTH_COOKIE = "zeyvo_refresh";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Fast-path server-side guard: if the request is for a protected shell and
  // there is no refresh cookie, redirect to sign-in immediately.
  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const hasSession = req.cookies.has(AUTH_COOKIE);
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all non-static routes
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
