import { site } from './site';

export interface IncomeInput {
  /** N – počet obchodov za rok */
  deals: number;
  /** P – priemerná predajná cena */
  price: number;
  /** r – provízia RK z ceny bez DPH (0,03 = 3 %) */
  commissionRate: number;
  /** Produkcia (hrubá provízia) za 12 mesiacov pred štartom */
  startGci12m: number;
  /** M – vlastné náklady na obchod */
  costPerDeal: number;
  mode: 'first-year' | 'steady';
}

export interface IncomeResult {
  grossPerDeal: number;
  gross: number;
  agentPayout: number;
  companyDollar: number;
  effectiveShare: number;
  fees: number;
  costs: number;
  net: number;
  netMonthly: number;
  paidMonths: number;
  dealsByShare: { share: number; deals: number; payout: number }[];
}

/** Pod 20 000 € → 60 %, od 20 000 € do 40 000 € → 70 %, nad 40 000 € → 80 %. */
export function shareFor(gci12m: number): number {
  const [t1, t2, t3] = site.career.tiers;
  if (gci12m < t1.upTo) return t1.share;
  if (gci12m <= t2.upTo) return t2.share;
  return t3.share;
}

/**
 * Simuluje obchody rovnomerne v roku. Podiel každého obchodu sa určí podľa hrubej
 * provízie za predchádzajúcich 365 dní (GCI_12m) v momente vzniku nároku.
 * Produkcia spred štartu z okna postupne vypadáva (lineárne).
 */
export function calculateIncome(input: IncomeInput): IncomeResult {
  const { deals, price, commissionRate, startGci12m, costPerDeal, mode } = input;
  const G = price * commissionRate;
  const byShare = new Map<number, { deals: number; payout: number }>();
  let payout = 0;

  for (let i = 0; i < deals; i++) {
    const gci =
      mode === 'steady'
        ? deals * G
        : i * G + startGci12m * (1 - i / deals);
    const share = shareFor(gci);
    const a = G * share;
    payout += a;
    const row = byShare.get(share) ?? { deals: 0, payout: 0 };
    byShare.set(share, { deals: row.deals + 1, payout: row.payout + a });
  }

  const gross = deals * G;
  const paidMonths = mode === 'steady' ? 12 : 12 - site.career.freeMonths;
  const fees = paidMonths * site.career.monthlyFee;
  const costs = deals * costPerDeal;
  const net = payout - fees - costs;
  return {
    grossPerDeal: G,
    gross,
    agentPayout: payout,
    companyDollar: gross - payout,
    effectiveShare: gross > 0 ? payout / gross : 0,
    fees,
    costs,
    net,
    netMonthly: net / 12,
    paidMonths,
    dealsByShare: [...byShare.entries()].sort((a, b) => a[0] - b[0]).map(([share, v]) => ({ share, ...v })),
  };
}
