import { pageMeta } from '@/lib/meta';
import { legalReady, site } from '@/lib/site';
import { LegalPage, Operator } from '@/components/legal-page';

const path = '/ochrana-osobnych-udajov/';
export const metadata = pageMeta({ title: 'Ochrana osobných údajov', description: 'Ako Rozia pracuje s osobnými údajmi: aké údaje spracúvame, prečo, ako dlho a aké máte práva.', path, noindex: !legalReady });

export default function PrivacyPage() {
  return (
    <LegalPage title="Ochrana osobných údajov" path={path} updated="20. 11. 2026">
      <h2>Kto je prevádzkovateľ</h2>
      <p><Operator />. So žiadosťami o údajoch sa obráťte na <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
      <h2>Aké údaje spracúvame a prečo</h2>
      <ul>
        <li><strong>Formulár ocenenia:</strong> meno, telefón, voliteľne e-mail, adresa a parametre nehnuteľnosti, plánovaný čas predaja. Účel: vypracovať ocenenie a kontaktovať vás s výsledkom. Právny základ: váš súhlas.</li>
        <li><strong>Kontaktný formulár a dopyt:</strong> meno, telefón, voliteľne e-mail a text správy. Účel: vybaviť vašu správu. Právny základ: váš súhlas, prípadne kroky pred uzavretím zmluvy na vašu žiadosť.</li>
        <li><strong>Záujem o spoluprácu (kariéra):</strong> meno, telefón, voliteľne e-mail a text správy. Účel: dohodnúť rozhovor.</li>
        <li><strong>Štvrťročná cenová mapa e-mailom:</strong> e-mail, len ak ste zaškrtli samostatný nepovinný súhlas.</li>
        <li><strong>Technické údaje:</strong> adresa stránky, z ktorej bol formulár odoslaný, a typ prehliadača – na preukázanie súhlasu a ochranu pred zneužitím.</li>
      </ul>
      <p>Spolu so súhlasom ukladáme jeho presné znenie a čas udelenia, aby sme ho vedeli preukázať.</p>
      <h2>Ako dlho údaje uchovávame</h2>
      <p>Údaje z formulárov uchovávame najdlhšie 12 mesiacov od posledného kontaktu, ak medzitým nevznikne zmluvný vzťah. Ak vznikne, riadime sa lehotami, ktoré ukladajú právne predpisy.</p>
      <h2>Komu údaje poskytujeme</h2>
      <p>Údaje vidí len maklér Rozie, ktorý vašu požiadavku vybavuje. Technickú prevádzku zabezpečujú sprostredkovatelia: Supabase (databáza v EÚ, Frankfurt) a Vercel (hosting webu). Údaje nepredávame.</p>
      <h2>Vaše práva</h2>
      <ul>
        <li>kedykoľvek odvolať súhlas – stačí e-mail na {site.email},</li>
        <li>žiadať prístup k údajom, ich opravu, vymazanie alebo obmedzenie spracúvania,</li>
        <li>žiadať prenos údajov a namietať proti spracúvaniu,</li>
        <li>podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</li>
      </ul>
      <h2>Cookies</h2>
      <p>Používanie cookies popisuje stránka <a href="/cookies/">Cookies</a>.</p>
    </LegalPage>
  );
}
