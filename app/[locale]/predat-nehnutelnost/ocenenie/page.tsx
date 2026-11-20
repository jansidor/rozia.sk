import { ShieldCheck, Timer, UserRound } from 'lucide-react';
import { pageMeta } from '@/lib/meta';
import { guessLocality, localityOptions } from '@/lib/localities';
import { Breadcrumbs } from '@/components/page-header';
import { ValuationForm } from '@/components/valuation-form';

export const metadata = pageMeta({
  title: 'Ocenenie nehnuteľnosti na Liptove online',
  description: 'Zadajte adresu a parametre nehnuteľnosti. Orientačný rozsah ceny uvidíte hneď, presné ocenenie od makléra z vašej lokality do 24 hodín. Zadarmo a bez záväzku.',
  path: '/predat-nehnutelnost/ocenenie/',
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ValuationPage({ searchParams }: Props) {
  const sp = await searchParams;
  const address = one(sp.adresa).slice(0, 160);
  const wanted = one(sp.lokalita);
  const locality = localityOptions().some((o) => o.value === wanted) ? wanted : (guessLocality(address) ?? '');

  return (
    <div className="bg-surface">
      <div className="container-page pt-3 pb-16">
        <Breadcrumbs items={[{ name: 'Predať nehnuteľnosť', path: '/predat-nehnutelnost/' }, { name: 'Ocenenie', path: '/predat-nehnutelnost/ocenenie/' }]} />
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div>
            <h1 className="text-3xl sm:text-4xl">Koľko stojí vaša nehnuteľnosť?</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted">Päť krátkych krokov. Rozsah ceny uvidíte hneď, presné ocenenie vám do 24 hodín zavolá maklér z vašej lokality.</p>
            <div className="mt-8"><ValuationForm initialAddress={address} initialLocality={locality} /></div>
          </div>
          <aside aria-label="Čo vás čaká" className="lg:pt-32">
            <ul className="space-y-5">
              {[
                { Icon: Timer, t: 'Dve minúty', d: 'Stačia základné údaje, ktoré poznáte naspamäť.' },
                { Icon: ShieldCheck, t: 'Bez záväzku', d: 'Ocenenie je zadarmo. Zavoláme raz, s výsledkom.' },
                { Icon: UserRound, t: 'Maklér z vašej lokality', d: 'Automatický odhad doplní človek, ktorý pozná vašu ulicu.' },
              ].map((i) => (
                <li key={i.t} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-green-700 shadow-card"><i.Icon aria-hidden className="size-5" /></span>
                  <div>
                    <p className="font-semibold">{i.t}</p>
                    <p className="text-sm text-muted">{i.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
