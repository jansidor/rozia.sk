/**
 * Jediný zdroj pravdy pre identitu a obchodné parametre Rozie.
 * Hodnota `null` = údaj zatiaľ nemáme → príslušný blok sa na webe NEZOBRAZÍ
 * (žiadne vymyslené čísla v produkcii). Doplňte pred spustením.
 */
export const site = {
  name: 'Rozia',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rozia.sk').replace(/\/$/, ''),
  email: 'info@rozia.sk',
  /** Hlavný telefón v tvare „+421 9xx xxx xxx“. */
  phone: null as string | null,
  city: 'Ružomberok',
  /** Provízia v % z predajnej ceny vrátane DPH (blok transparentnosti). */
  commissionPercent: null as number | null,
  /** Zákonná identifikácia (§ 4 zák. 22/2004 Z. z.). */
  legal: {
    companyName: null as string | null,
    seat: null as string | null,
    ico: null as string | null,
    dic: null as string | null,
    icDph: null as string | null,
    register: null as string | null,
    supervisor:
      'Slovenská obchodná inšpekcia, Inšpektorát SOI pre Žilinský kraj, Predmestská 71, 011 79 Žilina',
  },
  /** Koľko predajov so súhlasom klienta treba, aby sa ukázal pás dôkazov. */
  minSalesForStats: 5,
  /** Model spolupráce s maklérmi – vstupy kalkulačky príjmu. */
  career: {
    tiers: [
      { upTo: 20_000, share: 0.6 },
      { upTo: 40_000, share: 0.7 },
      { upTo: Infinity, share: 0.8 },
    ],
    monthlyFee: 49,
    freeMonths: 3,
  },
} as const;

export type Site = typeof site;
export const legalReady = Boolean(site.legal.companyName && site.legal.ico && site.legal.seat);
