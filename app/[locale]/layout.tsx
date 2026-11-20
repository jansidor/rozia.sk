import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import '../globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CookieBanner } from '@/components/cookie-banner';
import { JsonLd } from '@/components/json-ld';
import { agencyLd, graph } from '@/lib/jsonld';
import { isLocale, locales } from '@/lib/i18n';
import { site } from '@/lib/site';
import { demoMode } from '@/lib/data';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Rozia – realitná kancelária pre Liptov', template: '%s | Rozia' },
  description:
    'Zistite, koľko dnes stojí váš byt na Liptove. Rozsah ceny hneď, presné ocenenie od makléra z vašej lokality do 24 hodín. Ružomberok, Liptovský Mikuláš, Jasná, Liptovská Mara.',
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: '#0D2B1D', width: 'device-width', initialScale: 1 };

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

const FONTS = ['inter-latin', 'inter-latin-ext', 'plus-jakarta-sans-latin', 'plus-jakarta-sans-latin-ext'];

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale}>
      <head>
        {FONTS.map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}-wght-normal.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body className="flex min-h-dvh flex-col">
        {demoMode && (
          <p role="status" className="no-print bg-warning-bg px-4 py-2 text-center text-sm font-semibold text-warning">
            ⚠ Ukážkové dáta (ROZIA_DEMO_DATA=1). Mená, ceny a predaje sú vymyslené a v produkcii sa nezobrazia.
          </p>
        )}
        <Header />
        <main id="obsah" className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
        <JsonLd data={graph(agencyLd())} />
      </body>
    </html>
  );
}
