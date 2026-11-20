import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, MapPin } from 'lucide-react';
import { pageMeta } from '@/lib/meta';
import { AGENCY_ID, graph } from '@/lib/jsonld';
import { PageHeader, Section } from '@/components/page-header';
import { ContactForm } from '@/components/contact-form';
import { JsonLd } from '@/components/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { benefits, positions } from '@/content/career';

type Props = { params: Promise<{ pozicia: string }> };
export const generateStaticParams = () => positions.map((p) => ({ pozicia: p.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pozicia } = await params;
  const p = positions.find((x) => x.slug === pozicia);
  return p ? pageMeta({ title: p.title, description: p.lead, path: `/kariera/${p.slug}/` }) : {};
}

export default async function PositionPage({ params }: Props) {
  const { pozicia } = await params;
  const p = positions.find((x) => x.slug === pozicia);
  if (!p) notFound();
  const list = (items: string[]) => (
    <ul className="mt-4 space-y-3">{items.map((i) => <li key={i} className="flex gap-3"><Check aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />{i}</li>)}</ul>
  );
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kariéra', path: '/kariera/' }, { name: p.title, path: `/kariera/${p.slug}/` }]} title={p.title} lead={p.lead}>
        <p className="flex items-center gap-2 text-muted"><MapPin aria-hidden className="size-5" />{p.location}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="#prihlaska">Mám záujem</ButtonLink>
          <ButtonLink href="/kariera/kalkulacka-prijmu/" variant="secondary">Spočítať môj príjem</ButtonLink>
        </div>
      </PageHeader>
      <JsonLd
        data={graph({
          '@type': 'JobPosting',
          title: p.title,
          description: `${p.lead} ${p.responsibilities.join('. ')}.`,
          datePosted: p.datePosted,
          employmentType: p.employmentType,
          hiringOrganization: { '@id': AGENCY_ID },
          jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Ružomberok', addressRegion: 'Žilinský kraj', addressCountry: 'SK' } },
        })}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-3">
          <div><h2 className="text-2xl">Čo budete robiť</h2>{list(p.responsibilities)}</div>
          <div><h2 className="text-2xl">Čo potrebujete</h2>{list(p.requirements)}</div>
          <div><h2 className="text-2xl">Čo dostanete</h2>{list(benefits)}</div>
        </div>
      </Section>
      <Section id="prihlaska" tone="surface" title="Ozvite sa nám" lead="Stačí pár viet. Ozveme sa a dohodneme 20-minútový rozhovor.">
        <div className="max-w-2xl rounded-2xl border border-subtle bg-white p-6 shadow-card sm:p-8">
          <ContactForm kind="kariera" context={`Pozícia: ${p.title}`} messageLabel="Pár slov o vás" submitLabel="Odoslať" />
        </div>
      </Section>
    </>
  );
}
