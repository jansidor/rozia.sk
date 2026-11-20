import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cities } from '@/lib/localities';
import { getPriceStats } from '@/lib/data';
import { eurPerM2 } from '@/lib/format';
import { pageMeta } from '@/lib/meta';
import { PageHeader } from '@/components/page-header';

export const revalidate = 3600;
export const metadata = pageMeta({
  title: 'Lokality Liptova: ceny bytov a život v mestách a sídliskách',
  description: 'Sprievodcovia lokalitami Liptova: Ružomberok, Liptovský Mikuláš, Liptovský Hrádok, Jasná, Liptovská Mara. Ceny za m², ponuka a predané nehnuteľnosti.',
  path: '/lokality/',
});

export default async function LocalitiesPage() {
  const stats = await getPriceStats();
  const price = (city: string, part: string | null) => stats.find((s) => s.citySlug === city && s.partSlug === part && s.rooms === null && s.condition === null)?.medianPerM2;
  return (
    <>
      <PageHeader crumbs={[{ name: 'Lokality', path: '/lokality/' }]} title="Lokality Liptova" lead="Ceny, ponuka a život v mestách a sídliskách, kde pôsobíme." />
      <div className="container-page py-10 sm:py-14">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => {
            const p = price(c.slug, null);
            return (
              <li key={c.slug} className="rounded-2xl border border-subtle bg-white p-6 shadow-card">
                <h2 className="text-2xl">
                  <Link href={`/lokality/${c.slug}/`} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
                    {c.name}
                    <ArrowRight aria-hidden className="size-5 text-green-700" />
                  </Link>
                </h2>
                {p !== undefined && <p className="tabular text-muted">medián {eurPerM2(p)}</p>}
                {c.parts.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.parts.map((part) => (
                      <li key={part.slug}>
                        <Link href={`/lokality/${c.slug}/${part.slug}/`} className="inline-flex min-h-11 items-center rounded-full border border-control px-4 text-[15px] font-medium hover:bg-green-50">
                          {part.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
