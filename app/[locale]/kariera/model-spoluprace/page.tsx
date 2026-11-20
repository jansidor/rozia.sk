import { Check } from 'lucide-react';
import { pageMeta } from '@/lib/meta';
import { PageHeader, Section } from '@/components/page-header';
import { IncomeFormula } from '@/components/income-calculator';
import { ButtonLink } from '@/components/ui/button';
import { benefits, costs } from '@/content/career';

export const metadata = pageMeta({
  title: 'Model spolupráce s maklérmi: podiely, poplatky a čo hradí Rozia',
  description: 'Podiel makléra 60, 70 a 80 % podľa produkcie, mesačný poplatok za platformu, žiadny vstupný poplatok. Všetky pravidlá na jednej stránke.',
  path: '/kariera/model-spoluprace/',
});

const rules = [
  { title: 'Odmena len za výsledok', text: 'Provízia vzniká z uzavretého obchodu. Neplatíme fixný plat a nevyžadujeme povinné hodiny.' },
  { title: 'Leady si beriete sami', text: 'Dopyty z webu ponúkame podľa lokality. Zákazku môžete odmietnuť.' },
  { title: 'Privedení makléri', text: 'Ak k nám privediete makléra, dostávate časť z podielu Rozie na jeho uzavretých obchodoch. Nie z jeho provízie a nie z poplatkov. Vyplácame, len keď sami aktívne predávate. Väčšina maklérov z toho bude mať doplnok, nie hlavný príjem.' },
  { title: 'Cesta k spolumajiteľstvu', text: 'Najproduktívnejší partneri môžu získať akcie Rozie podľa toho, koľko prinesú do spoločnosti. Pravidlá sú písané dopredu a rovnaké pre všetkých.' },
];

export default function ModelPage() {
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kariéra', path: '/kariera/' }, { name: 'Model spolupráce', path: '/kariera/model-spoluprace/' }]} title="Model spolupráce" lead="Podiely, poplatky a čo hradí Rozia. Bez drobného písma." />
      <Section id="podiel" title="Váš podiel z provízie"><div className="max-w-3xl"><IncomeFormula /></div></Section>
      <Section id="naklady" tone="surface" title="Kto čo hradí">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-subtle bg-white p-7 shadow-card">
            <h3 className="text-2xl">Hradí Rozia</h3>
            <ul className="mt-5 space-y-3">{benefits.map((b) => <li key={b} className="flex gap-3"><Check aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />{b}</li>)}</ul>
          </div>
          <div className="rounded-3xl border border-subtle bg-white p-7 shadow-card">
            <h3 className="text-2xl">Hradíte vy</h3>
            <ul className="mt-5 space-y-3">{costs.map((c) => <li key={c} className="flex gap-3"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-green-950" />{c}</li>)}</ul>
          </div>
        </div>
      </Section>
      <Section id="pravidla" title="Pravidlá spolupráce">
        <dl className="grid gap-5 sm:grid-cols-2">
          {rules.map((r) => (
            <div key={r.title} className="rounded-2xl border border-subtle bg-white p-6 shadow-card">
              <dt className="font-display text-xl font-bold">{r.title}</dt>
              <dd className="mt-2 text-muted">{r.text}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/kariera/kalkulacka-prijmu/">Spočítať môj príjem</ButtonLink>
          <ButtonLink href="/kariera/#rozhovor" variant="secondary">Dohodnúť rozhovor</ButtonLink>
        </div>
      </Section>
    </>
  );
}
