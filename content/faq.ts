import { site } from '@/lib/site';
import { pct } from '@/lib/format';

const c = site.commissionPercent;

export const homeFaq = [
  {
    q: 'Koľko stojí vaša služba?',
    a:
      c !== null
        ? `Províziu ${pct(c, Number.isInteger(c) ? 0 : 1)} z predajnej ceny vrátane DPH platíte len vtedy, keď predáme. Ocenenie je zadarmo a nezaväzuje vás.`
        : 'Províziu z predajnej ceny vrátane DPH platíte len vtedy, keď predáme. Jej výšku dostanete písomne spolu s ocenením. Ocenenie je zadarmo a nezaväzuje vás.',
  },
  {
    q: 'Musím podpísať exkluzívnu zmluvu?',
    a: 'Nie. Ponúkame exkluzívnu aj neexkluzívnu. Pri exkluzívnej sa zaväzujeme k marketingovému plánu a reportu každý týždeň, a ak ich neplníme, zmluvu môžete ukončiť.',
  },
  {
    q: 'Ako dlho trvá predaj?',
    a: 'Podľa portálu Nehnuteľnosti.sk sa priemerná doba predaja na Slovensku predĺžila zhruba na 64 dní. Pri vašom byte vám pred podpisom ukážeme reálny čas predaja podobných bytov v okolí.',
  },
  {
    q: 'Mám na byte hypotéku. Dá sa predať?',
    a: 'Áno. Banke dáme vyčísliť dlh, kupujúci zaplatí cez úschovu, z ktorej sa najprv splatí úver. Celý postup vám vopred vysvetlíme krok po kroku.',
  },
  {
    q: 'Môžem od zmluvy odstúpiť?',
    a: 'Ak ste zmluvu uzavreli online alebo mimo našej kancelárie, máte 14 dní na odstúpenie bez udania dôvodu. Stačí nám to oznámiť písomne alebo e-mailom.',
  },
  {
    q: 'Sme viacerí vlastníci alebo ide o dedičstvo.',
    a: 'Z listu vlastníctva zistíme všetkých vlastníkov a zmluvu pripravíme pre každého. Pri dedičstve vás prevedieme krokmi, ktoré musia prebehnúť pred predajom.',
  },
];

export const careerFaq = [
  {
    q: 'Musím mať živnosť?',
    a: 'Na realitnú činnosť je potrebná viazaná živnosť s odbornou spôsobilosťou. Ak ju zatiaľ nespĺňate, na rozhovore prejdeme, ako môžete začať.',
  },
  {
    q: 'Koľko zarobím v prvom roku?',
    a: 'Závisí to od počtu uzavretých obchodov. Na kalkulačke vidíte modelový výpočet. Keď budeme mať dáta, zverejníme medián nášho tímu, nie najlepšieho makléra.',
  },
  {
    q: 'Je to MLM?',
    a: 'Nie. Neplatíte vstupný poplatok, nikoho privádzať nemusíte a odmena za privedených maklérov pochádza len z reálne zaplatených provízií od klientov.',
  },
];
