import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Check, Phone } from 'lucide-react';
import { getListing } from '@/lib/data';
import { graph, listingLd, listingPath } from '@/lib/jsonld';
import { pageMeta } from '@/lib/meta';
import { CONDITIONS, PROPERTY_TYPES, TRANSACTIONS } from '@/lib/types';
import { date, eur, eurPerM2, m2, telHref } from '@/lib/format';
import { Breadcrumbs } from '@/components/page-header';
import { EnergyChip, PhotoPlaceholder, StatusBadge, summaryLine } from '@/components/property-card';
import { SaveButton } from '@/components/save-button';
import { AgentAvatar } from '@/components/agent-card';
import { ContactForm } from '@/components/contact-form';
import { PriceMap } from '@/components/price-map';
import { JsonLd } from '@/components/json-ld';

export const revalidate = 600;
/** Stránky sa generujú pri prvej návšteve a potom sa obnovujú (ISR). */
export const generateStaticParams = async () => [];
type Props = { params: Promise<{ slug: string }> };

/** URL má tvar {slug}-{id}; rozhoduje stabilné ID, slug sa pri zmene presmeruje. */
async function load(param: string) {
  const m = /^(.*)-(\d+)$/.exec(param);
  if (!m) return null;
  const listing = await getListing(Number(m[2]));
  if (!listing) return null;
  return { listing, canonical: listingPath(listing), slugOk: m[1] === listing.slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).slug);
  if (!r) return {};
  const l = r.listing;
  return pageMeta({
    title: `${summaryLine(l)} – ${eur(l.price)}`,
    description: `${l.title}. ${summaryLine(l)}, ${TRANSACTIONS[l.transaction].noun}. ${l.description.slice(0, 120)}`,
    path: r.canonical,
  });
}

export default async function ListingPage({ params }: Props) {
  const r = await load((await params).slug);
  if (!r) notFound();
  if (!r.slugOk) permanentRedirect(r.canonical);
  const l = r.listing;
  const rent = l.transaction === 'prenajom';
  const [main, ...rest] = l.photos;
  const facts: [string, string][] = [
    ['Typ', PROPERTY_TYPES[l.type].label],
    [l.type === 'pozemky' ? 'Výmera' : 'Úžitková plocha', m2(l.areaM2)],
    ...(l.rooms ? [['Počet izieb', String(l.rooms)] as [string, string]] : []),
    ...(l.floor !== null ? [['Poschodie', l.floor === 0 ? 'Prízemie' : String(l.floor)] as [string, string]] : []),
    ...(l.condition ? [['Stav', CONDITIONS[l.condition]] as [string, string]] : []),
    ['Energetický certifikát', l.energyClass ? `Trieda ${l.energyClass}` : 'Nie je vyhotovený'],
    ['Lokalita', l.localityLabel],
    ['Aktualizované', date(l.updatedAt)],
    ['Číslo ponuky', String(l.id)],
  ];

  return (
    <article className="container-page pt-3 pb-16">
      <Breadcrumbs items={[{ name: TRANSACTIONS[l.transaction].label, path: `/${l.transaction}/` }, { name: summaryLine(l), path: r.canonical }]} />
      <JsonLd data={graph(listingLd(l))} />

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="min-w-0">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-surface">
            {main ? (
              <Image src={main.url} alt={main.alt || l.title} fill priority sizes="(min-width: 1024px) 800px, 100vw" placeholder={main.blurDataUrl ? 'blur' : 'empty'} blurDataURL={main.blurDataUrl ?? undefined} className="object-cover" />
            ) : (
              <PhotoPlaceholder />
            )}
            <StatusBadge listing={l} className="absolute left-4 top-4" />
            <SaveButton id={l.id} title={l.title} className="absolute right-4 top-4" />
          </div>
          {rest.length > 0 && (
            <ul aria-label="Ďalšie fotografie" className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
              {rest.map((p, i) => (
                <li key={p.url} className="relative aspect-4/3 w-56 shrink-0 snap-start overflow-hidden rounded-xl bg-surface">
                  <Image src={p.url} alt={p.alt || `${l.title} – fotografia ${i + 2}`} fill sizes="224px" className="object-cover" />
                </li>
              ))}
            </ul>
          )}

          <header className="mt-8">
            <p className="text-muted">{summaryLine(l)}</p>
            <h1 className="mt-1 text-3xl sm:text-4xl">{l.title}</h1>
            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
              <p className="tabular font-display text-4xl font-bold">
                {eur(l.price)}{rent && <span className="text-xl font-medium text-muted"> / mesiac</span>}
              </p>
              {!rent && <p className="tabular pb-1 text-lg text-muted">{eurPerM2(l.price / l.areaM2)}</p>}
              {l.previousPrice && l.previousPrice > l.price && (
                <p className="tabular pb-1 text-muted">pôvodne <s>{eur(l.previousPrice)}</s></p>
              )}
            </div>
            <div className="mt-4"><EnergyChip energyClass={l.energyClass} /></div>
          </header>

          <section aria-labelledby="popis" className="mt-10">
            <h2 id="popis" className="text-2xl">Popis</h2>
            <div className="mt-3 max-w-3xl space-y-4 text-lg">
              {l.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {l.features.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {l.features.map((f) => (
                  <li key={f} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium">
                    <Check aria-hidden className="size-4 text-success" />{f}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="parametre" className="mt-10">
            <h2 id="parametre" className="text-2xl">Parametre</h2>
            <dl className="tabular mt-4 grid max-w-3xl gap-x-10 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-subtle py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {l.lat !== null && l.lng !== null && (
            <section aria-labelledby="poloha" className="mt-10">
              <h2 id="poloha" className="text-2xl">Poloha</h2>
              <p className="mt-1 text-muted">Približná poloha. Presnú adresu vám povie maklér.</p>
              <div className="mt-4">
                <PriceMap title={`Mapa: ${l.localityLabel}`} center={{ lat: l.lat, lng: l.lng }} zoom={14} points={[{ label: l.localityLabel, lat: l.lat, lng: l.lng }]} />
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Kontakt na makléra" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-subtle bg-white p-6 shadow-card">
            {l.agent && (
              <div className="mb-6 border-b border-subtle pb-6">
                <div className="flex items-center gap-4">
                  <AgentAvatar agent={l.agent} size={64} />
                  <div>
                    <Link href={`/makleri/${l.agent.slug}/`} className="font-display text-lg font-bold underline-offset-4 hover:underline">{l.agent.name}</Link>
                    <p className="text-sm text-muted">{l.agent.area}</p>
                  </div>
                </div>
                <a href={telHref(l.agent.phone)} className="tabular mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-500 font-semibold text-green-950 hover:bg-green-400">
                  <Phone aria-hidden className="size-5" />
                  {l.agent.phone}
                </a>
              </div>
            )}
            <h2 className="text-xl">{l.status === 'active' ? 'Mám záujem o obhliadku' : 'Hľadám podobnú nehnuteľnosť'}</h2>
            <div className="mt-4">
              <ContactForm kind="dopyt" context={`Ponuka ${l.id}: ${l.title}`} messagePlaceholder="Kedy by vám vyhovovala obhliadka?" submitLabel="Poslať dopyt" />
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
