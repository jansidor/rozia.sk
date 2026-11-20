'use client';

import { useId, useState } from 'react';
import { calculateIncome } from '@/lib/income';
import { site } from '@/lib/site';
import { eur, pct } from '@/lib/format';
import { inputStyles } from './ui/field';
import { cn } from '@/lib/cn';

const PRESETS = [
  { label: 'Ružomberok, byt', price: 160_000 },
  { label: 'Liptovský Mikuláš, byt', price: 178_000 },
  { label: 'Jasná, apartmán', price: 250_000 },
];
const DISCLAIMER =
  'Modelový výpočet. Nie je prísľubom príjmu. Skutočný výsledok závisí od počtu a hodnoty uzavretých obchodov. Čísla sú pred zdanením a odvodmi.';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

export function IncomeCalculator() {
  const id = useId();
  const [deals, setDeals] = useState(8);
  const [price, setPrice] = useState(165_000);
  const [rate, setRate] = useState(3);
  const [startGci, setStartGci] = useState(0);
  const [cost, setCost] = useState(0);
  const [mode, setMode] = useState<'first-year' | 'steady'>('first-year');

  const r = calculateIncome({
    deals,
    price: clamp(price, 30_000, 1_000_000),
    commissionRate: clamp(rate, 1.5, 6) / 100,
    startGci12m: clamp(startGci, 0, 200_000),
    costPerDeal: clamp(cost, 0, 2_000),
    mode,
  });
  const label = 'mb-1.5 block text-sm font-medium';
  const { monthlyFee, freeMonths } = site.career;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <form className="rounded-3xl border border-subtle bg-white p-6 shadow-card sm:p-8" onSubmit={(e) => e.preventDefault()}>
        <h3 className="text-xl">Vaše vstupy</h3>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-n`} className="text-sm font-medium">Počet obchodov za rok</label>
            <output htmlFor={`${id}-n`} className="tabular font-display text-3xl font-bold">{deals}</output>
          </div>
          <input id={`${id}-n`} type="range" min={1} max={40} step={1} value={deals} onChange={(e) => setDeals(Number(e.target.value))} className="mt-2 h-11 w-full cursor-pointer" />
          <div aria-hidden className="tabular flex justify-between text-xs text-muted"><span>1</span><span>40</span></div>
        </div>

        <div className="mt-5">
          <label htmlFor={`${id}-p`} className={label}>Priemerná predajná cena (€)</label>
          <input id={`${id}-p`} type="number" inputMode="numeric" min={30000} max={1000000} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={cn(inputStyles, 'tabular')} />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" aria-pressed={price === p.price} onClick={() => setPrice(p.price)} className="min-h-11 rounded-full border border-control px-3.5 text-sm font-medium hover:bg-green-50 aria-pressed:border-2 aria-pressed:border-green-950 aria-pressed:bg-green-50">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-r`} className={label}>Provízia RK z ceny bez DPH (%)</label>
            <input id={`${id}-r`} type="number" inputMode="decimal" min={1.5} max={6} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className={cn(inputStyles, 'tabular')} />
          </div>
          <div>
            <label htmlFor={`${id}-m`} className={label}>Vlastné náklady na obchod (€)</label>
            <input id={`${id}-m`} type="number" inputMode="numeric" min={0} max={2000} step={50} value={cost} onChange={(e) => setCost(Number(e.target.value))} className={cn(inputStyles, 'tabular')} />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">Rok simulácie</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['first-year', '1. rok v Rozii'], ['steady', 'Ustálený stav']] as const).map(([v, l]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-control px-3.5 text-sm font-medium has-[:checked]:border-2 has-[:checked]:border-green-950 has-[:checked]:bg-green-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-950">
                <input type="radio" name={`${id}-mode`} value={v} checked={mode === v} onChange={() => setMode(v)} className="size-5" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        {mode === 'first-year' && (
          <div className="mt-5">
            <label htmlFor={`${id}-g`} className={label}>Vaša hrubá provízia za posledných 12 mesiacov pri štarte (€)</label>
            <input id={`${id}-g`} type="number" inputMode="numeric" min={0} max={200000} step={1000} value={startGci} onChange={(e) => setStartGci(Number(e.target.value))} aria-describedby={`${id}-g-hint`} className={cn(inputStyles, 'tabular')} />
            <p id={`${id}-g-hint`} className="mt-1.5 text-sm text-muted">Ak prichádzate s doloženou produkciou, začínate na vyššom podiele.</p>
          </div>
        )}
      </form>

      <div className="on-dark flex flex-col rounded-3xl bg-green-950 p-6 text-white sm:p-8" aria-live="polite">
        <h3 className="text-xl">Modelový výsledok</h3>
        <p className="mt-6 text-sm text-white/85">Čistý príjem pred zdanením a odvodmi</p>
        <p className="tabular font-display text-5xl font-bold text-green-400 sm:text-6xl">{eur(r.net)}</p>
        <p className="tabular mt-1 text-lg text-white/90">ročne · v priemere {eur(r.netMonthly)} mesačne</p>

        <dl className="tabular mt-8 divide-y divide-white/15 border-y border-white/15 text-[15px]">
          {[
            ['Hrubá provízia z obchodov', eur(r.gross)],
            ['Vaša výplata z provízií', eur(r.agentPayout)],
            ['Efektívny podiel', pct(r.effectiveShare * 100, 1)],
            [`Poplatok za platformu (${r.paidMonths} × ${monthlyFee} €)`, `− ${eur(r.fees)}`],
            ['Vlastné náklady na obchody', `− ${eur(r.costs)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-white/85">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <table className="tabular mt-6 w-full text-left text-[15px]">
          <caption className="mb-2 text-left text-sm text-white/85">Ako sa váš podiel menil počas roka</caption>
          <thead className="text-sm text-white/85">
            <tr>
              <th scope="col" className="py-1.5 font-medium">Podiel</th>
              <th scope="col" className="py-1.5 font-medium">Obchody</th>
              <th scope="col" className="py-1.5 text-right font-medium">Výplata</th>
            </tr>
          </thead>
          <tbody>
            {r.dealsByShare.map((row) => (
              <tr key={row.share} className="border-t border-white/15">
                <th scope="row" className="py-2 font-semibold text-green-400">{pct(row.share * 100)}</th>
                <td className="py-2">{row.deals}</td>
                <td className="py-2 text-right">{eur(row.payout)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-sm text-white/85">
          {DISCLAIMER} Náklady môžu prevýšiť príjem. Prvé mesiace bývajú pre nováčikov finančne slabé
          {freeMonths > 0 && <> – preto je poplatok za platformu prvé {freeMonths} mesiace 0&nbsp;€</>}.
        </p>
      </div>
    </div>
  );
}

export function IncomeFormula() {
  const { tiers, monthlyFee, freeMonths } = site.career;
  return (
    <div className="min-w-0 rounded-3xl border border-subtle bg-white p-6 shadow-card sm:p-8">
      <h3 className="text-xl">Vzorec, podľa ktorého počítame</h3>
      <ol className="mt-5 space-y-3 text-[15px]">
        <li><strong>Hrubá provízia obchodu</strong> = predajná cena × provízia RK (bez DPH).</li>
        <li>
          <strong>Váš podiel</strong> sa určí pri každom obchode podľa vašej hrubej provízie za predchádzajúcich 365 dní:
          <table className="tabular mt-3 w-full max-w-md text-left">
            <thead className="text-sm text-muted">
              <tr><th scope="col" className="py-1.5 font-medium">Hrubá provízia za 12 mesiacov</th><th scope="col" className="py-1.5 font-medium">Váš podiel</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-subtle"><td className="py-2">pod {eur(tiers[0].upTo)}</td><td className="py-2 font-semibold">{pct(tiers[0].share * 100)}</td></tr>
              <tr className="border-t border-subtle"><td className="py-2">{eur(tiers[0].upTo)} až {eur(tiers[1].upTo)}</td><td className="py-2 font-semibold">{pct(tiers[1].share * 100)}</td></tr>
              <tr className="border-t border-subtle"><td className="py-2">nad {eur(tiers[1].upTo)}</td><td className="py-2 font-semibold">{pct(tiers[2].share * 100)}</td></tr>
            </tbody>
          </table>
        </li>
        <li><strong>Výplata za obchod</strong> = hrubá provízia × váš podiel. Zvyšok je podiel Rozie.</li>
        <li>
          <strong>Čistý príjem pred zdanením</strong> = súčet výplat − poplatok za platformu ({monthlyFee}&nbsp;€ mesačne, prvé {freeMonths} mesiace 0&nbsp;€) − vaše náklady na obchody.
        </li>
        <li>Kalkulačka rozloží obchody rovnomerne do roka a po každom prepočíta váš podiel. Ak je Rozia platiteľ DPH, podiel sa počíta zo základu bez DPH.</li>
      </ol>
    </div>
  );
}
