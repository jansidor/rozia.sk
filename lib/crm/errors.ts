/**
 * Chybové hlásenia z databázových funkcií CRM sú po slovensky a určené používateľovi. Prejdú len známe;
 * všetko ostatné (technické chyby, práva, sieť) sa nahradí všeobecnou vetou, aby sa nič interné nezobrazilo.
 */
const KNOWN: readonly string[] = [
  'Len maklér si môže prevziať ocenenie',
  'Limit: 1 prevzatie z Nepridelených za 24 hodín',
  'Ocenenie nie je voľné alebo patrí inej pobočke',
  'Prideľovať môže len admin',
  'Archivované ocenenie sa nedá prideliť',
  'Cieľ musí byť aktívny a dostupný maklér',
  'Pri stave „Nerieši sa“ treba uviesť dôvod',
  'Klient nemá nábor',
  'Nedostatočné oprávnenie',
  'Ocenenie neexistuje',
  'Nábor neexistuje',
];

export const GENERIC_ERROR = 'Akcia sa nepodarila. Skúste to znova, alebo napíšte správcovi.';

export function friendlyError(message: string | null | undefined): string {
  const m = (message ?? '').trim();
  return KNOWN.includes(m) ? m : GENERIC_ERROR;
}
