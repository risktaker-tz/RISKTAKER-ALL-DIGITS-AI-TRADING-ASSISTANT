import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { defaultLocale, locales } from "@/lib/i18n/config";

function getLocale(request: NextRequest) {
  const pathnameLocale = locales.find((locale) =>
    request.nextUrl.pathname.startsWith(`/${locale}`)
  );

  if (pathnameLocale) {
    return pathnameLocale;
  }

  const cookieLocale = request.cookies.get("tuchati-locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
    return cookieLocale;
  }

  const header = request.headers.get("accept-language")?.toLowerCase() ?? "";
  const matched = locales.find((locale) => header.includes(locale));
  return matched ?? defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
