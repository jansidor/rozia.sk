import Image from 'next/image';
import { CircleCheck } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { date, m2, pct, roomsLabel } from '@/lib/format';
import { PhotoPlaceholder } from './property-card';

export function SaleCard({ sale: s }: { sale: Sale }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-white shadow-card">
      <div className="relative aspect-4/3 bg-surface">
        {s.photo ? (
          <Image src={s.photo.url} alt={s.photo.alt} fill sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <PhotoPlaceholder />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold tracking-wide text-success shadow-card">
          <CircleCheck aria-hidden className="size-3.5" />
          PREDANÉ
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sans text-base font-medium tracking-normal">
          {roomsLabel(s.rooms, s.type)}{s.areaM2 ? ` · ${m2(s.areaM2)}` : ''} · {s.localityLabel}
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-subtle pt-4">
          <div>
            <dt className="text-sm text-muted">Čas predaja</dt>
            <dd className="tabular font-display text-2xl font-bold">{s.daysOnMarket} dní</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Z pôvodnej ceny</dt>
            <dd className="tabular font-display text-2xl font-bold">{pct(s.pctOfAskingPrice, 1)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">Predané {date(s.soldAt)} · zverejnené so súhlasom klienta</p>
      </div>
    </article>
  );
}

/** Vykreslí sa len vtedy, keď existujú reálne predaje so súhlasom klienta. */
export function SoldShowcase({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) return null;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sales.map((s) => (
        <li key={s.id}><SaleCard sale={s} /></li>
      ))}
    </ul>
  );
}
