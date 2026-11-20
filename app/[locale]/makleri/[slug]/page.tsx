import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getAgent, getListings } from '@/lib/data';
import { pageMeta } from '@/lib/meta';
import { telHref } from '@/lib/format';
import { AGENCY_ID, graph } from '@/lib/jsonld';
import { site } from '@/lib/site';
import { Breadcrumbs, Section } from '@/components/page-header';
import { AgentAvatar } from '@/components/agent-card';
import { PropertyGrid } from '@/components/property-card';
import { ContactForm } from '@/components/contact-form';
import { JsonLd } from '@/components/json-ld';

export const revalidate = 600;
/** Stránky sa generujú pri prvej návšteve a potom sa obnovujú (ISR). */
export const generateStaticParams = async () => [];
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = await getAgent((await params).slug);
  if (!agent) return {};
  return pageMeta({
    title: `${agent.name} – realitný maklér, ${agent.area}`,
    description: `${agent.name}, realitný maklér Rozie pre lokalitu ${agent.area}. Priamy telefón ${agent.phone}.`,
    path: `/makleri/${agent.slug}/`,
  });
}

export default async function AgentPage({ params }: Props) {
  const agent = await getAgent((await params).slug);
  if (!agent) notFound();
  const listings = await getListings({ agentId: agent.id });
  const path = `/makleri/${agent.slug}/`;

  return (
    <>
      <div className="border-b border-subtle bg-surface">
        <div className="container-page pt-3 pb-10">
          <Breadcrumbs items={[{ name: 'Makléri', path: '/makleri/' }, { name: agent.name, path }]} />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <AgentAvatar agent={agent} size={128} />
            <div>
              <h1 className="text-3xl sm:text-4xl">{agent.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-lg text-muted"><MapPin aria-hidden className="size-5" />{agent.area}</p>
              {agent.soldLast12m !== null && agent.soldLast12m > 0 && (
                <p className="mt-2"><strong className="tabular font-display text-2xl">{agent.soldLast12m}</strong> <span className="text-muted">predaných za 12 mesiacov</span></p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={telHref(agent.phone)} className="tabular inline-flex min-h-12 items-center gap-2 rounded-xl bg-green-950 px-5 font-semibold text-white hover:bg-green-900">
                  <Phone aria-hidden className="size-5" />{agent.phone}
                </a>
                {agent.email && (
                  <a href={`mailto:${agent.email}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-green-950 bg-white px-5 font-semibold hover:bg-green-50">
                    <Mail aria-hidden className="size-5" />{agent.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <JsonLd data={graph({ '@type': 'Person', name: agent.name, jobTitle: 'Realitný maklér', telephone: agent.phone, url: `${site.url}${path}`, worksFor: { '@id': AGENCY_ID }, ...(agent.photoUrl ? { image: agent.photoUrl } : {}) })} />

      {agent.bio && (
        <Section title="O mne"><p className="max-w-3xl text-lg">{agent.bio}</p></Section>
      )}
      {listings.length > 0 && (
        <Section title="Moja aktuálna ponuka" tone="surface"><PropertyGrid listings={listings} /></Section>
      )}
      <Section title={`Napíšte priamo: ${agent.name}`}>
        <div className="max-w-2xl rounded-2xl border border-subtle bg-white p-6 shadow-card sm:p-8">
          <ContactForm context={`Maklér: ${agent.name}`} />
        </div>
      </Section>
    </>
  );
}
