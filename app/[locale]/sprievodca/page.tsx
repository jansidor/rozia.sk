import Link from 'next/link';
import { pageMeta } from '@/lib/meta';
import { getArticles } from '@/lib/data';
import { date } from '@/lib/format';
import { PageHeader, EmptyState } from '@/components/page-header';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 3600;
export const metadata = pageMeta({
  title: 'Sprievodca predajom a kúpou nehnuteľnosti na Liptove',
  description: 'Praktické články o predaji, kúpe, cenách a právnych krokoch pri nehnuteľnostiach na Liptove.',
  path: '/sprievodca/',
});

export default async function GuidePage() {
  const articles = await getArticles();
  return (
    <>
      <PageHeader crumbs={[{ name: 'Sprievodca', path: '/sprievodca/' }]} title="Sprievodca" lead="Praktické odpovede na otázky, ktoré pri predaji a kúpe na Liptove počúvame najčastejšie." />
      <div className="container-page py-10 sm:py-14">
        {articles.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug} className="relative rounded-2xl border border-subtle bg-white p-6 shadow-card transition-shadow hover:shadow-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-green-950">
                <p className="tabular text-sm text-muted">{date(a.publishedAt)}</p>
                <h2 className="mt-2 text-xl"><Link href={`/sprievodca/${a.slug}/`} className="card-link outline-none">{a.title}</Link></h2>
                <p className="mt-2 text-muted">{a.excerpt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Prvé články pripravujeme" action={<ButtonLink href="/kontakt/" variant="secondary">Opýtať sa priamo</ButtonLink>}>
            Máte otázku k predaju alebo kúpe? Napíšte nám, odpovieme osobne.
          </EmptyState>
        )}
      </div>
    </>
  );
}
