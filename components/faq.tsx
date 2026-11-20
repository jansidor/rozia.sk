import { ChevronDown } from 'lucide-react';
import { JsonLd } from './json-ld';
import { faqLd, graph } from '@/lib/jsonld';

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items, withSchema = true }: { items: FaqItem[]; withSchema?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="max-w-3xl divide-y divide-subtle rounded-2xl border border-subtle bg-white">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown aria-hidden className="size-5 shrink-0 text-green-700 transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-muted">{item.a}</p>
        </details>
      ))}
      {withSchema && <JsonLd data={graph(faqLd(items))} />}
    </div>
  );
}
