import { ArrowRight, Calculator, ListChecks, Search } from 'lucide-react';
import Link from 'next/link';
import { Hero } from '@/components/hero';
import { HowItWorks, Transparency, TrustBar } from '@/components/home-blocks';
import { Section } from '@/components/page-header';
import { PropertyGrid } from '@/components/property-card';
import { SoldShowcase } from '@/components/sold-showcase';
import { AgentGrid } from '@/components/agent-card';
import { Faq } from '@/components/faq';
import { ButtonLink } from '@/components/ui/button';
import { getAgents, getListings, getSales, getTrustStats } from '@/lib/data';
import { homeFaq } from '@/content/faq';

export const revalidate = 600;
export const metadata = { alternates: { canonical: '/' } };

const pillars = [
  { Icon: Search, title: 'Cenu vidíte hneď', text: 'Po zadaní adresy dostanete orientačný rozsah ceny z porovnateľných bytov v okolí. Presné ocenenie od makléra do 24 hodín.', href: '/predat-nehnutelnost/ocenenie/', cta: 'Zistiť cenu' },
  { Icon: ListChecks, title: 'Viete, v ktorom kroku je predaj', text: 'Od ocenenia po zápis do katastra má každý krok svoj termín a zodpovedného človeka. Každý týždeň dostanete report.', href: '/predat-nehnutelnost/', cta: 'Ako predávame' },
  { Icon: Calculator, title: 'Makléri vedia, koľko zarobia', text: 'Podiel 60, 70 a 80 % z provízie podľa produkcie. Vzorec aj všetky poplatky sú zverejnené.', href: '/kariera/kalkulacka-prijmu/', cta: 'Spočítať príjem' },
];

export default async function HomePage() {
  const [stats, listings, sales, agents] = await Promise.all([getTrustStats(), getListings({ transaction: 'predaj' }), getSales(), getAgents()]);

  return (
    <>
      <Hero />
      <TrustBar stats={stats} />

      <Section id="preco">
        <ul className="grid gap-5 lg:grid-cols-3">
          {pillars.map((p) => (
            <li key={p.title} className="relative flex flex-col rounded-2xl border border-subtle bg-white p-7 shadow-card transition-shadow hover:shadow-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-green-950">
              <span className="grid size-12 place-items-center rounded-xl bg-green-500 text-green-950"><p.Icon aria-hidden className="size-6" /></span>
              <h2 className="mt-5 text-2xl">{p.title}</h2>
              <p className="mt-2 text-muted">{p.text}</p>
              <Link href={p.href} className="card-link mt-5 inline-flex items-center gap-1.5 pt-1 font-semibold text-green-700 outline-none">
                {p.cta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="ako-to-funguje" title="Ako to funguje" lead="Šesť krokov od ocenenia po odovzdanie kľúčov." tone="surface">
        <HowItWorks />
      </Section>

      {listings.length > 0 && (
        <Section id="ponuka" title="Najnovšie v ponuke">
          <PropertyGrid listings={listings.slice(0, 6)} />
          <div className="mt-8"><ButtonLink href="/predaj/" variant="secondary">Celá ponuka ({listings.length})</ButtonLink></div>
        </Section>
      )}

      {sales.length > 0 && (
        <Section id="predane" title="Predané" lead="Čas predaja a percento z pôvodnej ceny. Len reálne prípady, zverejnené so súhlasom klienta." tone="surface">
          <SoldShowcase sales={sales.slice(0, 3)} />
          <div className="mt-8"><ButtonLink href="/predane/" variant="secondary">Všetky predané</ButtonLink></div>
        </Section>
      )}

      {agents.length > 0 && (
        <Section id="makleri" title="Makléri z vašej lokality" lead="Každý má priamy telefón. Žiadna ústredňa.">
          <AgentGrid agents={agents.slice(0, 3)} />
        </Section>
      )}

      <Section id="cena-sluzby" title="Čo platíte a čo za to dostanete" tone={agents.length > 0 ? 'surface' : 'white'}>
        <Transparency />
      </Section>

      <Section id="otazky" title="Časté otázky">
        <Faq items={homeFaq} />
      </Section>

      <section className="on-dark bg-green-950 text-white">
        <div className="container-page flex flex-col items-start gap-6 py-14 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl sm:text-4xl">Zistite cenu svojej nehnuteľnosti</h2>
            <p className="mt-2 text-lg text-white/85">Trvá to dve minúty a k ničomu vás to nezaväzuje.</p>
          </div>
          <ButtonLink href="/predat-nehnutelnost/ocenenie/" variant="brand" size="lg">
            Zistiť cenu
            <ArrowRight aria-hidden className="size-5" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
