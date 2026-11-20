import { getSales, getTrustStats } from '@/lib/data';
import { pageMeta } from '@/lib/meta';
import { PageHeader, EmptyState } from '@/components/page-header';
import { SoldShowcase } from '@/components/sold-showcase';
import { TrustBar } from '@/components/home-blocks';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 600;
export const metadata = pageMeta({
  title: 'Predané nehnuteľnosti na Liptove',
  description: 'Archív predaných nehnuteľností Rozie: čas predaja a percento z pôvodnej ceny. Zverejňujeme len so súhlasom klienta.',
  path: '/predane/',
});

export default async function SoldPage() {
  const [sales, stats] = await Promise.all([getSales(), getTrustStats()]);
  return (
    <>
      <PageHeader crumbs={[{ name: 'Predané', path: '/predane/' }]} title="Predané nehnuteľnosti" lead="Pri každom predaji ukazujeme, ako dlho trval a koľko percent z pôvodnej ceny klient dostal. Zverejňujeme len prípady, s ktorými klient súhlasil." />
      <TrustBar stats={stats} />
      <div className="container-page py-10 sm:py-14">
        {sales.length > 0 ? (
          <SoldShowcase sales={sales} />
        ) : (
          <EmptyState title="Zatiaľ nemáme dosť dát" action={<ButtonLink href="/predat-nehnutelnost/ocenenie/">Zistiť cenu mojej nehnuteľnosti</ButtonLink>}>
            Prvé predaje tu zverejníme, hneď ako nám na to dajú klienti súhlas. Vymyslené referencie neuvádzame.
          </EmptyState>
        )}
      </div>
    </>
  );
}
