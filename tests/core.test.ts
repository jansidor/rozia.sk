import { describe, expect, it } from 'vitest';
import { calculateIncome, shareFor } from '../lib/income';
import { estimate, weightedMedian } from '../lib/valuation';
import { date, eur, eurPerM2, normalizePhone } from '../lib/format';
import { propertySchema, valuationLeadSchema } from '../lib/schemas';
import { guessLocality } from '../lib/localities';

const base = { startGci12m: 0, costPerDeal: 0 };

describe('kalkulačka príjmu (príklady zo špecifikácie)', () => {
  it('hranice podielov', () => {
    expect(shareFor(19_999)).toBe(0.6);
    expect(shareFor(20_000)).toBe(0.7);
    expect(shareFor(40_000)).toBe(0.7);
    expect(shareFor(40_001)).toBe(0.8);
  });
  it('nováčik, 1. rok: 5 × 155 000 € × 3 %', () => {
    const r = calculateIncome({ ...base, deals: 5, price: 155_000, commissionRate: 0.03, mode: 'first-year' });
    expect(r.gross).toBeCloseTo(23_250);
    expect(r.agentPayout).toBeCloseTo(13_950);
    expect(r.fees).toBe(441);
    expect(r.net).toBeCloseTo(13_509);
  });
  it('skúsený, 1. rok od 0: 12 × 170 000 € × 3,5 %', () => {
    const r = calculateIncome({ ...base, deals: 12, price: 170_000, commissionRate: 0.035, mode: 'first-year' });
    expect(r.dealsByShare.map((d) => d.deals)).toEqual([4, 3, 5]);
    expect(r.agentPayout).toBeCloseTo(50_575);
    expect(r.net).toBeCloseTo(50_134);
    expect(r.effectiveShare * 100).toBeCloseTo(70.8, 1);
  });
  it('skúsený, ustálený stav', () => {
    const r = calculateIncome({ ...base, deals: 12, price: 170_000, commissionRate: 0.035, mode: 'steady' });
    expect(r.agentPayout).toBeCloseTo(57_120);
    expect(r.net).toBeCloseTo(56_532);
  });
});

describe('odhad ceny', () => {
  const input = { areaM2: 68, floor: 2, hasElevator: true, condition: 'ciastocna-rekonstrukcia' as const, yearBuilt: 1985, balcony: false, cellar: false, parking: false };
  const comps = (n: number) => Array.from({ length: n }, (_, i) => ({ pricePerM2: 2000 + i * 50, source: 'listing' as const }));
  it('menej ako 5 porovnaní → ocenenie maklérom, žiadne číslo', () => {
    expect(estimate(input, comps(4))).toEqual({ kind: 'agent', reason: 'not-enough-data' });
  });
  it('5–9 porovnaní → ±10 %, 10 a viac → ±7 %', () => {
    const a = estimate(input, comps(6));
    const b = estimate(input, comps(12));
    expect(a.kind === 'range' && a.uncertainty).toBe(0.1);
    expect(b.kind === 'range' && b.uncertainty).toBe(0.07);
    if (b.kind === 'range') expect(b.low).toBeLessThan(b.high);
  });
  it('vážený medián: predaje majú váhu 2', () => {
    expect(weightedMedian([{ value: 1, weight: 1 }, { value: 2, weight: 2 }, { value: 3, weight: 1 }])).toBe(2);
  });
});

describe('formáty a validácia', () => {
  it('ceny s nezlomiteľnou medzerou', () => {
    expect(eur(159000)).toBe('159 000 €');
    expect(eurPerM2(3293)).toBe('3 293 €/m²');
    expect(date('2026-11-20')).toBe('20. 11. 2026');
  });
  it('telefón', () => {
    expect(normalizePhone('0905 123 456')).toBe('+421 905 123 456');
    expect(normalizePhone('+421905123456')).toBe('+421 905 123 456');
    expect(normalizePhone('044 123 456')).toBeNull();
  });
  it('GDPR súhlas je povinný a nikdy nie je implicitný', () => {
    const data = { address: 'Bystrická cesta 12', locality: 'ruzomberok/klacno', type: 'byty', areaM2: '68', condition: 'povodny', name: 'Test', phone: '0905123456', timing: 'do-roka' };
    expect(valuationLeadSchema.safeParse(data).success).toBe(false);
    expect(valuationLeadSchema.safeParse({ ...data, gdpr: 'on' }).success).toBe(true);
    expect(propertySchema.safeParse(data).success).toBe(true);
  });
  it('rozpoznanie lokality z adresy', () => {
    expect(guessLocality('Klačno 5, Ružomberok')).toBe('ruzomberok/klacno');
    expect(guessLocality('Hlavná 1, Liptovsky Mikulas')).toBe('liptovsky-mikulas');
    expect(guessLocality('Bratislava')).toBeNull();
  });
});
