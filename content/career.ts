import { site } from '@/lib/site';

export const benefits = [
  'Inzercia na hlavných portáloch na účet Rozie',
  'CRM a príprava zmlúv',
  'Právna kontrola listu vlastníctva a zmlúv',
  'Fotograf a video podľa pravidiel',
  'Leady z webu podľa lokality',
  'AML a GDPR procesy',
  'Zaškolenie a mentor',
];

export const costs = [
  `Mesačný poplatok za platformu ${site.career.monthlyFee} € (prvé ${site.career.freeMonths} mesiace 0 €)`,
  'Vlastné auto a telefón',
  'Nič iné. Žiadny vstupný poplatok.',
];

export interface Position {
  slug: string;
  title: string;
  lead: string;
  location: string;
  employmentType: 'CONTRACTOR';
  datePosted: string;
  responsibilities: string[];
  requirements: string[];
}

/** 1 rola = 1 URL (JobPosting). */
export const positions: Position[] = [
  {
    slug: 'realitny-makler',
    title: 'Realitný maklér / realitná maklérka – Liptov',
    lead: 'Spolupráca na živnosť s podielom 60 až 80 % z provízie. Inzerciu, právnu kontrolu, zmluvy a CRM rieši Rozia.',
    location: 'Ružomberok, Liptovský Mikuláš a okolie',
    employmentType: 'CONTRACTOR',
    datePosted: '2026-11-20',
    responsibilities: [
      'Nábor nehnuteľností a práca s vlastnými klientmi vo vašej lokalite',
      'Ocenenia, obhliadky a vyjednávanie',
      'Sprevádzanie klienta od zmluvy po odovzdanie kľúčov',
    ],
    requirements: [
      'Chuť pracovať s ľuďmi a samostatnosť',
      'Vodičský preukaz skupiny B a vlastné auto',
      'Oprávnenie na realitnú činnosť (viazaná živnosť) alebo záujem ho získať – na rozhovore prejdeme možnosti',
    ],
  },
];
