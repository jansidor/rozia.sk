import { pageMeta } from '@/lib/meta';
import { approvedDocuments, legalReady, site } from '@/lib/site';
import { LegalPage, Operator } from '@/components/legal-page';

const path = '/ochrana-osobnych-udajov/';
export const metadata = pageMeta({ title: 'Ochrana osobných údajov', description: 'Ako Rozia pracuje s osobnými údajmi: aké údaje spracúvame, prečo, ako dlho a aké máte práva.', path, noindex: !(legalReady && approvedDocuments.privacy) });

export default function PrivacyPage() {
  return (
    <LegalPage title="Ochrana osobných údajov" path={path} updated="24. 11. 2026" draft={!(legalReady && approvedDocuments.privacy)}>
      <h2>Kto je prevádzkovateľ</h2>
      <p><Operator />. So žiadosťami o údajoch sa obráťte na <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
      <p>Rovnaký prevádzkovateľ prevádzkuje aj kalkulačku <a href="https://nacenime.sk">nacenime.sk</a>. Ak tam požiadate o kontakt makléra, vaše údaje spracúvame v našom systéme pre maklérov (CRM) na rozia.sk podľa týchto zásad.</p>
      <h2>Aké údaje spracúvame a prečo</h2>
      <ul>
        <li><strong>Formulár ocenenia na rozia.sk:</strong> meno, telefón, voliteľne e-mail, adresa a parametre nehnuteľnosti, plánovaný čas predaja. Účel: vypracovať ocenenie a kontaktovať vás s výsledkom. Právny základ: váš súhlas.</li>
        <li><strong>Kontaktný formulár a dopyt:</strong> meno, telefón, voliteľne e-mail a text správy. Účel: vybaviť vašu správu. Právny základ: váš súhlas, prípadne kroky pred uzavretím zmluvy na vašu žiadosť.</li>
        <li><strong>Záujem o spoluprácu (kariéra):</strong> meno, telefón, voliteľne e-mail a text správy. Účel: dohodnúť rozhovor.</li>
        <li><strong>Štvrťročná cenová mapa e-mailom:</strong> e-mail, len ak ste zaškrtli samostatný nepovinný súhlas.</li>
        <li><strong>Žiadosť o kontakt z nacenime.sk (CRM):</strong> meno (ak ho zadáte), telefón alebo e-mail, údaje odhadu a nehnuteľnosti (adresa, typ, výmera, stav, odhad ceny), pridelený maklér a priebeh komunikácie. Účel: vybaviť vašu žiadosť, kontaktovať vás a pripraviť prípadnú spoluprácu. Právny základ: vaša žiadosť o kontakt, teda kroky pred uzavretím zmluvy (čl. 6 ods. 1 písm. b GDPR); pri zaslaní PDF s odhadom váš súhlas s kontaktovaním (písm. a).</li>
        <li><strong>Spolupráca s maklérom:</strong> údaje potrebné na zmluvu o sprostredkovaní a jej plnenie (meno, kontakt, adresa, údaje o nehnuteľnosti, zmluvná dokumentácia). Právny základ: plnenie zmluvy a zákonné povinnosti (čl. 6 ods. 1 písm. b a c).</li>
        <li><strong>Uchovanie kontaktu po nedohode o spolupráci:</strong> meno, priezvisko, kontakt, stručný popis nehnuteľnosti a dôvod ukončenia rokovania. Účel: vedieť sa vám ozvať, ak sa rozhodnete vrátiť. Právny základ: náš oprávnený záujem (čl. 6 ods. 1 písm. f). Môžete namietať.</li>
        <li><strong>Sprostredkovanie financovania:</strong> meno, kontakt, údaje o nehnuteľnosti a priebeh vybavovania. Účel: ponúknuť a vybaviť pomoc s financovaním v súvislosti s vašou nehnuteľnosťou. Právny základ: vaša žiadosť a kroky pred uzavretím zmluvy (písm. b), prípadne náš oprávnený záujem na poskytnutí súvisiacej služby (písm. f). Môžete namietať.</li>
        <li><strong>Technické údaje a záznamy o prístupe:</strong> adresa stránky, z ktorej bol formulár odoslaný, typ prehliadača a záznamy o tom, kto kedy zobrazil alebo zmenil údaje v CRM. Účel: preukázať súhlas, chrániť údaje pred zneužitím a vedieť doložiť zákonnosť spracúvania. Právny základ: oprávnený záujem (písm. f).</li>
      </ul>
      <p>Spolu so súhlasom ukladáme jeho presné znenie a čas udelenia, aby sme ho vedeli preukázať.</p>
      <h2>Ako dlho údaje uchovávame</h2>
      <ul>
        <li>Dopyty z formulárov na rozia.sk najdlhšie <strong>12 mesiacov</strong> od odoslania.</li>
        <li>Žiadosť o kontakt z nacenime.sk, ktorá neprerástla do spolupráce, najviac <strong>24 mesiacov</strong> od zadania.</li>
        <li>Kontakt a popis nehnuteľnosti po nedohode o spolupráci <strong>24 mesiacov</strong> od ukončenia rokovania. Potom údaje nevratne anonymizujeme.</li>
        <li>Pri spolupráci po dobu jej trvania a potom po dobu, ktorú ukladajú právne predpisy.</li>
        <li>Technické kópie prijatých žiadostí <strong>30 dní</strong> a záznamy o prístupe a zmenách <strong>36 mesiacov</strong>.</li>
      </ul>
      <p>Po uplynutí lehoty údaje vymažeme alebo nevratne anonymizujeme. Skôr, ak o to požiadate alebo odvoláte súhlas.</p>
      <h2>Komu údaje poskytujeme</h2>
      <p>Údaje vidia len oprávnené osoby spoločnosti NajBývanie Ružomberok, s. r. o.: maklér, ktorému je vaša požiadavka pridelená (podľa lokality nehnuteľnosti, pri jeho neprítomnosti iný maklér), administrátori systému a pri vybavovaní financovania pracovník finančného oddelenia. Prístup je obmedzený podľa roly a dôležité prístupy a zmeny sa zaznamenávajú.</p>
      <p>Technickú prevádzku zabezpečujú sprostredkovatelia: Supabase (databáza v EÚ, Frankfurt) a Vercel (hosting webu a aplikácie). Údaje nepredávame. Pri sprostredkovateľoch zo Spojených štátov môže dôjsť k prenosu na základe rozhodnutia Európskej komisie o primeranosti (EU-US Data Privacy Framework) alebo štandardných zmluvných doložiek.</p>
      <h2>Vaše práva</h2>
      <ul>
        <li>kedykoľvek odvolať súhlas – stačí e-mail na {site.email},</li>
        <li>žiadať prístup k údajom, ich opravu, vymazanie alebo obmedzenie spracúvania (vymazanie vykonáme vo všetkých našich systémoch, aj v kalkulačke nacenime.sk),</li>
        <li>žiadať prenos údajov a namietať proti spracúvaniu založenému na našom oprávnenom záujme,</li>
        <li>podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</li>
      </ul>
      <h2>Cookies</h2>
      <p>Používanie cookies popisuje stránka <a href="/cookies/">Cookies</a>.</p>
    </LegalPage>
  );
}
