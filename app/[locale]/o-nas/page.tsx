import { pageMeta } from '@/lib/meta';
import { getAgents, getTrustStats } from '@/lib/data';
import { cities } from '@/lib/localities';
import { PageHeader, Section } from '@/components/page-header';
import { TrustBar, Transparency } from '@/components/home-blocks';
import { AgentGrid } from '@/components/agent-card';
import { ButtonLink } from '@/components/ui/button';

export const revalidate = 600;
export const metadata = pageMeta({
  title: 'O nás: realitná kancelária Rozia, Liptov',
  description: 'Rozia je realitná kancelária pre Liptov. Ukazujeme čísla namiesto sľubov: čas predaja, percento z pôvodnej ceny a cenu služby vopred.',
  path: '/o-nas/',
});

const principles = [
  { title: 'Čísla namiesto prívlastkov', text: 'Nepíšeme o sebe, akí sme. Ukazujeme čas predaja a percento z pôvodnej ceny pri reálnych predajoch. Kde čísla ešte nemáme, nič neuvádzame.' },
  { title: 'Cena služby vopred', text: 'Províziu a všetko, čo je v nej, dostanete písomne, skôr než čokoľvek potvrdíte. Platíte len pri úspešnom predaji.' },
  { title: 'Maklér s menom a telefónom', text: 'Komunikujete s jedným človekom, ktorý pozná vašu lokalitu. Jeho priame číslo máte od prvého dňa.' },
];

export default async function AboutPage() {
  const [stats, agents] = await Promise.all([getTrustStats(), getAgents()]);
  return (
    <>
      <PageHeader crumbs={[{ name: 'O nás', path: '/o-nas/' }]} title="Realitná kancelária pre Liptov" lead={`Pôsobíme v lokalitách ${cities.map((c) => c.name).join(', ')}.`} />
      <TrustBar stats={stats} />
      <Section id="zasady" title="Ako pracujeme">
        <ul className="grid gap-5 lg:grid-cols-3">
          {principles.map((p) => (
            <li key={p.title} className="rounded-2xl border border-subtle bg-white p-7 shadow-card">
              <h3 className="text-xl">{p.title}</h3>
              <p className="mt-2 text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="cena-sluzby" title="Čo platíte a čo za to dostanete" tone="surface"><Transparency /></Section>
      {agents.length > 0 && <Section id="makleri" title="Makléri"><AgentGrid agents={agents} /></Section>}
      <Section tone={agents.length > 0 ? 'surface' : 'white'} title="Poďme sa porozprávať">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/kontakt/">Kontakt</ButtonLink>
          <ButtonLink href="/predat-nehnutelnost/ocenenie/" variant="secondary">Zistiť cenu nehnuteľnosti</ButtonLink>
        </div>
      </Section>
    </>
  );
}
