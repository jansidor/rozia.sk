import Link from 'next/link';
import type { PriceStat } from '@/lib/types';
import { CONDITIONS } from '@/lib/types';
import { eurPerM2 } from '@/lib/format';
import { getCity, localityName } from '@/lib/localities';

/** „2026-Q4“ → „4. štvrťrok 2026“ */
export const periodLabel = (p: string) => {
  const [y, q] = p.split('-Q');
  return `${q}. štvrťrok ${y}`;
};

/** Prehľad mediánov za lokality (riadky bez členenia na izby/stav). */
export function LocalityPriceTable({ stats }: { stats: PriceStat[] }) {
  const rows = stats.filter((s) => s.rooms === null && s.condition === null).sort((a, b) => b.medianPerM2 - a.medianPerM2);
  return (
    <div className="overflow-x-auto rounded-2xl border border-subtle bg-white">
      <table className="tabular w-full min-w-[26rem] text-left">
        <caption className="sr-only">Medián ponukovej ceny bytov v €/m² podľa lokality</caption>
        <thead className="bg-surface text-sm text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Lokalita</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Medián €/m²</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Počet ponúk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const city = getCity(s.citySlug);
            const path = `/lokality/${s.citySlug}/${s.partSlug ? `${s.partSlug}/` : ''}`;
            return (
              <tr key={`${s.citySlug}/${s.partSlug}`} className="border-t border-subtle">
                <th scope="row" className="px-4 py-1 font-medium">
                  {city ? (
                    <Link href={path} className="inline-flex min-h-11 items-center text-green-700 underline underline-offset-4 hover:text-green-950">
                      {localityName(s.citySlug, s.partSlug)}
                    </Link>
                  ) : s.citySlug}
                </th>
                <td className="px-4 py-3 text-right font-semibold">{eurPerM2(s.medianPerM2)}</td>
                <td className="px-4 py-3 text-right text-muted">{s.sampleSize}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Členenie jednej lokality podľa izieb a stavu. */
export function BreakdownTable({ stats }: { stats: PriceStat[] }) {
  const rows = stats.filter((s) => s.rooms !== null || s.condition !== null).sort((a, b) => (a.rooms ?? 0) - (b.rooms ?? 0));
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-2xl border border-subtle bg-white">
      <table className="tabular w-full min-w-[26rem] text-left">
        <caption className="sr-only">Medián €/m² podľa počtu izieb a stavu</caption>
        <thead className="bg-surface text-sm text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Izby</th>
            <th scope="col" className="px-4 py-3 font-medium">Stav</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Medián €/m²</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Vzorka</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i} className="border-t border-subtle">
              <th scope="row" className="px-4 py-3 font-medium">{s.rooms ? `${s.rooms}-izbový` : 'Všetky'}</th>
              <td className="px-4 py-3">{s.condition ? CONDITIONS[s.condition] : 'Všetky'}</td>
              <td className="px-4 py-3 text-right font-semibold">{eurPerM2(s.medianPerM2)}</td>
              <td className="px-4 py-3 text-right text-muted">{s.sampleSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
