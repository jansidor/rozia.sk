/**
 * UKÁŽKOVÉ DÁTA – len na vývoj a dizajnové náhľady (ROZIA_DEMO_DATA=1).
 * V produkcii (VERCEL_ENV=production) sa nikdy nenačítajú, pozri lib/data.ts.
 * Mená, ceny aj predaje sú vymyslené.
 */
import type { Agent, Listing, PriceStat, Sale, Comparable, LocalityInfo, Article } from './types';

const now = '2026-11-18T09:00:00Z';

export const demoAgents: Agent[] = [
  { id: 'a1', slug: 'ukazka-jana-novakova', name: 'Jana Nováková (ukážka)', photoUrl: null, phone: '+421 900 000 001', email: null, area: 'Ružomberok a okolie', bio: 'Ukážkový profil makléra. Skutočné profily sa načítajú zo Supabase.', soldLast12m: 14 },
  { id: 'a2', slug: 'ukazka-peter-kovac', name: 'Peter Kováč (ukážka)', photoUrl: null, phone: '+421 900 000 002', email: null, area: 'Liptovský Mikuláš a Jasná', bio: 'Ukážkový profil makléra.', soldLast12m: 9 },
  { id: 'a3', slug: 'ukazka-maria-hruba', name: 'Mária Hrubá (ukážka)', photoUrl: null, phone: '+421 900 000 003', email: null, area: 'Liptovská Mara a Bešeňová', bio: 'Ukážkový profil makléra.', soldLast12m: null },
];
const [a1, a2, a3] = demoAgents as [Agent, Agent, Agent];

const L = (l: Partial<Listing> & Pick<Listing, 'id' | 'slug' | 'title' | 'type' | 'citySlug' | 'localityLabel' | 'price' | 'areaM2'>): Listing => ({
  transaction: 'predaj', partSlug: null, previousPrice: null, rooms: null, floor: null, condition: null, energyClass: null,
  description: 'Ukážkový popis nehnuteľnosti. Skutočné inzeráty sa načítajú zo Supabase.',
  features: [], photos: [], status: 'active', publishedAt: now, updatedAt: now, lat: null, lng: null, agent: a1, ...l,
});

export const demoListings: Listing[] = [
  L({ id: 1001, slug: '3-izbovy-byt-klacno-ruzomberok', title: '3-izbový byt s loggiou', type: 'byty', citySlug: 'ruzomberok', partSlug: 'klacno', localityLabel: 'Klačno, Ružomberok', price: 159000, areaM2: 68, rooms: 3, floor: 4, condition: 'rekonstrukcia', energyClass: 'C', features: ['Loggia', 'Pivnica', 'Výťah'], lat: 49.0672, lng: 19.2885 }),
  L({ id: 1002, slug: '2-izbovy-byt-roven-ruzomberok', title: '2-izbový byt po rekonštrukcii', type: 'byty', citySlug: 'ruzomberok', partSlug: 'roven', localityLabel: 'Roveň, Ružomberok', price: 118000, previousPrice: 124900, areaM2: 54, rooms: 2, floor: 2, condition: 'rekonstrukcia', energyClass: null, lat: 49.0853, lng: 19.2975 }),
  L({ id: 1003, slug: '3-izbovy-byt-podbreziny-liptovsky-mikulas', title: '3-izbový byt s balkónom', type: 'byty', citySlug: 'liptovsky-mikulas', partSlug: 'podbreziny', localityLabel: 'Podbreziny, Liptovský Mikuláš', price: 158000, areaM2: 74, rooms: 3, floor: 6, condition: 'ciastocna-rekonstrukcia', energyClass: 'D', status: 'reserved', agent: a2, lat: 49.0795, lng: 19.6465 }),
  L({ id: 1004, slug: 'apartman-jasna', title: 'Apartmán pri zjazdovke', type: 'apartmany', citySlug: 'jasna', localityLabel: 'Jasná, Demänovská Dolina', price: 249000, areaM2: 46, rooms: 2, condition: 'novostavba', energyClass: 'A1', agent: a2, lat: 48.972, lng: 19.583, publishedAt: '2026-11-16T09:00:00Z' }),
  L({ id: 1005, slug: 'chata-liptovska-mara', title: 'Chata s výhľadom na vodu', type: 'chaty', citySlug: 'liptovska-mara', localityLabel: 'Liptovská Mara', price: 189000, areaM2: 82, rooms: 4, agent: a3, lat: 49.105, lng: 19.52 }),
  L({ id: 1006, slug: 'rodinny-dom-liptovsky-hradok', title: 'Rodinný dom so záhradou', type: 'domy', citySlug: 'liptovsky-hradok', localityLabel: 'Liptovský Hrádok', price: 265000, areaM2: 142, rooms: 5, condition: 'ciastocna-rekonstrukcia', energyClass: 'E', agent: a2, lat: 49.039, lng: 19.7235 }),
  L({ id: 1007, slug: 'pozemok-besenova', title: 'Stavebný pozemok', type: 'pozemky', citySlug: 'besenova', localityLabel: 'Bešeňová', price: 74000, areaM2: 620, agent: a3, lat: 49.101, lng: 19.436 }),
  L({ id: 1008, slug: '2-izbovy-byt-paludzka-prenajom', title: '2-izbový byt v novostavbe', transaction: 'prenajom', type: 'byty', citySlug: 'liptovsky-mikulas', partSlug: 'paludzka', localityLabel: 'Palúdzka, Liptovský Mikuláš', price: 650, areaM2: 52, rooms: 2, floor: 1, condition: 'novostavba', energyClass: 'A0', agent: a2, lat: 49.0775, lng: 19.5865 }),
];

const S = (s: Omit<Sale, 'photo'>): Sale => ({ ...s, photo: null });
export const demoSales: Sale[] = [
  S({ id: 1, title: '3-izbový byt', type: 'byty', citySlug: 'ruzomberok', partSlug: 'klacno', localityLabel: 'Klačno, Ružomberok', areaM2: 70, rooms: 3, daysOnMarket: 38, pctOfAskingPrice: 98.1, soldAt: '2026-10-14' }),
  S({ id: 2, title: '2-izbový byt', type: 'byty', citySlug: 'ruzomberok', partSlug: 'roven', localityLabel: 'Roveň, Ružomberok', areaM2: 52, rooms: 2, daysOnMarket: 51, pctOfAskingPrice: 96.4, soldAt: '2026-09-02' }),
  S({ id: 3, title: 'Apartmán', type: 'apartmany', citySlug: 'jasna', partSlug: null, localityLabel: 'Jasná', areaM2: 41, rooms: 2, daysOnMarket: 74, pctOfAskingPrice: 95.0, soldAt: '2026-08-20' }),
  S({ id: 4, title: '3-izbový byt', type: 'byty', citySlug: 'liptovsky-mikulas', partSlug: 'podbreziny', localityLabel: 'Podbreziny, Liptovský Mikuláš', areaM2: 74, rooms: 3, daysOnMarket: 45, pctOfAskingPrice: 97.2, soldAt: '2026-07-11' }),
  S({ id: 5, title: 'Rodinný dom', type: 'domy', citySlug: 'liptovsky-hradok', partSlug: null, localityLabel: 'Liptovský Hrádok', areaM2: 130, rooms: 4, daysOnMarket: 96, pctOfAskingPrice: 93.5, soldAt: '2026-05-30' }),
  S({ id: 6, title: '1-izbový byt', type: 'byty', citySlug: 'ruzomberok', partSlug: 'plavisko', localityLabel: 'Plavisko, Ružomberok', areaM2: 36, rooms: 1, daysOnMarket: 29, pctOfAskingPrice: 99.0, soldAt: '2026-04-08' }),
];

const P = (citySlug: string, partSlug: string | null, medianPerM2: number, sampleSize: number, rooms: number | null = null, condition: PriceStat['condition'] = null): PriceStat =>
  ({ citySlug, partSlug, rooms, condition, medianPerM2, sampleSize, period: '2026-Q4', updatedAt: now });
export const demoPriceStats: PriceStat[] = [
  P('ruzomberok', null, 2350, 61), P('ruzomberok', 'klacno', 2290, 18), P('ruzomberok', 'roven', 2180, 14), P('ruzomberok', 'plavisko', 2410, 9),
  P('liptovsky-mikulas', null, 2760, 120), P('liptovsky-mikulas', 'podbreziny', 2190, 31), P('liptovsky-mikulas', 'paludzka', 3350, 22),
  P('liptovsky-hradok', null, 2050, 12), P('jasna', null, 5200, 27), P('liptovska-mara', null, 2900, 8), P('besenova', null, 2700, 11),
  P('ruzomberok', 'klacno', 2480, 4, 2, 'rekonstrukcia'), P('ruzomberok', 'klacno', 2150, 6, 3, 'povodny'), P('ruzomberok', 'klacno', 2380, 5, 3, 'rekonstrukcia'),
];

export const demoComparables: Record<string, Comparable[]> = {
  'ruzomberok/klacno': [2100, 2190, 2250, 2290, 2310, 2340, 2380, 2400, 2450, 2500, 2560].map((v, i) => ({ pricePerM2: v, source: i % 3 === 0 ? 'sale' : 'listing' })),
  'ruzomberok/roven': [2050, 2120, 2180, 2230, 2300, 2360].map((v) => ({ pricePerM2: v, source: 'listing' })),
};

export const demoLocalityInfo: LocalityInfo[] = [
  { citySlug: 'ruzomberok', partSlug: 'klacno', schools: 'Ukážkový text o školách a škôlkach v lokalite.', transport: 'Ukážkový text o MHD.', parking: 'Ukážkový text o parkovaní.', housing: 'Ukážkový text o type domov a rokoch výstavby.', agentComment: 'Ukážkový komentár miestneho makléra.', agent: a1, faq: [{ q: 'Ukážková otázka?', a: 'Ukážková odpoveď.' }], updatedAt: now },
];

export const demoArticles: Article[] = [
  { slug: 'ukazka-ako-predat-byt', title: 'Ukážkový článok: ako predať byt na Liptove', excerpt: 'Ukážkový perex. Skutočné články sa načítajú zo Supabase.', body: '## Ukážkový nadpis\n\nUkážkový odsek textu.\n\n## Druhý nadpis\n\nĎalší ukážkový odsek.', author: 'Rozia', publishedAt: now, updatedAt: now },
];
