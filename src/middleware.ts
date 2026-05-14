import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales, preferredLocaleCookieName, type Locale } from "@/i18n/config";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

function getLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) {
    return defaultLocale;
  }

  const acceptedLocales = header
    .split(",")
    .map((item) => {
      const [languageRange = "", qualityValue] = item.trim().split(";q=");
      const locale = languageRange.toLowerCase().split("-")[0];
      const quality = qualityValue ? Number.parseFloat(qualityValue) : 1;

      return { locale, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .sort((a, b) => b.quality - a.quality);

  const match = acceptedLocales.find(({ locale }) => isLocale(locale));

  return match && isLocale(match.locale) ? match.locale : defaultLocale;
}

function getPreferredLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(preferredLocaleCookieName)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return getLocaleFromAcceptLanguage(request.headers.get("accept-language"));
}

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

  if (pathname === "/") {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = `/${getPreferredLocale(request)}`;

    return NextResponse.redirect(nextUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale: Locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const pathnameNeedsAuthSession = locales.some(
    (locale: Locale) => pathname === `/${locale}/login` || pathname.startsWith(`/${locale}/dashboard`)
  );

  if (pathnameHasLocale) {
    return pathnameNeedsAuthSession ? updateSupabaseSession(request) : NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|robots.txt|sitemap.xml).*)"]
};
