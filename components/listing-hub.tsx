import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getListings } from '@/lib/data';
import { PROPERTY_TYPES, TRANSACTIONS, type PropertyType, type Transaction } from '@/lib/types';
import { cities, getCity } from '@/lib/localities';
import { pageMeta } from '@/lib/meta';
import { PageHeader, EmptyState } from './page-header';
import { ListingFilters, type FilterValues } from './listing-filters';
import { PropertyGrid } from './property-card';
import { ButtonLink } from './ui/button';

const PER_PAGE = 12;
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const posInt = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export interface HubParams {
  transaction: Transaction;
  typ?: string;
  lokalita?: string;
}

function resolve({ transaction, typ, lokalita }: HubParams) {
  const type = typ && typ in PROPERTY_TYPES ? (typ as PropertyType) : undefined;
  const city = lokalita ? getCity(lokalita) : null;
  if ((typ && !type) || (lokalita && !city)) return null;
  const path = `/${transaction}/${type && city ? `${type}/${city.slug}/` : ''}`;
  const title = type && city ? `${PROPERTY_TYPES[type].plural} ${TRANSACTIONS[transaction].noun} ${city.locative}` : `Nehnuteľnosti ${TRANSACTIONS[transaction].noun} na Liptove`;
  return { type, city, path, title };
}

export function hubMetadata(params: HubParams, search: Search): Metadata {
  const r = resolve(params);
  if (!r) return {};
  const filtered = ['cena-do', 'izby', 'plocha-od', 'sort'].some((k) => one(search[k]));
  const meta = pageMeta({
    title: r.title,
    description: `${r.title}: aktuálna ponuka realitnej kancelárie Rozia s cenou za m², energetickou triedou a priamym kontaktom na makléra.`,
    path: r.path,
  });
  // Filtrované URL nedostávajú canonical – ich indexáciu rieši výhradne robots.txt.
  if (filtered) delete meta.alternates;
  return meta;
}

export async function ListingHub({ params, search }: { params: HubParams; search: Search }) {
  const r = resolve(params);
  if (!r) notFound();
  const { transaction } = params;
  const values: FilterValues = { 'cena-do': one(search['cena-do']), izby: one(search.izby), 'plocha-od': one(search['plocha-od']), sort: one(search.sort) };
  const filtered = Boolean(values['cena-do'] || values.izby || values['plocha-od']);
  const sort = values.sort === 'cena-asc' || values.sort === 'cena-desc' ? values.sort : undefined;

  const [all, results] = await Promise.all([
    getListings({ transaction }),
    getListings({ transaction, type: r.type, citySlug: r.city?.slug, priceMax: posInt(values['cena-do']), rooms: posInt(values.izby), areaMin: posInt(values['plocha-od']), sort }),
  ]);

  // Kombinácia typ × lokalita alebo filter bez výsledku = 404 (žiadne prázdne indexovateľné stránky).
  if (results.length === 0 && (r.type || filtered)) notFound();

  const page = posInt(one(search.strana)) ?? 1;
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  if (page > pages) notFound();
  const visible = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const combos = new Map<string, { type: PropertyType; citySlug: string; count: number }>();
  for (const l of all) {
    const key = `${l.type}/${l.citySlug}`;
    combos.set(key, { type: l.type, citySlug: l.citySlug, count: (combos.get(key)?.count ?? 0) + 1 });
  }
  const pageHref = (n: number) => {
    const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v) as [string, string][]);
    if (n > 1) q.set('strana', String(n));
    const s = q.toString();
    return s ? `${r.path}?${s}` : r.path;
  };
  const other: Transaction = transaction === 'predaj' ? 'prenajom' : 'predaj';
  const crumbs = [{ name: TRANSACTIONS[transaction].label, path: `/${transaction}/` }];
  if (r.type && r.city) crumbs.push({ name: `${PROPERTY_TYPES[r.type].plural}, ${r.city.name}`, path: r.path });

  return (
    <>
      <PageHeader crumbs={crumbs} title={r.title} lead={results.length > 0 ? `Počet ponúk: ${results.length}. Pri každej vidíte cenu za m² a energetickú triedu.` : undefined}>
        {all.length > 0 && <ListingFilters action={r.path} values={values} rent={transaction === 'prenajom'} />}
      </PageHeader>
      <div className="container-page py-10 sm:py-14">
        {results.length === 0 ? (
          <EmptyState
            title={`Momentálne nemáme žiadnu nehnuteľnosť ${TRANSACTIONS[transaction].noun}`}
            action={<>
              <ButtonLink href={`/${other}/`} variant="secondary">Pozrieť {TRANSACTIONS[other].label.toLowerCase()}</ButtonLink>
              <ButtonLink href="/kontakt/">Dať vedieť, čo hľadám</ButtonLink>
            </>}
          >
            Napíšte nám, čo hľadáte. Ozveme sa, keď pribudne ponuka, ktorá vám sedí.
          </EmptyState>
        ) : (
          <>
            <h2 className="sr-only">Zoznam ponúk</h2>
            <PropertyGrid listings={visible} priorityCount={3} />
            {pages > 1 && (
              <nav aria-label="Stránkovanie" className="mt-10 flex items-center justify-center gap-3">
                {page > 1 && <ButtonLink href={pageHref(page - 1)} variant="secondary" rel="prev">Predchádzajúca</ButtonLink>}
                <span className="tabular text-muted">Strana {page} z {pages}</span>
                {page < pages && <ButtonLink href={pageHref(page + 1)} variant="secondary" rel="next">Ďalšia</ButtonLink>}
              </nav>
            )}
          </>
        )}

        {combos.size > 0 && (
          <nav aria-label="Ponuka podľa typu a lokality" className="mt-14 border-t border-subtle pt-8">
            <h2 className="text-xl">Podľa typu a lokality</h2>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {[...combos.values()].sort((a, b) => b.count - a.count).map((c) => (
                <li key={`${c.type}/${c.citySlug}`}>
                  <Link href={`/${transaction}/${c.type}/${c.citySlug}/`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-control px-4 text-[15px] font-medium hover:bg-green-50">
                    {PROPERTY_TYPES[c.type].plural} · {cities.find((x) => x.slug === c.citySlug)?.name ?? c.citySlug}
                    <span className="tabular text-muted">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}
