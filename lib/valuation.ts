import type { Comparable, Condition } from './types';

/**
 * Rýchly odhad ceny bytu. Verzia tabuľky koeficientov sa ukladá ku každému leadu,
 * aby sa dal odhad spätne vysvetliť. Koeficienty sú východiskové odhady –
 * kalibrujte ich na vlastných predajoch (pozri README).
 */
export const VALUATION_VERSION = '2026-11-v1';

/** Pomer predajná/ponuková cena, kým nemáme ≥ 20 vlastných predajov. */
export const K_TRANS_DEFAULT = 0.95;
export const MIN_COMPARABLES = 5;

export const K_CONDITION: Record<Condition, number> = {
  povodny: 0.92,
  'ciastocna-rekonstrukcia': 0.98,
  rekonstrukcia: 1.05,
  novostavba: 1.12,
};

export interface ValuationInput {
  areaM2: number;
  floor: number | null;
  hasElevator: boolean;
  condition: Condition;
  yearBuilt: number | null;
  balcony: boolean;
  cellar: boolean;
  parking: boolean;
}

export type ValuationResult =
  | { kind: 'range'; low: number; high: number; mid: number; perM2: number; comparables: number; uncertainty: number; version: string }
  | { kind: 'agent'; reason: 'not-enough-data' | 'unsupported-type' | 'unsupported-locality' };

export function weightedMedian(items: { value: number; weight: number }[]): number | null {
  const sorted = items.filter((i) => i.weight > 0).sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return null;
  let acc = 0;
  for (const item of sorted) {
    acc += item.weight;
    if (acc >= total / 2) return item.value;
  }
  return sorted.at(-1)!.value;
}

export function coefficient(input: ValuationInput): number {
  let k = K_CONDITION[input.condition];
  if (input.floor !== null) {
    if (input.floor <= 0) k *= 0.96;
    else if (input.floor >= 5 && !input.hasElevator) k *= 0.94;
    else if (input.floor >= 3 && !input.hasElevator) k *= 0.97;
  }
  if (input.yearBuilt !== null && input.condition !== 'novostavba') {
    if (input.yearBuilt >= 2010) k *= 1.04;
    else if (input.yearBuilt < 1960) k *= 0.97;
  }
  if (input.balcony) k *= 1.02;
  if (input.cellar) k *= 1.01;
  if (input.parking) k *= 1.03;
  return k;
}

const round500 = (n: number) => Math.round(n / 500) * 500;

export function estimate(input: ValuationInput, comparables: Comparable[], kTrans = K_TRANS_DEFAULT): ValuationResult {
  if (comparables.length < MIN_COMPARABLES) return { kind: 'agent', reason: 'not-enough-data' };
  const base = weightedMedian(
    comparables.map((c) =>
      c.source === 'sale' ? { value: c.pricePerM2, weight: 2 } : { value: c.pricePerM2 * kTrans, weight: 1 },
    ),
  );
  if (base === null) return { kind: 'agent', reason: 'not-enough-data' };
  const uncertainty = comparables.length >= 10 ? 0.07 : 0.1;
  const mid = input.areaM2 * base * coefficient(input);
  return {
    kind: 'range',
    low: round500(mid * (1 - uncertainty)),
    high: round500(mid * (1 + uncertainty)),
    mid: round500(mid),
    perM2: Math.round(mid / input.areaM2),
    comparables: comparables.length,
    uncertainty,
    version: VALUATION_VERSION,
  };
}
