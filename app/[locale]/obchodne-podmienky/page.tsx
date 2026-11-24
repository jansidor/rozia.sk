import { pageMeta } from '@/lib/meta';
import { approvedDocuments, legalReady, site } from '@/lib/site';
import { LegalPage, Operator } from '@/components/legal-page';

const path = '/obchodne-podmienky/';
export const metadata = pageMeta({ title: 'Obchodné podmienky', description: 'Obchodné podmienky realitnej kancelárie Rozia: služby, cena, reklamácie a alternatívne riešenie sporov.', path, noindex: !(legalReady && approvedDocuments.terms) });

export default function TermsPage() {
  return (
    <LegalPage title="Obchodné podmienky" path={path} updated="20. 11. 2026" draft={!(legalReady && approvedDocuments.terms)}>
      <h2>1. Kto službu poskytuje</h2>
      <p><Operator /> (ďalej „Rozia“). Kontakt: <a href={`mailto:${site.email}`}>{site.email}</a>. Orgán dozoru: {site.legal.supervisor}.</p>
      <h2>2. Aké služby poskytujeme</h2>
      <p>Sprostredkovanie predaja, kúpy a prenájmu nehnuteľností a súvisiace služby: ocenenie, prezentácia a inzercia nehnuteľnosti, organizácia obhliadok, príprava zmluvnej dokumentácie a súčinnosť pri prevode v katastri nehnuteľností.</p>
      <h2>3. Používanie webu a orientačné ocenenie</h2>
      <p>Používanie webu rozia.sk je bezplatné. Online odhad ceny je orientačný, vychádza z verejne dostupných a interných údajov o ponukách a predajoch, nie je znaleckým posudkom a nenahrádza ocenenie pre banku. Odoslaním formulára nevzniká zmluva o sprostredkovaní.</p>
      <h2>4. Cena služby</h2>
      <p>Odmenou Rozie je provízia z predajnej ceny vrátane DPH, na ktorú vzniká nárok len pri úspešnom sprostredkovaní. Jej výšku, spôsob výpočtu a rozsah služieb dostane klient písomne pred uzavretím zmluvy o sprostredkovaní. Inzeráty uvádzajú konečnú cenu nehnuteľnosti.</p>
      <h2>5. Zmluva uzavretá na diaľku a odstúpenie</h2>
      <p>Spotrebiteľ, ktorý uzavrel zmluvu o sprostredkovaní na diaľku alebo mimo prevádzkových priestorov, môže od nej odstúpiť do 14 dní bez udania dôvodu. Poučenie a formulár na odstúpenie dostane spolu so zmluvou. Odstúpenie stačí oznámiť e-mailom na {site.email}.</p>
      <h2>6. Reklamácie a riešenie sporov</h2>
      <p>Reklamáciu služby môžete podať e-mailom na {site.email}. Odpovieme najneskôr do 30 dní. Ak s vybavením nesúhlasíte, máte ako spotrebiteľ právo obrátiť sa na subjekt alternatívneho riešenia sporov, ktorým je Slovenská obchodná inšpekcia (www.soi.sk).</p>
      <h2>7. Ochrana osobných údajov</h2>
      <p>Spracúvanie osobných údajov popisuje dokument <a href="/ochrana-osobnych-udajov/">Ochrana osobných údajov</a>.</p>
    </LegalPage>
  );
}
