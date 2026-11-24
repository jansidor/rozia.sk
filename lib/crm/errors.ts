/**
 * Chybové hlásenia z databázových funkcií CRM sú po slovensky a určené používateľovi. Prejdú len známe;
 * všetko ostatné (technické chyby, práva, sieť) sa nahradí všeobecnou vetou, aby sa nič interné nezobrazilo.
 * Test (tests/crm.test.ts) kontroluje, že každé hlásenie v migráciách je tu alebo v INTERNAL, takže nové hlásenie sa nedá zabudnúť zaradiť.
 */
export const KNOWN: readonly string[] = [
  'Archivované ocenenie sa nedá prideliť',
  'Cieľ musí byť aktívny a dostupný maklér',
  'Klient nemá nábor',
  'Klient nemá rovnaký telefón ani e-mail ako klient ocenenia',
  'Len maklér si môže prevziať ocenenie',
  'Limit: 1 prevzatie z Nepridelených za 24 hodín',
  'Maklér smie meniť len stav a klienta ocenenia',
  'Nedostatočné oprávnenie',
  'Nábor je už anonymizovaný, údaje klienta sa obnoviť nedajú',
  'Nábor k tomuto oceneniu už existuje',
  'Nábor môže vytvoriť len maklér',
  'Nábor neexistuje',
  'Nábor nepatrí tomuto klientovi',
  'Nábor nie je aktívny',
  'Nábor nie je váš',
  'Nábor sa dá vytvoriť len z prideleného ocenenia',
  'Nábor už patrí tomuto maklérovi',
  'Obnoviť môžete len svoj nábor',
  'Obnoviť sa dá len nedohodnutý nábor',
  'Obnoviť sa dá len nedohodnutý nábor, ktorý nie je anonymizovaný',
  'Ocenenie neexistuje',
  'Ocenenie nemá klienta',
  'Ocenenie nie je pridelené',
  'Ocenenie nie je pridelené vám',
  'Ocenenie nie je voľné alebo patrí inej pobočke',
  'Ocenenie už nie je voľné',
  'Ocenenie už patrí tomuto maklérovi',
  'Odovzdať môžete len svoj nábor',
  'Odovzdať môžete len svoje ocenenie',
  'Odovzdať sa dá len pridelené ocenenie',
  'Pri stave „Nerieši sa“ treba uviesť dôvod',
  'Prideľovať môže len admin',
  'Treba uviesť dôvod',
  'Uzavrieť môžete len svoj nábor',
];

/** Hlásenia, ktoré používateľ nikdy nemá vidieť (volá ich len server alebo ide o technickú chybu). */
export const INTERNAL: readonly string[] = [
  'Chýba platné id leadu',
  'ID udalosti nesedí s telom',
  'Lead bez telefónu a bez súhlasu s kontaktovaním',
  'Lead nemá kontakt',
  'Len server',
  'Neplatná cena',
  'Neplatná výmera',
  'Neplatné ID udalosti',
  'Povolené stavy: available, away',
  'Stav financovania sa mení len cez set_financing_status()',
  'Telo udalosti nie je objekt',
  'Udalosť neexistuje',
];

export const GENERIC_ERROR = 'Akcia sa nepodarila. Skúste to znova, alebo napíšte správcovi.';

export function friendlyError(message: string | null | undefined): string {
  const m = (message ?? '').trim();
  return KNOWN.includes(m) ? m : GENERIC_ERROR;
}
