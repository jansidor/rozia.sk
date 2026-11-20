import Image from 'next/image';
import Link from 'next/link';
import { BadgePercent, CircleCheck, Clock, House, Sparkles, User } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { eur, eurPerM2, m2, roomsLabel } from '@/lib/format';
import { listingPath } from '@/lib/jsonld';
import { SaveButton } from './save-button';
import { cn } from '@/lib/cn';

const NEW_DAYS = 14;

export function listingBadge(l: Listing) {
  if (l.status === 'sold') return { text: 'PREDANÉ', Icon: CircleCheck, cls: 'bg-green-50 text-success' };
  if (l.status === 'reserved') return { text: 'REZERVOVANÉ', Icon: Clock, cls: 'bg-info-bg text-info' };
  if (l.previousPrice && l.previousPrice > l.price) return { text: 'ZNÍŽENÁ CENA', Icon: BadgePercent, cls: 'bg-warning-bg text-warning' };
  if (Date.now() - new Date(l.publishedAt).getTime() < NEW_DAYS * 86_400_000) return { text: 'NOVÉ', Icon: Sparkles, cls: 'bg-green-950 text-white' };
  return null;
}

export function StatusBadge({ listing, className }: { listing: Listing; className?: string }) {
  const b = listingBadge(listing);
  if (!b) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide shadow-card', b.cls, className)}>
      <b.Icon aria-hidden className="size-3.5" />
      {b.text}
    </span>
  );
}

export function EnergyChip({ energyClass }: { energyClass: string | null }) {
  return (
    <span className="inline-flex items-center rounded-md border border-subtle bg-surface px-2 py-1 text-xs font-medium text-green-950">
      {energyClass ? <>Energetická trieda&nbsp;<strong>{energyClass}</strong></> : 'Certifikát: nie je'}
    </span>
  );
}

export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-full flex-col items-center justify-center gap-2 bg-surface text-muted', className)}>
      <House aria-hidden className="size-9 text-green-500" strokeWidth={1.5} />
      <span className="text-sm">Fotografie pripravujeme</span>
    </div>
  );
}

export function summaryLine(l: Pick<Listing, 'rooms' | 'type' | 'areaM2' | 'localityLabel'>) {
  return `${roomsLabel(l.rooms, l.type)} · ${m2(l.areaM2)} · ${l.localityLabel}`;
}

export function PropertyCard({ listing: l, priority = false }: { listing: Listing; priority?: boolean }) {
  const photo = l.photos[0];
  const rent = l.transaction === 'prenajom';
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-white shadow-card transition-shadow hover:shadow-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-green-950">
      <div className="relative aspect-4/3 overflow-hidden bg-surface">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.alt || l.title}
            fill
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            placeholder={photo.blurDataUrl ? 'blur' : 'empty'}
            blurDataURL={photo.blurDataUrl ?? undefined}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        <StatusBadge listing={l} className="absolute left-3 top-3" />
        <SaveButton id={l.id} title={l.title} className="absolute right-3 top-3 z-10" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="tabular text-2xl font-semibold leading-tight">
          {eur(l.price)}
          {rent && <span className="text-base font-normal text-muted"> / mesiac</span>}
        </p>
        {!rent && l.type !== 'pozemky' && <p className="tabular mt-0.5 text-sm text-muted">{eurPerM2(l.price / l.areaM2)}</p>}
        {!rent && l.type === 'pozemky' && <p className="tabular mt-0.5 text-sm text-muted">{eurPerM2(l.price / l.areaM2)} pozemku</p>}
        <h3 className="mt-3 font-sans text-base font-medium leading-snug tracking-normal">
          <Link href={listingPath(l)} className="card-link outline-none">
            {summaryLine(l)}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <EnergyChip energyClass={l.energyClass} />
          {l.agent && (
            <span className="flex items-center gap-2 text-sm text-muted">
              {l.agent.photoUrl ? (
                <Image src={l.agent.photoUrl} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
              ) : (
                <span className="grid size-7 place-items-center rounded-full bg-green-50 text-green-700"><User aria-hidden className="size-4" /></span>
              )}
              {l.agent.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PropertyGrid({ listings, priorityCount = 0 }: { listings: Listing[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l, i) => (
        <li key={l.id}>
          <PropertyCard listing={l} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
