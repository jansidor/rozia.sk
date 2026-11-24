# Prostredia: testovací Supabase (staging) a Vercel preview

Návod pre majiteľa. Žiadne kľúče sa nepíšu do repa ani do chatu. Hodnoty patria do `.env.local` (necommitovať) a do Vercelu.

## 1. Testovací Supabase projekt
1. supabase.com → New project. Región **eu-central-1 (Frankfurt)**. Názov napr. `rozia-staging`. Silné databázové heslo ulož do správcu hesiel.
2. Authentication → Providers → Email: zapni, vypni verejnú registráciu (Allow new users to sign up = vypnuté). Účty zakladá admin.
3. SQL Editor: spusti po jednom súbore `supabase/migrations/0001` až `0007`, potom `supabase/seed/branches.sql` (pobočky a okresy) a testy `supabase/tests/rls_crm.sql`, `rls_crm_2.sql` a `rls_crm_3.sql`.
   `bootstrap_local.sql` na Supabase **nespúšťaj**. Úspech testov je výsledok „VŠETKY TESTY PRESLI“, „VŠETKY TESTY 0004 PRESLI“ a „VŠETKY TESTY 0005 PRESLI“.
4. Authentication → Users → Add user (Auto Confirm User): `admin@test.rozia.sk`, `makler@test.rozia.sk`, `financie@test.rozia.sk`.
   Potom spusti `supabase/seed/staging_staff.sql` (role testovacích účtov). Kontrola: výsledok má 3 riadky.
5. Ručná kontrola práv: s verejným (anon) kľúčom skús `rpc/audit`, `rpc/claim_unassigned`, `rpc/set_financing_status` (REST). Všetky musia zlyhať.
6. Settings → API: skopíruj Project URL, `anon` kľúč a `service_role` kľúč (ten je tajný, nikdy `NEXT_PUBLIC_`).

## 2. Premenné prostredia (len názvy)
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NACENIME_WEBHOOK_SECRET` (a pri výmene `NACENIME_WEBHOOK_SECRET_PREVIOUS`), `CRON_SECRET`, `ROZIA_DEMO_DATA` (staging 0 alebo 1, produkcia vždy 0).
Tajomstvo webhooku zadáva človek sám priamo vo Verceli (rovnaká hodnota ako `NACENIME_LEAD_WEBHOOK_SECRET` v `shared/.env` nacenime); formát popisuje `docs/WEBHOOK.md` v repe nacenime. Adresa webhooku končí lomkou: `https://<doména>/api/inbound/nacenime/`.

## 3. Vercel
1. Projekt napoj na repo, vetvy a pull requesty dostanú Preview prostredie.
2. Settings → Environment Variables: premenné z bodu 2 nastav **pre Preview** hodnotami zo stagingu, **pre Production** až s ostrým projektom.
3. Najprv nasaď kód a nastav `SUPABASE_SERVICE_ROLE_KEY`, až potom spusti migráciu `0003` na databáze (inak odhad ceny prestane fungovať).

## 4. Ostrá produkcia (až po rozhodnutí majiteľa)
- Supabase plán so zálohami (Pro, PITR) a overené obnovenie zálohy.
- Rovnaké migrácie v poradí, potom testy. Seed zo stagingu sa v produkcii **nespúšťa**.
- Zásady ochrany osobných údajov a údaje firmy na webe (pozri `lib/site.ts`).

## 5. Denná údržba (uchovávanie údajov)
Vercel Cron volá denne `/api/cron/retention/` (vercel.json). Nastav vo Verceli `CRON_SECRET` (min. 16 znakov, `openssl rand -hex 32`); Vercel ho pošle v hlavičke
`Authorization: Bearer ...`. Údržba maže a anonymizuje podľa zverejnených zásad ochrany osobných údajov. Po prvom nasadení skontroluj v Vercel → Cron Jobs, že úloha prebehla.
