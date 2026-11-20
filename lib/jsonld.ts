import { site } from './site';
import type { Listing } from './types';

const abs = (path: string) => `${site.url}${path}`;
export const AGENCY_ID = `${site.url}/#agency`;

export function agencyLd() {
  return {
    '@type': ['RealEstateAgent', 'LocalBusiness'],
    '@id': AGENCY_ID,
    name: site.name,
    url: `${site.url}/`,
    logo: abs('/logo-mark.png'),
    image: abs('/logo-mark.png'),
    ...(site.phone ? { telephone: site.phone } : {}),
    email: site.email,
    address: { '@type': 'PostalAddress', addressLocality: site.city, addressCountry: 'SK' },
    areaServed: [
      { '@type': 'City', name: 'Ružomberok' },
      { '@type': 'City', name: 'Liptovský Mikuláš' },
      { '@type': 'City', name: 'Liptovský Hrádok' },
      { '@type': 'AdministrativeArea', name: 'Liptov' },
    ],
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path) })),
  };
}

export const listingPath = (l: Pick<Listing, 'slug' | 'id'>) => `/nehnutelnost/${l.slug}-${l.id}/`;

export function listingLd(l: Listing) {
  return {
    '@type': 'RealEstateListing',
    url: abs(listingPath(l)),
    name: l.title,
    description: l.description.slice(0, 300),
    datePosted: l.publishedAt,
    ...(l.photos[0] ? { image: l.photos.map((p) => p.url) } : {}),
    offers: {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'EUR',
      availability: l.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      seller: { '@id': AGENCY_ID },
    },
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
