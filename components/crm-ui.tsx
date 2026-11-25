import type { ReactNode } from 'react';

/** Spoločné drobnosti obrazoviek CRM. */
export function Flash({ ok, error }: { ok?: string | undefined; error?: string | undefined }) {
  if (!ok && !error) return null;
  const cls = error ? 'border-danger bg-danger-bg text-danger' : 'border-success bg-green-50 text-success';
  return (
    <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${cls}`}>
      {error ?? ok}
    </p>
  );
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-semibold sm:text-3xl">{children}</h1>
      {lead && <p className="mt-1 text-muted">{lead}</p>}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-control bg-white px-4 py-8 text-center text-muted">{children}</p>;
}

/** mailto: odkaz bez možnosti vložiť ďalšie hlavičky (?bcc=…) z e-mailu zadaného klientom. */
export const mailHref = (email: string) => `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`;

export const eur = (n: number | null | undefined) => (n == null ? '–' : new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
export const dateTime = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Bratislava' }).format(new Date(iso)) : '–';

export function range(low: number | null, high: number | null): string {
  if (low == null && high == null) return '–';
  if (low != null && high != null) return `${eur(low)} až ${eur(high)}`;
  return eur(low ?? high);
}

export const STATUS_SK: Record<string, string> = {
  nepridelene: 'Nepridelené', pridelene: 'Pridelené', archiv: 'Archív',
  aktivny: 'Aktívny', predany: 'Predaný', nedohodnuty: 'Nedohodnutý',
};
export const FINANCING_SK: Record<string, string> = {
  nove: 'Nové', priprava: 'Príprava', riesi_sa: 'Rieši sa', vyriesene: 'Vyriešené', neriesi_sa: 'Nerieši sa',
};

/** PostgREST vracia vnorený záznam ako objekt alebo pole podľa vzťahu; vezme prvý. */
export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export const FIELD_SK: Record<string, string> = {
  city_slug: 'Obec', property_type: 'Typ nehnuteľnosti', area_m2: 'Výmera (m²)', price: 'Cena', address: 'Adresa',
};
