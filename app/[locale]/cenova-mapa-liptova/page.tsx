import { getPriceStats } from '@/lib/data';
import { getCity, getPart, LIPTOV_CENTER, localityName } from '@/lib/localities';
import { date } from '@/lib/format';
import { pageMeta } from '@/lib/meta';
import { PageHeader, Section, EmptyState } from '@/components/page-header';
import { PriceMap, type MapPoint } from '@/components/price-map';
import { LocalityPriceTable, periodLabel } from '@/components/price-table';
import { PrintButton } from '@/components/print-button';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 3600;
export const metadata = pageMeta({
  title: 'Cenová mapa Liptova: ceny bytov za m² podľa lokalít',
  description: 'Interaktívna cenová mapa Liptova. Medián ceny bytov za m² v Ružomberku, Liptovskom Mikuláši, Jasnej a pri Liptovskej Mare. Aktualizujeme štvrťročne.',
  path: '/cenova-mapa-liptova/',
});

export default async function PriceMapPage() {
  const stats = (await getPriceStats()).filter((s) => s.rooms === null && s.condition === null);
  const period = stats[0]?.period;
  const updated = stats.reduce((m, s) => (s.updatedAt > m ? s.updatedAt : m), '');
  const points: MapPoint[] = stats.flatMap((s) => {
    const place = s.partSlug ? getPart(s.citySlug, s.partSlug) : getCity(s.citySlug);
    return place ? [{ label: place.name, lat: place.lat, lng: place.lng, medianPerM2: s.medianPerM2, href: `/lokality/${s.citySlug}/${s.partSlug ? `${s.partSlug}/` : ''}` }] : [];
  });

  return (
    <>
      <PageHeader
        crumbs={[{ name: 'Cenová mapa Liptova', path: '/cenova-mapa-liptova/' }]}
        title="Cenová mapa Liptova"
        lead={period ? `Medián ponukových cien bytov za m² podľa lokalít. ${periodLabel(period)}, stav k ${date(updated)}. Aktualizujeme štvrťročne.` : 'Medián cien bytov za m² podľa lokalít. Aktualizujeme štvrťročne.'}
      >
        {stats.length > 0 && <PrintButton>Stiahnuť ako PDF</PrintButton>}
      </PageHeader>

      {stats.length === 0 ? (
        <Section>
          <EmptyState title="Zatiaľ nemáme dosť dát" action={<ButtonLink href="/predat-nehnutelnost/ocenenie/">Ocenenie maklérom do 24 hodín</ButtonLink>}>
            Cenovú mapu zverejníme, keď budeme mať pre každú lokalitu dosť ponúk a predajov na spoľahlivý medián. Odhadnuté ani vymyslené čísla neuvádzame.
          </EmptyState>
        </Section>
      ) : (
        <>
          <Section id="mapa" title="Mapa">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="no-print min-w-0"><PriceMap title="Cenová mapa Liptova" points={points} center={LIPTOV_CENTER} zoom={LIPTOV_CENTER.zoom} /></div>
              <div className="min-w-0">
                <LocalityPriceTable stats={stats} />
                <p className="mt-3 text-sm text-muted">
                  Medián = polovica ponúk je lacnejšia, polovica drahšia. Ide o ponukové ceny; reálne predajné ceny bývajú nižšie.
                  Lokality: {stats.map((s) => localityName(s.citySlug, s.partSlug)).join(', ')}.
                </p>
              </div>
            </div>
          </Section>
          <Section tone="surface" title="Koľko stojí práve váš byt?" lead="Mapa ukazuje medián lokality. Cenu konkrétneho bytu ovplyvní stav, poschodie aj dispozícia.">
            <ButtonLink href="/predat-nehnutelnost/ocenenie/" className="no-print">Zistiť cenu môjho bytu</ButtonLink>
          </Section>
        </>
      )}
    </>
  );
}
