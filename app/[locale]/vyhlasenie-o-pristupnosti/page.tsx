import { pageMeta } from '@/lib/meta';
import { site } from '@/lib/site';
import { LegalPage } from '@/components/legal-page';

const path = '/vyhlasenie-o-pristupnosti/';
export const metadata = pageMeta({ title: 'Vyhlásenie o prístupnosti', description: 'Web rozia.sk navrhujeme podľa WCAG 2.2 úrovne AA. Ako nahlásiť prekážku v prístupnosti.', path });

export default function AccessibilityPage() {
  return (
    <LegalPage title="Vyhlásenie o prístupnosti" path={path} updated="20. 11. 2026" draft={false}>
      <p>Chceme, aby web rozia.sk mohol používať každý. Navrhujeme a testujeme ho podľa štandardu WCAG 2.2 na úrovni AA.</p>
      <h2>Čo pre prístupnosť robíme</h2>
      <ul>
        <li>Kontrast textu a ovládacích prvkov overujeme výpočtom pri každej zmene farieb.</li>
        <li>Celý web sa dá ovládať klávesnicou, fokus je vždy viditeľný a nezakrýva ho žiadna lišta.</li>
        <li>Ovládacie prvky majú veľkosť aspoň 44 × 44 px.</li>
        <li>Stav nikdy neoznačujeme len farbou, vždy aj ikonou a textom.</li>
        <li>Formuláre majú popisky, chyby vysvetľujú, čo opraviť, a nič nie je predvolene zaškrtnuté.</li>
        <li>Údaje z mapy sú vždy dostupné aj v tabuľke.</li>
        <li>Rešpektujeme nastavenie obmedzenia pohybu a web funguje pri zväčšení na 200 %.</li>
      </ul>
      <h2>Známe obmedzenia</h2>
      <p>Interaktívna mapa je grafický prvok tretej strany; jej obsah preto vždy uvádzame aj v texte alebo tabuľke. Fotografie nehnuteľností majú textový popis, ktorého kvalita závisí od podkladov inzerátu.</p>
      <h2>Spätná väzba</h2>
      <p>Narazili ste na prekážku? Napíšte nám na <a href={`mailto:${site.email}`}>{site.email}</a>. Odpovieme do 5 pracovných dní a problém opravíme.</p>
    </LegalPage>
  );
}
