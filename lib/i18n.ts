/** Routing je pripravený na ďalšie jazyky: stačí pridať kód do `locales` a slovník. */
export const locales = ['sk'] as const;
export const plannedLocales = ['en', 'cs', 'pl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sk';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Predvolený jazyk je bez prefixu (rozia.sk/predaj/), ostatné s prefixom (/en/…). */
export function href(path: string, locale: Locale = defaultLocale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === defaultLocale ? clean : `/${locale}${clean}`;
}
