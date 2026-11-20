export type Transaction = 'predaj' | 'prenajom';
export type PropertyType = 'byty' | 'domy' | 'chaty' | 'apartmany' | 'pozemky';
export type ListingStatus = 'active' | 'reserved' | 'sold';
export type Condition = 'povodny' | 'ciastocna-rekonstrukcia' | 'rekonstrukcia' | 'novostavba';

export const PROPERTY_TYPES: Record<PropertyType, { label: string; plural: string }> = {
  byty: { label: 'Byt', plural: 'Byty' },
  domy: { label: 'Dom', plural: 'Domy' },
  chaty: { label: 'Chata', plural: 'Chaty' },
  apartmany: { label: 'Apartmán', plural: 'Apartmány' },
  pozemky: { label: 'Pozemok', plural: 'Pozemky' },
};

export const TRANSACTIONS: Record<Transaction, { label: string; noun: string }> = {
  predaj: { label: 'Predaj', noun: 'na predaj' },
  prenajom: { label: 'Prenájom', noun: 'na prenájom' },
};

export const CONDITIONS: Record<Condition, string> = {
  povodny: 'Pôvodný stav',
  'ciastocna-rekonstrukcia': 'Čiastočná rekonštrukcia',
  rekonstrukcia: 'Kompletná rekonštrukcia',
  novostavba: 'Novostavba',
};

export interface Agent {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  /** Priamy telefón makléra – povinný, nikdy len info@. */
  phone: string;
  email: string | null;
  area: string;
  bio: string | null;
  soldLast12m: number | null;
}

export interface Photo {
  url: string;
  alt: string;
  blurDataUrl: string | null;
}

export interface Listing {
  id: number;
  slug: string;
  title: string;
  transaction: Transaction;
  type: PropertyType;
  citySlug: string;
  partSlug: string | null;
  localityLabel: string;
  price: number;
  previousPrice: number | null;
  areaM2: number;
  rooms: number | null;
  floor: number | null;
  condition: Condition | null;
  /** null = energetický certifikát nie je vyhotovený. */
  energyClass: string | null;
  description: string;
  features: string[];
  photos: Photo[];
  status: ListingStatus;
  publishedAt: string;
  updatedAt: string;
  lat: number | null;
  lng: number | null;
  agent: Agent | null;
}

/** Predaná nehnuteľnosť – zverejňuje sa len so súhlasom klienta. */
export interface Sale {
  id: number;
  title: string;
  type: PropertyType;
  citySlug: string;
  partSlug: string | null;
  localityLabel: string;
  areaM2: number | null;
  rooms: number | null;
  daysOnMarket: number;
  pctOfAskingPrice: number;
  soldAt: string;
  photo: Photo | null;
}

/** Riadok cenovej mapy: medián €/m² za lokalitu a štvrťrok. */
export interface PriceStat {
  citySlug: string;
  partSlug: string | null;
  rooms: number | null;
  condition: Condition | null;
  medianPerM2: number;
  sampleSize: number;
  period: string;
  updatedAt: string;
}

export interface Comparable {
  pricePerM2: number;
  source: 'sale' | 'listing';
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string | null;
  publishedAt: string;
  updatedAt: string;
}

export interface LocalityInfo {
  citySlug: string;
  partSlug: string | null;
  schools: string | null;
  transport: string | null;
  parking: string | null;
  housing: string | null;
  agentComment: string | null;
  agent: Agent | null;
  faq: { q: string; a: string }[];
  updatedAt: string;
}

export interface TrustStats {
  soldLast12m: number;
  medianDays: number;
  avgPctOfAsking: number;
}
