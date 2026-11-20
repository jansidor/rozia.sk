import { ArrowRight, Check, CircleSlash, Wallet } from 'lucide-react';
import Link from 'next/link';
import { pageMeta } from '@/lib/meta';
import { PageHeader, Section } from '@/components/page-header';
import { IncomeCalculator } from '@/components/income-calculator';
import { ContactForm } from '@/components/contact-form';
import { Faq } from '@/components/faq';
import { ButtonLink } from '@/components/ui/button';
import { benefits, costs, positions } from '@/content/career';
import { careerFaq } from '@/content/faq';

export const metadata = pageMeta({
  title: 'Kariéra: realitný maklér na Liptove s podielom až 80 %',
  description: 'Nechajte si až 80 % z provízie. Inzerciu, právnu kontrolu, zmluvy a CRM rieši Rozia. Spočítajte si príjem na transparentnej kalkulačke.',
  path: '/kariera/',
});

export default function CareerPage() {
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kariéra', path: '/kariera/' }]} title="Nechajte si až 80 % z provízie." lead="Inzerciu, právnu kontrolu, zmluvy a CRM rieši Rozia. Vy riešite klientov na Liptove. Spočítajte si, čo to znamená pri vašom počte obchodov.">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="#kalkulacka" size="lg">Spočítať môj príjem</ButtonLink>
          <ButtonLink href="#rozhovor" variant="secondary" size="lg">Dohodnúť 20-minútový rozhovor</ButtonLink>
        </div>
        <p className="mt-5 max-w-2xl text-muted">
          Podiel rastie s vašou produkciou: 60 %, 70 % a 80 %. Pravidlá a všetky poplatky nájdete nižšie na jednej obrazovke.
        </p>
      </PageHeader>

      <Section id="kalkulacka" title="Kalkulačka príjmu makléra" lead="Posuňte počet obchodov a pozrite si výsledok v eurách pri liptovských cenách.">
        <IncomeCalculator />
        <p className="mt-6">
          <Link href="/kariera/kalkulacka-prijmu/" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">
            Vzorec a modelové príklady <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      </Section>

      <Section id="podmienky" title="Čo dostanete a čo platíte" tone="surface">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-subtle bg-white p-7 shadow-card sm:p-9">
            <h3 className="text-2xl">Čo dostanete</h3>
            <ul className="mt-5 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3"><Check aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />{b}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-subtle bg-white p-7 shadow-card sm:p-9">
              <h3 className="flex items-center gap-3 text-2xl"><Wallet aria-hidden className="size-6 text-green-700" />Čo platíte</h3>
              <ul className="mt-5 space-y-3">
                {costs.map((c) => <li key={c} className="flex gap-3"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-green-950" />{c}</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-warning/30 bg-warning-bg p-7 sm:p-9">
              <h3 className="flex items-center gap-3 text-2xl"><CircleSlash aria-hidden className="size-6 text-warning" />Komu sa u nás nebude dariť</h3>
              <p className="mt-4">
                Ak potrebujete fixný plat od prvého mesiaca alebo nechcete pracovať s vlastnými klientmi, nie sme pre vás dobrá voľba. Prvé mesiace bývajú pre nováčikov finančne slabé.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-8">
          <ButtonLink href="/kariera/model-spoluprace/" variant="secondary">Celý model spolupráce</ButtonLink>
        </p>
      </Section>

      <Section id="pozicie" title="Otvorené pozície">
        <ul className="max-w-3xl space-y-4">
          {positions.map((p) => (
            <li key={p.slug} className="relative rounded-2xl border border-subtle bg-white p-6 shadow-card transition-shadow hover:shadow-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-green-950">
              <h3 className="text-xl"><Link href={`/kariera/${p.slug}/`} className="card-link outline-none">{p.title}</Link></h3>
              <p className="mt-1 text-muted">{p.location}</p>
              <p className="mt-3">{p.lead}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="otazky" title="Časté otázky" tone="surface"><Faq items={careerFaq} /></Section>

      <Section id="rozhovor" title="Dohodnite si 20-minútový rozhovor" lead="Bez záväzku. Prejdeme vašu situáciu, čísla z kalkulačky aj to, ako by ste u nás začali.">
        <div className="max-w-2xl rounded-2xl border border-subtle bg-white p-6 shadow-card sm:p-8">
          <ContactForm kind="kariera" messageLabel="Pár slov o vás" messagePlaceholder="Koľko rokov sa venujete realitám? V ktorej lokalite?" submitLabel="Mám záujem o rozhovor" />
        </div>
      </Section>
    </>
  );
}
