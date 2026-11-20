import type { MetadataRoute } from 'next';
import { getAgents, getArticles, getListings, getPriceStats, getSales } from '@/lib/data';
import { cities } from '@/lib/localities';
import { listingPath } from '@/lib/jsonld';
import { positions } from '@/content/career';
import { legalReady, site } from '@/lib/site';

export const revalidate = 3600;

/** Dátum poslednej úpravy statického obsahu (šablóny a texty). */
const CONTENT_UPDATED = '2026-11-20';
const latest = (dates: string[], fallback = CONTENT_UPDATED) => dates.reduce((m, d) => (d > m ? d : m), fallback);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, agents, articles, stats, sales] = await Promise.all([getListings(), getAgents(), getArticles(), getPriceStats(), getSales()]);
  const entry = (path: string, lastModified: string) => ({ url: `${site.url}${path}`, lastModified: new Date(lastModified) });
  const listingsUpdated = latest(listings.map((l) => l.updatedAt));
  const statsUpdated = latest(stats.map((s) => s.updatedAt));

  const statics = ['/predat-nehnutelnost/', '/predat-nehnutelnost/ocenenie/', '/kupujem/', '/kariera/', '/kariera/kalkulacka-prijmu/', '/kariera/model-spoluprace/', '/o-nas/', '/kontakt/', '/cookies/', '/vyhlasenie-o-pristupnosti/', '/lokality/'];
  if (legalReady) statics.push('/obchodne-podmienky/', '/ochrana-osobnych-udajov/');

  // Kombinácie typ × lokalita len tam, kde je reálna ponuka.
  const combos = new Map<string, string>();
  for (const l of listings) {
    const key = `/${l.transaction}/${l.type}/${l.citySlug}/`;
    combos.set(key, latest([l.updatedAt], combos.get(key) ?? ''));
  }
  // Lokality len s dátami (ostatné sú noindex).
  const withData = new Set<string>();
  for (const s of stats) withData.add(`${s.citySlug}/${s.partSlug ?? ''}`);
  for (const l of listings) { withData.add(`${l.citySlug}/`); if (l.partSlug) withData.add(`${l.citySlug}/${l.partSlug}`); }
  for (const s of sales) { withData.add(`${s.citySlug}/`); if (s.partSlug) withData.add(`${s.citySlug}/${s.partSlug}`); }
  const localities = cities.flatMap((c) => [
    ...(withData.has(`${c.slug}/`) ? [`/lokality/${c.slug}/`] : []),
    ...c.parts.filter((p) => withData.has(`${c.slug}/${p.slug}`)).map((p) => `/lokality/${c.slug}/${p.slug}/`),
  ]);

  return [
    entry('/', listingsUpdated),
    entry('/predaj/', listingsUpdated),
    entry('/prenajom/', listingsUpdated),
    ...[...combos].map(([path, d]) => entry(path, d)),
    ...listings.map((l) => entry(listingPath(l), l.updatedAt)),
    entry('/predane/', latest(sales.map((s) => s.soldAt))),
    entry('/cenova-mapa-liptova/', statsUpdated),
    ...localities.map((p) => entry(p, statsUpdated)),
    ...statics.map((p) => entry(p, CONTENT_UPDATED)),
    entry('/makleri/', CONTENT_UPDATED),
    ...agents.map((a) => entry(`/makleri/${a.slug}/`, CONTENT_UPDATED)),
    ...positions.map((p) => entry(`/kariera/${p.slug}/`, p.datePosted)),
    entry('/sprievodca/', latest(articles.map((a) => a.updatedAt))),
    ...articles.map((a) => entry(`/sprievodca/${a.slug}/`, a.updatedAt)),
  ];
}
