/**
 * Geografia Liptova pre routing, filtre a mapu. Súradnice sú približné stredy
 * lokalít (len na vycentrovanie mapy), nie hranice.
 */
export interface Part {
  slug: string;
  name: string;
  /** Lokál: „na Klačne“ */
  locative: string;
  lat: number;
  lng: number;
}
export interface City {
  slug: string;
  name: string;
  /** Lokál: „v Ružomberku“ */
  locative: string;
  lat: number;
  lng: number;
  zoom: number;
  /** Automatický odhad ceny bytov sa počíta len tam, kde býva dosť porovnaní. */
  autoValuation: boolean;
  parts: Part[];
}

export const cities: City[] = [
  {
    slug: 'ruzomberok', name: 'Ružomberok', locative: 'v Ružomberku', lat: 49.0748, lng: 19.3075, zoom: 12.5, autoValuation: true,
    parts: [
      { slug: 'klacno', name: 'Klačno', locative: 'na Klačne', lat: 49.0672, lng: 19.2885 },
      { slug: 'roven', name: 'Roveň', locative: 'na Rovni', lat: 49.0853, lng: 19.2975 },
      { slug: 'plavisko', name: 'Plavisko', locative: 'na Plavisku', lat: 49.0725, lng: 19.3185 },
    ],
  },
  {
    slug: 'liptovsky-mikulas', name: 'Liptovský Mikuláš', locative: 'v Liptovskom Mikuláši', lat: 49.0833, lng: 19.6122, zoom: 12.5, autoValuation: true,
    parts: [
      { slug: 'podbreziny', name: 'Podbreziny', locative: 'na Podbrezinách', lat: 49.0795, lng: 19.6465 },
      { slug: 'paludzka', name: 'Palúdzka', locative: 'v Palúdzke', lat: 49.0775, lng: 19.5865 },
    ],
  },
  { slug: 'liptovsky-hradok', name: 'Liptovský Hrádok', locative: 'v Liptovskom Hrádku', lat: 49.039, lng: 19.7235, zoom: 13, autoValuation: false, parts: [] },
  { slug: 'jasna', name: 'Jasná', locative: 'v Jasnej', lat: 48.972, lng: 19.583, zoom: 12.5, autoValuation: false, parts: [] },
  { slug: 'liptovska-mara', name: 'Liptovská Mara', locative: 'pri Liptovskej Mare', lat: 49.105, lng: 19.52, zoom: 11.5, autoValuation: false, parts: [] },
  { slug: 'besenova', name: 'Bešeňová', locative: 'v Bešeňovej', lat: 49.101, lng: 19.436, zoom: 13, autoValuation: false, parts: [] },
];

export const LIPTOV_CENTER = { lat: 49.07, lng: 19.5, zoom: 9.6 };

export const getCity = (slug: string) => cities.find((c) => c.slug === slug) ?? null;
export function getPart(citySlug: string, partSlug: string) {
  return getCity(citySlug)?.parts.find((p) => p.slug === partSlug) ?? null;
}
export function localityName(citySlug: string, partSlug?: string | null): string {
  const city = getCity(citySlug);
  if (!city) return citySlug;
  const part = partSlug ? city.parts.find((p) => p.slug === partSlug) : null;
  return part ? `${part.name}, ${city.name}` : city.name;
}

/** Všetky voľby pre select „Obec / časť“ vo formulároch. Hodnota: „mesto“ alebo „mesto/cast“. */
export function localityOptions(): { value: string; label: string }[] {
  return cities.flatMap((c) => [
    { value: c.slug, label: c.name },
    ...c.parts.map((p) => ({ value: `${c.slug}/${p.slug}`, label: `${c.name} – ${p.name}` })),
  ]);
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pokus o rozpoznanie lokality z voľne zadanej adresy („Bystrická cesta 12, Ružomberok“). */
export function guessLocality(address: string): string | null {
  const a = strip(address);
  for (const c of cities) for (const p of c.parts) if (a.includes(strip(p.name))) return `${c.slug}/${p.slug}`;
  for (const c of cities) if (a.includes(strip(c.name))) return c.slug;
  return null;
}
