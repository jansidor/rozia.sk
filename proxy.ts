import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { defaultLocale, isLocale } from '@/lib/i18n';
import { crmRedirect } from '@/lib/crm/guard';

/** CRM (/crm/…): obnoví reláciu Supabase a neprihláseného pošle na prihlásenie. Verejný web sa tým nemení. */
async function crmProxy(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  let signedIn = false;
  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }),
          );
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  const target = crmRedirect(request.nextUrl.pathname, signedIn);
  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url), 303);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.headers.set('cache-control', 'no-store');
    return redirect;
  }
  response.headers.set('cache-control', 'no-store');
  return response;
}

/**
 * Slovenčina beží bez prefixu (rozia.sk/predaj/), interne sa mapuje na /sk/….
 * Ďalšie jazyky (/en/, /cs/, /pl/) začnú fungovať po pridaní do `locales`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1] ?? '';
  if (first === 'crm') return crmProxy(request);
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
