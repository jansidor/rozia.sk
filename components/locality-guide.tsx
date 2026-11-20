import { Bus, CarFront, GraduationCap, Building2 } from 'lucide-react';
import type { City, Part } from '@/lib/localities';
import { cities } from '@/lib/localities';
import { getListings, getLocalityInfo, getPriceStats, getSales } from '@/lib/data';
import { date, eurPerM2, median, monthYear, telHref } from '@/lib/format';
import { PageHeader, Section, EmptyState, type Crumb } from './page-header';
import { PropertyGrid } from './property-card';
import { SoldShowcase } from './sold-showcase';
import { BreakdownTable, periodLabel } from './price-table';
import { PriceMap } from './price-map';
import { AgentAvatar } from './agent-card';
import { Faq } from './faq';
import { ButtonLink } from './ui/button';
import Link from 'next/link';

/** Lokalitná stránka má obsah (a indexuje sa), len keď k nej existujú reálne dáta. */
export async function localityHasData(citySlug: string, partSlug: string | null) {
  const [stats, listings, sales, info] = await Promise.all([
    getPriceStats(),
    getListings({ citySlug, partSlug: partSlug ?? undefined }),
    getSales({ citySlug, partSlug: partSlug ?? undefined }),
    getLocalityInfo(citySlug, partSlug),
  ]);
  const own = stats.filter((s) => s.citySlug === citySlug && s.partSlug === partSlug);
  return { hasData: own.length > 0 || listings.length > 0 || sales.length > 0 || info !== null, stats: own, listings, sales, info };
}

export async function LocalityGuide({ city, part }: { city: City; part: Part | null }) {
  const { hasData, stats, listings, sales, info } = await localityHasData(city.slug, part?.slug ?? null);
  const name = part?.name ?? city.name;
  const where = part?.locative ?? city.locative;
  const path = `/lokality/${city.slug}/${part ? `${part.slug}/` : ''}`;
  const crumbs: Crumb[] = [{ name: 'Lokality', path: '/lokality/' }, { name: city.name, path: `/lokality/${city.slug}/` }];
  if (part) crumbs.push({ name: part.name, path });

  const headline = stats.find((s) => s.rooms === null && s.condition === null) ?? null;
  const medianDays = median(sales.map((s) => s.daysOnMarket));
  const updated = headline?.updatedAt ?? info?.updatedAt ?? null;
  const valuationHref = `/predat-nehnutelnost/ocenenie/?lokalita=${part ? `${city.slug}/${part.slug}` : city.slug}`;
  const lifeBlocks = [
    { Icon: GraduationCap, title: 'Školy a škôlky', text: info?.schools },
    { Icon: Bus, title: 'Doprava a MHD', text: info?.transport },
    { Icon: CarFront, title: 'Parkovanie', text: info?.parking },
    { Icon: Building2, title: 'Typ domov a výstavba', text: info?.housing },
  ].filter((b) => b.text);
  const neighbours = part ? city.parts.filter((p) => p.slug !== part.slug) : [];

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={<>Byty {where}: ceny, ponuka a život v lokalite{updated && <span className="block text-xl font-medium text-muted sm:text-2xl">aktualizované {monthYear(updated)}</span>}</>}
      >
        {headline ? (
          <p className="max-w-3xl text-lg">
            Medián ponukovej ceny bytu {where} je <strong className="tabular">{eurPerM2(headline.medianPerM2)}</strong>
            {' '}({periodLabel(headline.period)}, {headline.sampleSize} ponúk).
            {sales.length > 0 && <> Predané nehnuteľnosti so súhlasom klienta: <strong className="tabular">{sales.length}</strong>{medianDays !== null && <>, medián času do predaja <strong className="tabular">{Math.round(medianDays)} dní</strong></>}.</>}
            {' '}<span className="text-base text-muted">Zdroj: Rozia a verejné ponuky, stav k {date(headline.updatedAt)}.</span>
          </p>
        ) : (
          <p className="max-w-3xl text-lg text-muted">
            Pre lokalitu {name} zatiaľ nemáme dosť dát na zverejnenie cien. Čísla doplníme, hneď ako ich budeme vedieť podložiť.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={valuationHref}>Zistiť cenu môjho bytu {where}</ButtonLink>
          <ButtonLink href="/kontakt/" variant="secondary">Upozorniť ma na nové byty</ButtonLink>
        </div>
      </PageHeader>

      {!hasData && (
        <Section>
          <EmptyState title="Zatiaľ nemáme dosť dát" action={<ButtonLink href="/cenova-mapa-liptova/" variant="secondary">Cenová mapa Liptova</ButtonLink>}>
            Sprievodcu lokalitou {name} zverejníme s reálnymi cenami, ponukou a predajmi.
          </EmptyState>
        </Section>
      )}

      {stats.some((s) => s.rooms !== null || s.condition !== null) && (
        <Section id="ceny" title={`Ceny bytov ${where} podľa izieb a stavu`} lead={headline ? `Medián ponukových cien, ${periodLabel(headline.period)}.` : undefined}>
          <div className="max-w-3xl"><BreakdownTable stats={stats} /></div>
        </Section>
      )}

      {listings.length > 0 && (
        <Section id="ponuka" title={`Aktuálna ponuka ${where}`} tone="surface">
          <PropertyGrid listings={listings.slice(0, 6)} />
        </Section>
      )}

      {sales.length > 0 && (
        <Section id="predane" title={`Predané ${where}`} lead="Čas predaja a percento z pôvodnej ceny. Zverejnené so súhlasom klientov.">
          <SoldShowcase sales={sales.slice(0, 6)} />
        </Section>
      )}

      {(lifeBlocks.length > 0 || info?.agentComment) && (
        <Section id="zivot" title={`Život ${where}`} tone="surface">
          <div className="grid gap-5 sm:grid-cols-2">
            {lifeBlocks.map((b) => (
              <div key={b.title} className="rounded-2xl border border-subtle bg-white p-6">
                <b.Icon aria-hidden className="size-6 text-green-700" />
                <h3 className="mt-3 text-lg">{b.title}</h3>
                <p className="mt-2 text-muted">{b.text}</p>
              </div>
            ))}
          </div>
          {info?.agentComment && info.agent && (
            <figure className="mt-6 flex flex-col gap-5 rounded-2xl border border-subtle bg-white p-6 sm:flex-row sm:items-center">
              <AgentAvatar agent={info.agent} size={72} />
              <div>
                <blockquote className="text-lg">„{info.agentComment}“</blockquote>
                <figcaption className="mt-2 text-sm text-muted">
                  <Link href={`/makleri/${info.agent.slug}/`} className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">{info.agent.name}</Link>
                  {' · '}
                  <a href={telHref(info.agent.phone)} className="tabular font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">{info.agent.phone}</a>
                </figcaption>
              </div>
            </figure>
          )}
        </Section>
      )}

      <Section id="mapa" title={`${name} na mape`}>
        <PriceMap
          title={`Mapa lokality ${name}`}
          center={part ?? city}
          zoom={part ? 14 : city.zoom}
          points={[{ label: name, lat: (part ?? city).lat, lng: (part ?? city).lng, medianPerM2: headline?.medianPerM2 }]}
        />
      </Section>

      {info && info.faq.length > 0 && (
        <Section id="otazky" title={`Časté otázky: ${name}`} tone="surface">
          <Faq items={info.faq} />
        </Section>
      )}

      <Section tone={info?.faq.length ? 'white' : 'surface'} title="Ďalšie lokality">
        <ul className="flex flex-wrap gap-2.5">
          {neighbours.map((p) => (
            <li key={p.slug}><ButtonLink href={`/lokality/${city.slug}/${p.slug}/`} variant="secondary" size="sm">{p.name}</ButtonLink></li>
          ))}
          {!part && city.parts.map((p) => (
            <li key={p.slug}><ButtonLink href={`/lokality/${city.slug}/${p.slug}/`} variant="secondary" size="sm">{p.name}</ButtonLink></li>
          ))}
          {cities.filter((c) => c.slug !== city.slug || part).map((c) => (
            <li key={c.slug}><ButtonLink href={`/lokality/${c.slug}/`} variant="secondary" size="sm">{c.name}</ButtonLink></li>
          ))}
          <li><ButtonLink href="/cenova-mapa-liptova/" variant="quiet" size="sm">Cenová mapa Liptova</ButtonLink></li>
        </ul>
      </Section>
    </>
  );
}
