import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from './json-ld';
import { breadcrumbLd, graph } from '@/lib/jsonld';
import { cn } from '@/lib/cn';

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Domov', path: '/' }, ...items];
  return (
    <>
      <nav aria-label="Omrvinková navigácia">
        <ol className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
          {all.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-4" />}
              {i === all.length - 1 ? (
                <span aria-current="page" className="inline-flex min-h-11 items-center font-medium text-green-950">{c.name}</span>
              ) : (
                <Link href={c.path} className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 hover:text-green-950 hover:underline">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={graph(breadcrumbLd(all))} />
    </>
  );
}

export function PageHeader({ crumbs, title, lead, children, tone = 'surface' }: { crumbs: Crumb[]; title: ReactNode; lead?: ReactNode; children?: ReactNode; tone?: 'surface' | 'white' }) {
  return (
    <div className={cn('border-b border-subtle', tone === 'surface' ? 'bg-surface' : 'bg-white')}>
      <div className="container-page pt-3 pb-10 sm:pb-12">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-4 max-w-3xl text-3xl sm:text-4xl lg:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-muted">{lead}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

export function Section({ id, title, lead, children, tone = 'white', className }: { id?: string; title?: ReactNode; lead?: ReactNode; children: ReactNode; tone?: 'white' | 'surface'; className?: string }) {
  return (
    <section id={id} aria-labelledby={id && title ? `${id}-h` : undefined} className={cn('py-14 sm:py-20', tone === 'surface' && 'bg-surface', className)}>
      <div className="container-page">
        {title && <h2 id={id ? `${id}-h` : undefined} className="max-w-2xl text-2xl sm:text-3xl lg:text-4xl">{title}</h2>}
        {lead && <p className="mt-3 max-w-2xl text-lg text-muted">{lead}</p>}
        <div className={cn(title && 'mt-8 sm:mt-10')}>{children}</div>
      </div>
    </section>
  );
}

/** Stav „zatiaľ nemáme dosť dát“ – používa sa namiesto vymyslených čísel. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-control bg-surface px-6 py-10 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-xl text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
