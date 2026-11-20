# rozia.sk

Verejný web realitnej kancelárie **Rozia** (Liptov). Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Supabase, MapLibre GL.

## Spustenie

```bash
npm install
cp .env.example .env.local
npm run dev
```

Bez Supabase web beží s prázdnymi dátami (bloky s číslami sa skryjú). Na dizajnový náhľad s ukážkovými dátami nastavte `ROZIA_DEMO_DATA=1` – v produkcii (`VERCEL_ENV=production`) sa ukážkové dáta nikdy nenačítajú.

| Príkaz | Čo robí |
|---|---|
| `npm run build` | produkčný build |
| `npm run typecheck` | TypeScript strict |
| `npm test` | testy vzorcov (kalkulačka príjmu, odhad ceny, formáty, validácia) |
| `npm run check:contrast` | overí kontrast farebných tokenov podľa WCAG 2.2 AA |

## Pred spustením do produkcie

1. **`lib/site.ts`** – doplňte telefón, výšku provízie a zákonnú identifikáciu (obchodné meno, sídlo, IČO, register). Kým chýba, právne stránky sú označené ako návrh a neindexujú sa; údaj s hodnotou `null` sa na webe nezobrazí.
2. **Supabase** (región Frankfurt) – spustite `supabase/migrations/0001_public_web.sql`, nastavte premenné z `.env.example` vo Verceli. `SUPABASE_SERVICE_ROLE_KEY` je len serverový (zápis leadov).
3. **Právna kontrola** – obchodné podmienky, ochranu osobných údajov a texty o odstúpení od zmluvy musí schváliť advokát.
4. **Koeficienty odhadu** v `lib/valuation.ts` sú východiskové odhady; kalibrujte ich na vlastných predajoch a zmeňte `VALUATION_VERSION`.

## Ako to drží pokope

- **Žiadne vymyslené čísla.** Pás dôkazov, predané, cenová mapa a lokality čítajú len reálne dáta; bez nich sa blok skryje alebo ukáže „Zatiaľ nemáme dosť dát“. Predaj sa zverejní len s `sales.client_consent = true` (vynucuje aj RLS).
- **Routing a jazyky.** Stránky sú v `app/[locale]/`. Slovenčina beží bez prefixu, `proxy.ts` ju interne mapuje na `/sk/`. Ďalší jazyk = pridať kód do `locales` v `lib/i18n.ts` a preložiť obsah.
- **Filtre** (`?cena-do=`, `?izby=`, `?plocha-od=`, `?sort=`) žijú v URL, sú zakázané v `robots.txt`, nemajú canonical a kombinácia bez výsledku vracia 404.
- **Odhad ceny** (`lib/valuation.ts`): vážený medián €/m² porovnateľných bytov × koeficienty, rozsah ±7 % (≥ 10 porovnaní) alebo ±10 % (5–9). Menej než 5, alebo dom/chata/pozemok → „ocenenie maklérom“.
- **Kalkulačka príjmu** (`lib/income.ts`): podiel 60/70/80 % podľa hrubej provízie za 12 mesiacov; parametre sú v `lib/site.ts`.
- **Mapa** sa načíta až na klik (OpenFreeMap, bez API kľúča); rovnaké údaje sú vždy aj v tabuľke.
- **Budúce moduly** (CRM, AML, online podpis, klientsky portál) sa pripoja cez `agents.id`, `listings.id`, `leads.id`; tabuľky majú pripravený `org_id` na pobočky.

## Štruktúra

```
app/[locale]/…        stránky podľa sitemapy
app/actions.ts        server actions (odhad, leady) + zod validácia
components/           UI a bloky stránok
content/              statické texty (FAQ, kariéra)
lib/                  dáta (Supabase), vzorce, formáty, JSON-LD, lokality
supabase/migrations/  schéma databázy
```
