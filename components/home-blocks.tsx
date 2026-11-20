import { Banknote, Camera, ClipboardCheck, FileSignature, KeyRound, Landmark, Megaphone, Scale, ScrollText, ShieldCheck, Users, Video } from 'lucide-react';
import type { TrustStats } from '@/lib/types';
import { pct } from '@/lib/format';
import { site } from '@/lib/site';

/** Pás dôkazov. Bez reálnych dát (stats === null) sa nevykreslí vôbec. */
export function TrustBar({ stats }: { stats: TrustStats | null }) {
  if (!stats) return null;
  const items = [
    { value: String(stats.soldLast12m), label: 'predaných nehnuteľností za 12 mesiacov' },
    { value: `${stats.medianDays} dní`, label: 'medián času do predaja' },
    { value: pct(stats.avgPctOfAsking, 1), label: 'predajná cena v priemere z pôvodnej ceny' },
  ];
  return (
    <section aria-label="Výsledky Rozie v číslach" className="on-dark bg-green-950 text-white">
      <dl className="container-page grid gap-6 py-8 sm:grid-cols-3 sm:py-10">
        {items.map((i) => (
          <div key={i.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-[15px] text-white/85">{i.label}</dt>
            <dd className="tabular font-display text-4xl font-bold text-green-400 sm:text-5xl">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const steps = [
  { Icon: ClipboardCheck, title: 'Ocenenie a stratégia ceny', text: 'Rozsah ceny hneď online, presné ocenenie od makléra z vašej lokality do 24 hodín.' },
  { Icon: FileSignature, title: 'Zmluvu potvrdíte online', text: 'Prečítate si zhrnutie aj celú zmluvu a potvrdíte ju za pár minút.' },
  { Icon: Megaphone, title: 'Foto, video a inzercia', text: 'Profesionálne fotografie, video, pôdorys a inzercia na hlavných portáloch.' },
  { Icon: Users, title: 'Obhliadky a týždenný report', text: 'Obhliadky organizujeme my. Každý týždeň viete, čo sa udialo.' },
  { Icon: Landmark, title: 'Rezervácia, kúpna zmluva, kataster', text: 'Právna kontrola, zmluvy, úschova kúpnej ceny aj návrh na vklad.' },
  { Icon: KeyRound, title: 'Odovzdanie kľúčov', text: 'Preberací protokol, odpočty energií a odovzdanie novému majiteľovi.' },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl border border-subtle bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="grid size-12 place-items-center rounded-xl bg-green-50 text-green-700">
              <s.Icon aria-hidden className="size-6" />
            </span>
            <span aria-hidden className="tabular font-display text-4xl font-bold text-subtle">{i + 1}</span>
          </div>
          <h3 className="mt-5 text-xl">
            <span className="sr-only">Krok {i + 1}: </span>
            {s.title}
          </h3>
          <p className="mt-2 text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

const included = [
  { Icon: Camera, text: 'Foto a video' },
  { Icon: ScrollText, text: 'Pôdorys' },
  { Icon: Megaphone, text: 'Inzercia na portáloch' },
  { Icon: Scale, text: 'Právna kontrola' },
  { Icon: FileSignature, text: 'Príprava zmlúv' },
  { Icon: ShieldCheck, text: 'Úschova' },
  { Icon: Landmark, text: 'Kataster' },
  { Icon: Video, text: 'Obhliadky a reporty' },
];

export function Transparency() {
  const c = site.commissionPercent;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="on-dark rounded-3xl bg-green-950 p-8 text-white sm:p-10">
        <Banknote aria-hidden className="size-8 text-green-400" />
        <h3 className="mt-5 text-2xl sm:text-3xl">Čo platíte</h3>
        <p className="mt-4 text-lg text-white/90">
          {c !== null ? (
            <>Províziu <strong className="tabular text-green-400">{pct(c, Number.isInteger(c) ? 0 : 1)}</strong> z predajnej ceny vrátane DPH, len pri úspešnom predaji.</>
          ) : (
            <>Províziu z predajnej ceny vrátane DPH, len pri úspešnom predaji. Jej presnú výšku dostanete písomne spolu s ocenením, skôr než čokoľvek potvrdíte.</>
          )}
        </p>
        <p className="mt-3 text-white/85">Ocenenie je zadarmo a k ničomu vás nezaväzuje.</p>
      </div>
      <div className="rounded-3xl border border-subtle bg-white p-8 shadow-card sm:p-10">
        <h3 className="text-2xl sm:text-3xl">Čo je v nej</h3>
        <ul className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {included.map((i) => (
            <li key={i.text} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-green-50 text-green-700">
                <i.Icon aria-hidden className="size-5" />
              </span>
              <span className="font-medium">{i.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
