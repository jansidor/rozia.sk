import { pageMeta } from '@/lib/meta';
import { LegalPage } from '@/components/legal-page';
import { CookieSettingsButton } from '@/components/cookie-banner';
import { buttonStyles } from '@/components/ui/button';

const path = '/cookies/';
export const metadata = pageMeta({ title: 'Cookies', description: 'Aké cookies používa web rozia.sk a ako zmeniť alebo odvolať súhlas.', path });

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies" path={path} updated="20. 11. 2026" draft={false}>
      <p>Cookies sú malé súbory, ktoré si web ukladá vo vašom prehliadači. Nevyhnutné používame vždy. Analytické a marketingové len s vaším súhlasom, ktorý nie je podmienkou používania webu.</p>
      <p><CookieSettingsButton className={buttonStyles({ variant: 'secondary' })} /></p>
      <p>Svoju voľbu môžete zmeniť alebo odvolať kedykoľvek, rovnako jednoducho ako ste ju udelili: tlačidlom vyššie alebo odkazom „Nastavenia cookies“ v pätičke.</p>
      <h2>Nevyhnutné</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-[15px]">
          <thead className="text-sm text-muted"><tr><th scope="col" className="py-2 pr-4 font-medium">Názov</th><th scope="col" className="py-2 pr-4 font-medium">Účel</th><th scope="col" className="py-2 font-medium">Platnosť</th></tr></thead>
          <tbody>
            <tr className="border-t border-subtle"><th scope="row" className="py-2 pr-4 font-medium">rozia_consent</th><td className="py-2 pr-4">Zapamätá si vašu voľbu o cookies.</td><td className="py-2">12 mesiacov</td></tr>
          </tbody>
        </table>
      </div>
      <p>Zoznam uložených nehnuteľností (tlačidlo „Uložiť“) sa ukladá len vo vašom prehliadači (localStorage, kľúč rozia_saved) a neodosiela sa nám.</p>
      <h2>Analytické</h2>
      <p>Momentálne nepoužívame žiadne analytické cookies. Ak ich zavedieme, doplníme ich sem a spustia sa až po vašom súhlase.</p>
      <h2>Marketingové</h2>
      <p>Momentálne nepoužívame žiadne marketingové cookies.</p>
      <h2>Mapy</h2>
      <p>Mapa sa načíta až po kliknutí na „Zobraziť mapu“. Vtedy váš prehliadač stiahne mapové podklady zo služby OpenFreeMap, ktorá tak uvidí vašu IP adresu. Cookies pri tom neukladáme.</p>
    </LegalPage>
  );
}
