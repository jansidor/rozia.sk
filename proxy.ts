import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/lib/i18n';

/**
 * Slovenčina beží bez prefixu (rozia.sk/predaj/), interne sa mapuje na /sk/….
 * Ďalšie jazyky (/en/, /cs/, /pl/) začnú fungovať po pridaní do `locales`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1] ?? '';
  const url = request.nextUrl.clone();

  if (first === defaultLocale) {
    url.pathname = pathname.slice(defaultLocale.length + 1) || '/';
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();

  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next|api|.*\\.[\\w]+$).*)'] };
