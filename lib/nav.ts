export const mainNav = [
  { href: '/predaj/', label: 'Predaj' },
  { href: '/prenajom/', label: 'Prenájom' },
  { href: '/predat-nehnutelnost/', label: 'Predať nehnuteľnosť' },
  { href: '/cenova-mapa-liptova/', label: 'Cenová mapa' },
  { href: '/makleri/', label: 'Makléri' },
  { href: '/kariera/', label: 'Kariéra' },
] as const;

export const footerNav = [
  {
    title: 'Ponuka',
    links: [
      { href: '/predaj/', label: 'Nehnuteľnosti na predaj' },
      { href: '/prenajom/', label: 'Nehnuteľnosti na prenájom' },
      { href: '/predane/', label: 'Predané' },
      { href: '/lokality/', label: 'Lokality Liptova' },
      { href: '/cenova-mapa-liptova/', label: 'Cenová mapa Liptova' },
    ],
  },
  {
    title: 'Služby',
    links: [
      { href: '/predat-nehnutelnost/', label: 'Predať nehnuteľnosť' },
      { href: '/predat-nehnutelnost/ocenenie/', label: 'Ocenenie nehnuteľnosti' },
      { href: '/kupujem/', label: 'Kupujem' },
      { href: '/sprievodca/', label: 'Sprievodca' },
    ],
  },
  {
    title: 'Rozia',
    links: [
      { href: '/o-nas/', label: 'O nás' },
      { href: '/makleri/', label: 'Makléri' },
      { href: '/kariera/', label: 'Kariéra' },
      { href: '/kariera/kalkulacka-prijmu/', label: 'Kalkulačka príjmu makléra' },
      { href: '/kontakt/', label: 'Kontakt' },
    ],
  },
] as const;

export const legalNav = [
  { href: '/obchodne-podmienky/', label: 'Obchodné podmienky' },
  { href: '/ochrana-osobnych-udajov/', label: 'Ochrana osobných údajov' },
  { href: '/cookies/', label: 'Cookies' },
  { href: '/vyhlasenie-o-pristupnosti/', label: 'Vyhlásenie o prístupnosti' },
] as const;
