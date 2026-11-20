import { ArrowRight } from 'lucide-react';
import { pageMeta } from '@/lib/meta';
import { getSales, getTrustStats } from '@/lib/data';
import { PageHeader, Section } from '@/components/page-header';
import { HowItWorks, Transparency, TrustBar } from '@/components/home-blocks';
import { SoldShowcase } from '@/components/sold-showcase';
import { Faq } from '@/components/faq';
import { ButtonLink } from '@/components/ui/button';
import { homeFaq } from '@/content/faq';

export const revalidate = 600;
export const metadata = pageMeta({
  title: 'Predať nehnuteľnosť na Liptove',
  description: 'Predaj bytu, domu alebo chaty na Liptove: ocenenie zadarmo, provízia len pri úspešnom predaji, právna kontrola, úschova a kataster v cene.',
  path: '/predat-nehnutelnost/',
});

export default async function SellPage() {
  const [stats, sales] = await Promise.all([getTrustStats(), getSales()]);
  return (
    <>
      <PageHeader crumbs={[{ name: 'Predať nehnuteľnosť', path: '/predat-nehnutelnost/' }]} title="Predaj, ktorý vidíte krok po kroku" lead="Od ocenenia po zápis do katastra. Províziu platíte len vtedy, keď predáme.">
        <ButtonLink href="/predat-nehnutelnost/ocenenie/" size="lg">
          Zistiť cenu
          <ArrowRight aria-hidden className="size-5" />
        </ButtonLink>
      </PageHeader>
      <TrustBar stats={stats} />
      <Section id="postup" title="Šesť krokov predaja"><HowItWorks /></Section>
      <Section id="cena-sluzby" title="Čo platíte a čo za to dostanete" tone="surface"><Transparency /></Section>
      {sales.length > 0 && (
        <Section id="predane" title="Ako dopadli predaje našich klientov" lead="Zverejnené so súhlasom klientov.">
          <SoldShowcase sales={sales.slice(0, 3)} />
        </Section>
      )}
      <Section id="otazky" title="Časté otázky predávajúcich" tone={sales.length > 0 ? 'surface' : 'white'}><Faq items={homeFaq} /></Section>
    </>
  );
}
