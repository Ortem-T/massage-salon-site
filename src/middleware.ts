import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales, type Locale } from "@/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale: Locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|robots.txt|sitemap.xml).*)"]
};
