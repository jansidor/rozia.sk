# Supabase (región eu-central-1, Frankfurt)

## Poradie spustenia (SQL Editor, jeden súbor po druhom)

1. `migrations/0001_public_web.sql`: verejný web (makléri, ponuky, predaje, leady).
2. `migrations/0002_crm_core.sql`: CRM jadro (pobočky, zamestnanci, klienti, ocenenia, nábory, financovanie, dokumenty, audit, RLS).
3. `migrations/0003_hardening.sql`: spevnenie: pohľad `comparables` už nie je verejný, kontroly rolí bezpečné voči NULL, záložné pobočky.
4. Len staging: `seed/staging_staff.sql`: pobočky a role pre testovacie účty `admin@`, `makler@`, `financie@test.rozia.sk`
   (účty najprv vytvor v Authentication → Users s „Auto Confirm User“).
5. `tests/rls_crm.sql`: testy oprávnení. Všetko beží v transakcii a vráti sa (ROLLBACK), úspech = výsledok `VŠETKY TESTY PRESLI`.

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
