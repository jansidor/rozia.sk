import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/data';
import { pageMeta } from '@/lib/meta';
import { date } from '@/lib/format';
import { AGENCY_ID, graph } from '@/lib/jsonld';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/page-header';
import { JsonLd } from '@/components/json-ld';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 3600;
/** Stránky sa generujú pri prvej návšteve a potom sa obnovujú (ISR). */
export const generateStaticParams = async () => [];
type Props = { params: Promise<{ clanok: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).clanok);
  return a ? pageMeta({ title: a.title, description: a.excerpt, path: `/sprievodca/${a.slug}/` }) : {};
}

/** Telo článku: odseky oddelené prázdnym riadkom, „## “ a „### “ sú nadpisy, „- “ zoznam. */
function Body({ text }: { text: string }) {
  return (
    <div className="prose-rozia text-lg">
      {text.split(/\n{2,}/).map((block, i) => {
        const b = block.trim();
        if (b.startsWith('### ')) return <h3 key={i}>{b.slice(4)}</h3>;
        if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>;
        if (b.split('\n').every((l) => l.startsWith('- '))) return <ul key={i}>{b.split('\n').map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}

export default async function ArticlePage({ params }: Props) {
  const a = await getArticle((await params).clanok);
  if (!a) notFound();
  const path = `/sprievodca/${a.slug}/`;
  return (
    <article className="container-page max-w-3xl pt-3 pb-16">
      <Breadcrumbs items={[{ name: 'Sprievodca', path: '/sprievodca/' }, { name: a.title, path }]} />
      <JsonLd data={graph({ '@type': 'Article', headline: a.title, description: a.excerpt, datePublished: a.publishedAt, dateModified: a.updatedAt, author: { '@type': a.author ? 'Person' : 'Organization', name: a.author ?? site.name }, publisher: { '@id': AGENCY_ID }, mainEntityOfPage: `${site.url}${path}` })} />
      <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl">{a.title}</h1>
      <p className="tabular mt-4 text-muted">
        {a.author && <>{a.author} · </>}Publikované {date(a.publishedAt)}
        {a.updatedAt.slice(0, 10) !== a.publishedAt.slice(0, 10) && <> · aktualizované {date(a.updatedAt)}</>}
      </p>
      <p className="mt-6 text-xl text-muted">{a.excerpt}</p>
      <div className="mt-8"><Body text={a.body} /></div>
      <div className="mt-12 rounded-2xl bg-surface p-6 sm:p-8">
        <h2 className="text-2xl">Koľko stojí vaša nehnuteľnosť?</h2>
        <p className="mt-2 text-muted">Rozsah ceny hneď, presné ocenenie od makléra do 24 hodín.</p>
        <ButtonLink href="/predat-nehnutelnost/ocenenie/" className="mt-5">Zistiť cenu</ButtonLink>
      </div>
    </article>
  );
}
