import type { Metadata } from 'next';
import { site } from './site';

/** Jednotné metadáta stránky: canonical bez query parametrov, OG, voliteľný noindex. */
export function pageMeta({ title, description, path, noindex = false }: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: site.name, locale: 'sk_SK', type: 'website' },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
