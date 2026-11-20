import { pageMeta } from '@/lib/meta';
import { getAgents } from '@/lib/data';
import { PageHeader, EmptyState } from '@/components/page-header';
import { AgentGrid } from '@/components/agent-card';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 600;
export const metadata = pageMeta({
  title: 'Realitní makléri na Liptove',
  description: 'Makléri Rozie v Ružomberku, Liptovskom Mikuláši a okolí. Každý s priamym telefónom a počtom predaných nehnuteľností za 12 mesiacov.',
  path: '/makleri/',
});

export default async function AgentsPage() {
  const agents = await getAgents();
  return (
    <>
      <PageHeader crumbs={[{ name: 'Makléri', path: '/makleri/' }]} title="Makléri" lead="Každý maklér má svoju lokalitu a priamy telefón. Volajte rovno človeku, ktorý pozná vašu ulicu." />
      <div className="container-page py-10 sm:py-14">
        {agents.length > 0 ? (
          <AgentGrid agents={agents} />
        ) : (
          <EmptyState title="Profily maklérov pripravujeme" action={<>
            <ButtonLink href="/kontakt/">Kontaktovať Roziu</ButtonLink>
            <ButtonLink href="/kariera/" variant="secondary">Chcem sa pridať ako maklér</ButtonLink>
          </>}>
            Kým ich zverejníme, napíšte nám a spojíme vás s maklérom pre vašu lokalitu.
          </EmptyState>
        )}
      </div>
    </>
  );
}
