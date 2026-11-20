import { pageMeta } from '@/lib/meta';
import { calculateIncome } from '@/lib/income';
import { eur, pct } from '@/lib/format';
import { PageHeader, Section } from '@/components/page-header';
import { IncomeCalculator, IncomeFormula } from '@/components/income-calculator';
import { ButtonLink } from '@/components/ui/button';

export const metadata = pageMeta({
  title: 'Kalkulačka príjmu realitného makléra',
  description: 'Koľko zarobí realitný maklér na Liptove? Zadajte počet obchodov, cenu a províziu. Kalkulačka prepočíta progresívny podiel 60/70/80 % podľa zverejneného vzorca.',
  path: '/kariera/kalkulacka-prijmu/',
});

/** Modelové príklady sa počítajú tým istým vzorcom ako kalkulačka – jeden zdroj pravdy. */
const examples = [
  { name: 'Nováčik, 1. rok', input: { deals: 5, price: 155_000, commissionRate: 0.03, startGci12m: 0, costPerDeal: 0, mode: 'first-year' as const } },
  { name: 'Skúsený maklér, 1. rok v Rozii', input: { deals: 12, price: 170_000, commissionRate: 0.035, startGci12m: 0, costPerDeal: 0, mode: 'first-year' as const } },
  { name: 'Skúsený maklér, ustálený stav', input: { deals: 12, price: 170_000, commissionRate: 0.035, startGci12m: 0, costPerDeal: 0, mode: 'steady' as const } },
];

export default function CalculatorPage() {
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kariéra', path: '/kariera/' }, { name: 'Kalkulačka príjmu', path: '/kariera/kalkulacka-prijmu/' }]} title="Kalkulačka príjmu makléra" lead="Podiel 60, 70 a 80 % podľa vašej produkcie za 12 mesiacov. Vzorec je celý na tejto stránke." />
      <Section id="kalkulacka"><IncomeCalculator /></Section>
      <Section id="vzorec" tone="surface" title="Ako to počítame">
        <div className="grid gap-6 lg:grid-cols-2">
          <IncomeFormula />
          <div className="min-w-0 rounded-3xl border border-subtle bg-white p-6 shadow-card sm:p-8">
            <h3 className="text-xl">Modelové príklady</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="tabular w-full min-w-[30rem] text-left text-[15px]">
                <caption className="sr-only">Modelové príklady príjmu makléra, bez DPH, pred zdanením a odvodmi</caption>
                <thead className="text-sm text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Scenár</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Hrubá provízia</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Efektívny podiel</th>
                    <th scope="col" className="py-2 text-right font-medium">Čistý pred zdanením</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((e) => {
                    const r = calculateIncome(e.input);
                    return (
                      <tr key={e.name} className="border-t border-subtle align-top">
                        <th scope="row" className="py-3 pr-3 font-medium">
                          {e.name}
                          <span className="block text-sm font-normal text-muted">{e.input.deals} × {eur(e.input.price)} × {pct(e.input.commissionRate * 100, 1)}</span>
                        </th>
                        <td className="py-3 pr-3 text-right">{eur(r.gross)}</td>
                        <td className="py-3 pr-3 text-right">{pct(r.effectiveShare * 100, 1)}</td>
                        <td className="py-3 text-right font-semibold">{eur(r.net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted">
              Ukazujeme modelové výpočty, nie výsledky najlepšieho makléra. Keď budeme mať dáta tímu, zverejníme mediány, nie priemery.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/kariera/#rozhovor">Dohodnúť 20-minútový rozhovor</ButtonLink>
          <ButtonLink href="/kariera/model-spoluprace/" variant="secondary">Model spolupráce</ButtonLink>
        </div>
      </Section>
    </>
  );
}
