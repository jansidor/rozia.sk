import { BellRing, FileSearch, HandCoins, KeyRound } from 'lucide-react';
import { pageMeta } from '@/lib/meta';
import { getListings } from '@/lib/data';
import { PageHeader, Section } from '@/components/page-header';
import { PropertyGrid } from '@/components/property-card';
import { ContactForm } from '@/components/contact-form';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 600;
export const metadata = pageMeta({
  title: 'Kupujem nehnuteľnosť na Liptove',
  description: 'Služby pre kupujúcich: upozornenie na nové ponuky, právna kontrola listu vlastníctva, pomoc s financovaním a bezpečný prevod cez úschovu.',
  path: '/kupujem/',
});

const services = [
  { Icon: BellRing, title: 'Upozornenie na nové ponuky', text: 'Povedzte nám, čo hľadáte. Ozveme sa, keď pribudne nehnuteľnosť, ktorá vám sedí.' },
  { Icon: FileSearch, title: 'Právna kontrola', text: 'Pred rezerváciou skontrolujeme list vlastníctva: ťarchy, vecné bremená, plomby aj spoluvlastníkov.' },
  { Icon: HandCoins, title: 'Financovanie', text: 'Prepojíme vás s finančným partnerom, ktorý porovná hypotéky viacerých bánk.' },
  { Icon: KeyRound, title: 'Bezpečný prevod', text: 'Kúpna cena ide cez úschovu. Predávajúci ju dostane až po zápise vlastníctva do katastra.' },
];

export default async function BuyPage() {
  const listings = await getListings({ transaction: 'predaj' });
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kupujem', path: '/kupujem/' }]} title="Kupujete na Liptove?" lead="Pomôžeme vám nájsť, preveriť a bezpečne kúpiť byt, dom, chatu alebo apartmán.">
        <ButtonLink href="/predaj/">Pozrieť ponuku</ButtonLink>
      </PageHeader>
      <Section id="sluzby" title="Čo pre vás urobíme">
        <ul className="grid gap-5 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.title} className="rounded-2xl border border-subtle bg-white p-6 shadow-card">
              <span className="grid size-12 place-items-center rounded-xl bg-green-50 text-green-700"><s.Icon aria-hidden className="size-6" /></span>
              <h3 className="mt-4 text-xl">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      {listings.length > 0 && (
        <Section id="ponuka" title="Najnovšie v ponuke" tone="surface"><PropertyGrid listings={listings.slice(0, 3)} /></Section>
      )}
      <Section id="dopyt" title="Dajte nám vedieť, čo hľadáte" lead="Lokalita, typ, rozpočet. Ozveme sa najneskôr nasledujúci pracovný deň.">
        <div className="max-w-2xl rounded-2xl border border-subtle bg-white p-6 shadow-card sm:p-8">
          <ContactForm kind="dopyt" context="Dopyt kupujúceho" messageLabel="Čo hľadáte?" messagePlaceholder="napr. 3-izbový byt v Ružomberku do 170 000 €" submitLabel="Poslať dopyt" />
        </div>
      </Section>
    </>
  );
}
