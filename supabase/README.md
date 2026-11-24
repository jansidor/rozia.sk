# Supabase (región eu-central-1, Frankfurt)

## Poradie spustenia (SQL Editor, jeden súbor po druhom)

1. `migrations/0001_public_web.sql`: verejný web (makléri, ponuky, predaje, leady).
2. `migrations/0002_crm_core.sql`: CRM jadro (pobočky, zamestnanci, klienti, ocenenia, nábory, financovanie, dokumenty, audit, RLS).
3. `migrations/0003_hardening.sql`: spevnenie: pohľad `comparables` už nie je verejný, kontroly rolí bezpečné voči NULL, záložné pobočky.
4. `migrations/0004_hardening_handoff.sql`: oprava práv na funkcie (audit už nie je volateľný zvonka), ochrana stĺpcov ocenení,
   Nepridelené aj bez pobočky, kontakt Financií len pri nábore, odovzdanie kolegovi, dostupnosť makléra.
5. `migrations/0005_lifecycle.sql`: archív nedohodnutých náborov s obnovením a anonymizáciou po 24 mesiacoch, vrátený klient
   (zhoda od 80 %), pridelenie ocenení (ručne admin, automatické striedanie pripravené a vypnuté), návrh dokumentov, číselník obcí.
6. `migrations/0006_inbound.sql`: príjem leadov z nacenime (uloženie surovej udalosti, vytvorenie klienta a ocenenia, pobočka podľa obce, opakovanie a čistenie).
7. `migrations/0007_retention.sql`: uchovávanie údajov podľa zásad (neaktívne leady 24 mesiacov, dopyty z webu 12 mesiacov, audit 36 mesiacov) a `run_retention()`.
8. `seed/branches.sql`: 4 pobočky, záložná pobočka a okresy (bezpečné aj na produkcii, idempotentné).
9. Len staging: `seed/staging_staff.sql`: pobočky a role pre testovacie účty `admin@`, `makler@`, `financie@test.rozia.sk`
   (účty najprv vytvor v Authentication → Users s „Auto Confirm User“).
10. `tests/rls_crm.sql`, `rls_crm_2.sql` (po 0004), `rls_crm_3.sql` (po 0005), `rls_crm_4.sql` (po 0006) a `rls_crm_5.sql` (po 0007): testy oprávnení a pravidiel. Všetko beží v transakcii a vráti sa (ROLLBACK), úspech = výsledok `VŠETKY TESTY PRESLI`.

## Dôležité

- `SUPABASE_SERVICE_ROLE_KEY` je len serverový kľúč (zápis leadov a čítanie `comparables` pre odhad ceny). Nikdy nie `NEXT_PUBLIC_`.
- Po 0003 verejný (anon) kľúč pohľad `comparables` nečíta: bez servisného kľúča na serveri odhad ceny nemá z čoho počítať
  a web ponúkne „ocenenie maklérom“.
- Tabuľky CRM nemajú žiadnu verejnú politiku; web ich nikdy nečíta anonymne.
- Supabase Security Advisor upozorní na funkcie `SECURITY DEFINER` (`app_role`, `claim_unassigned`, `set_financing_status`, …).
  Sú zámerné, majú pevný `search_path`, kontrolu roly a odobraté práva pre verejnosť (testy `A9`, `E2`–`E4`, `G7`).

## Lokálne overenie bez Supabase

Migrácie aj testy sa dajú pustiť na obyčajnom Postgrese 16 so simuláciou rolí `anon`, `authenticated`, `service_role`
a schémy `auth` (`auth.uid()`, `auth.role()`, `auth.users`). Takto boli overené pred odovzdaním.

## Testy bez Supabase (lokálne a v CI)

`tests/bootstrap_local.sql` vytvorí na obyčajnom Postgrese 16 role `anon`, `authenticated`, `service_role`, schému `auth` a rovnaké predvolené
práva ako Supabase. Potom pusti migrácie v poradí a oba testy (`.github/workflows/ci.yml` robí presne toto). Nikdy ho nespúšťaj na Supabase.

```bash
createdb rozia_test
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/bootstrap_local.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d rozia_test -f "$f"; done
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/rls_crm.sql
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/rls_crm_2.sql
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/rls_crm_3.sql
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/rls_crm_4.sql
psql -v ON_ERROR_STOP=1 -q -d rozia_test -f supabase/tests/rls_crm_5.sql
```

Simulácia nenahrádza skúšku na skutočnom Supabase. Po nasadení na staging spusti oba testy v SQL Editore a ručne over, že
verejný (anon) kľúč nevie volať `rpc/audit`, `rpc/claim_unassigned` ani ďalšie funkcie CRM (odpoveď 401/403 alebo „permission denied“).

## Pravidlo pre nové funkcie
Každá nová funkcia v schéme `public` dostane hneď `revoke all on function ... from public, anon, authenticated;` a `grant execute ... to authenticated`
len ak ju má volať prihlásený používateľ (a vo vnútri si kontroluje rolu). Test N9 zlyhá, ak nejaká funkcia ostane volateľná anonymom.

## Funkcie pre aplikáciu a pre server (0005)
Prihlásený používateľ (kontrolu roly robí funkcia): `close_mandate_unagreed(nábor, dôvod)`, `restore_mandate(nábor)`,
`returning_client_check(ocenenie)`, `link_returning_client(ocenenie, klient, obnovený_nábor)`, `assign_valuation(ocenenie, maklér, poznámka)` (len admin),
`suggest_documents(nábor)`, `branch_for_municipality(obec, okres)`.
Len server (service role, nie prihlásený používateľ): `auto_assign_valuation(ocenenie)` (volá po uložení nového ocenenia; robí niečo len keď
`app_settings.assignment_mode = 'round_robin'`) a `anonymize_archived(mesiace)` (naplánovaná úloha, napr. denne). Súbory, ktoré treba zmazať vo Storage,
zapisuje databáza do `storage_cleanup`; server ich maže a nastaví `done_at`.
Nastavenia (`app_settings`): `assignment_mode` (`manual` / `round_robin`), `archive_retention_months` (24), `return_match_threshold` (0.8). Mení admin.
Ocenenie z nacenime má do `valuations.payload` ukladať adresu pod kľúčom `adresa`, inak sa pri vrátenom klientovi adresa neporovnáva.

## Príjem leadov z nacenime (0006 a route)
Adresa pre `NACENIME_LEAD_WEBHOOK` v nacenime: `https://<doména rozia>/api/inbound/nacenime/` **s lomkou na konci**. Web má zapnuté `trailingSlash`; bez lomky
príde presmerovanie 308, ktoré nacenime nenasleduje, a doručenie by zlyhávalo (overené na bežiacom serveri).
Route (`app/api/inbound/nacenime/route.ts`) overí podpis zo surového tela (`lib/webhook.ts`, zhoda s PHP v nacenime overená testovacím vektorom), potom zavolá databázovú
funkciu `ingest_nacenime_event`. Odpovede: 200 uložené (aj keď spracovanie skončilo chybou: udalosť ostane v `inbound_events` so stavom `error`), 401 zlý podpis,
400 zlé telo alebo ID udalosti, 413 príliš veľké, 500 databáza nedostupná (nacenime doručenie zopakuje), 503 chýba nastavenie.
Funkcie len pre server (service role): `process_inbound_event`, `ingest_nacenime_event`, `retry_inbound_errors()` (chybné udalosti po oprave príčiny) a
`scrub_inbound_events(dni)` (po spracovaní vymaže z udalosti osobné údaje, predvolene po 30 dňoch; pustiť z naplánovanej úlohy).
Chybné udalosti sleduj: `select event_id, error, received_at from inbound_events where status = 'error'`.

## Uchovávanie údajov (0007 a denná údržba)
Zverejnené zásady ochrany osobných údajov sľubujú lehoty a tá databáza ich vynucuje. `run_retention()` (len server) denne: anonymizuje nedohodnuté nábory po 24 mesiacoch od
ukončenia (`anonymize_archived`), anonymizuje leady z nacenime bez spolupráce po 24 mesiacoch od zadania (`anonymize_stale_leads`), čistí telá prijatých udalostí po 30 dňoch,
maže dopyty z webu po 12 mesiacoch a audit po 36 mesiacoch. Lehoty sú v `app_settings` (`archive_retention_months`, `lead_retention_months`, `web_lead_retention_months`,
`audit_retention_months`, `inbound_scrub_days`); **ak ich zmeníš, zmeň aj zásady na webe**. Funkciu spúšťa Vercel Cron (`vercel.json`, route `/api/cron/retention/`,
tajomstvo `CRON_SECRET`). Bez nastaveného `CRON_SECRET` sa údržba nespustí, preto ho nastav pred zapnutím prenosu leadov.
Súbory vo Storage na zmazanie sú zatiaľ len vo fronte `storage_cleanup` (Storage s dokumentmi ešte nie je nasadený); výsledok údržby ukazuje počet čakajúcich súborov.

## CRM aplikácia (`/crm/`)
Interná aplikácia v tom istom projekte, oddelená od verejného webu: vlastný koreňový layout (`app/crm/layout.tsx`), neindexuje sa (`noindex`, `robots.txt`), cesty `/crm/…`.
Prihlásenie e-mailom a heslom cez Supabase Auth (relácia v httpOnly cookies, `@supabase/ssr`). `proxy.ts` obnoví reláciu a neprihláseného pošle na `/crm/login/`.
Oprávnenia vynucuje databáza (RLS a funkcie z migrácií); menu podľa roly je len pohodlie.

| Obrazovka | Rola | Čo robí |
|---|---|---|
| `/crm/` | všetci | prehľad s počtami |
| `/crm/ocenenia/` | maklér | moje pridelené ocenenia s kontaktom klienta |
| `/crm/nepridelene/` | maklér | Nepridelené, tlačidlo „Vziať si“ (`claim_unassigned`, limit 1 za 24 h) |
| `/crm/nabory/` | maklér, admin | zoznam náborov (maklér vlastné, admin všetky) |
| `/crm/pridelenie/` | admin | ocenenia na pridelenie, výber makléra (`assign_valuation`), navrhnutá pobočka |
| `/crm/financovanie/` a `/crm/financovanie/<id>/` | financie, admin | zoznam náborov, kontakt klienta (`finance_view_client`, zapisuje sa do auditu), stav financovania, poznámky |

Zatiaľ chýba: vytvorenie náboru z ocenenia, archív a obnova náboru, vrátený klient, odovzdanie kolegovi, knižnica a vyplnenie dokumentov (funkcie sú v databáze, chýbajú obrazovky).
Vyskúšanie na testovacom Supabase: vo Verceli (Preview) nastav `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, otvor `/crm/` a prihlás sa testovacím účtom (admin, maklér, financie zo seedu).
