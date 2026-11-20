const NBSP = ' ';

function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 159 000 € (nezlomiteľné medzery) */
export const eur = (n: number) => `${group(n)}${NBSP}€`;
/** 3 293 €/m² */
export const eurPerM2 = (n: number) => `${group(n)}${NBSP}€/m²`;
export const num = (n: number) => group(n);
/** 68 m², 52,6 m² */
export const m2 = (n: number) =>
  `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}${NBSP}m²`;
/** 70,8 % */
export const pct = (n: number, digits = 0) =>
  `${n.toFixed(digits).replace('.', ',')}${NBSP}%`;

/** 20. 11. 2026 */
export function date(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getUTCDate()}.${NBSP}${d.getUTCMonth() + 1}.${NBSP}${d.getUTCFullYear()}`;
}

const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
export function monthYear(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Normalizuje slovenský mobil na „+421 9xx xxx xxx“, inak vráti null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  const m = /^(?:\+421|00421|0)(9\d{8})$/.exec(digits);
  if (!m?.[1]) return null;
  const n = m[1];
  return `+421 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

export function roomsLabel(rooms: number | null, type: string): string {
  if (type === 'byty' && rooms) return `${rooms}-izbový byt`;
  const map: Record<string, string> = { byty: 'Byt', domy: 'Dom', chaty: 'Chata', apartmany: 'Apartmán', pozemky: 'Pozemok' };
  return map[type] ?? 'Nehnuteľnosť';
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
