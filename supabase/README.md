# Supabase (región eu-central-1, Frankfurt)

## Poradie spustenia (SQL Editor, jeden súbor po druhom)

1. `migrations/0001_public_web.sql`: verejný web (makléri, ponuky, predaje, leady).
2. `migrations/0002_crm_core.sql`: CRM jadro (pobočky, zamestnanci, klienti, ocenenia, nábory, financovanie, dokumenty, audit, RLS).
3. `migrations/0003_hardening.sql`: spevnenie: pohľad `comparables` už nie je verejný, kontroly rolí bezpečné voči NULL, záložné pobočky.
4. `migrations/0004_hardening_handoff.sql`: oprava práv na funkcie (audit už nie je volateľný zvonka), ochrana stĺpcov ocenení,
   Nepridelené aj bez pobočky, kontakt Financií len pri nábore, odovzdanie kolegovi, dostupnosť makléra.
5. Len staging: `seed/staging_staff.sql`: pobočky a role pre testovacie účty `admin@`, `makler@`, `financie@test.rozia.sk`
   (účty najprv vytvor v Authentication → Users s „Auto Confirm User“).
6. `tests/rls_crm.sql` a `tests/rls_crm_2.sql` (po 0004): testy oprávnení. Všetko beží v transakcii a vráti sa (ROLLBACK), úspech = výsledok `VŠETKY TESTY PRESLI`.

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
```

Simulácia nenahrádza skúšku na skutočnom Supabase. Po nasadení na staging spusti oba testy v SQL Editore a ručne over, že
verejný (anon) kľúč nevie volať `rpc/audit`, `rpc/claim_unassigned` ani ďalšie funkcie CRM (odpoveď 401/403 alebo „permission denied“).

## Pravidlo pre nové funkcie
Každá nová funkcia v schéme `public` dostane hneď `revoke all on function ... from public, anon, authenticated;` a `grant execute ... to authenticated`
len ak ju má volať prihlásený používateľ (a vo vnútri si kontroluje rolu). Test N9 zlyhá, ak nejaká funkcia ostane volateľná anonymom.
