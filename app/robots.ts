import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/** Filtračné parametre sa neindexujú. Stránkovanie (?strana=) zostáva povolené. */
const FILTER_PARAMS = ['cena-do', 'izby', 'plocha-od', 'sort', 'adresa', 'lokalita'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: FILTER_PARAMS.flatMap((p) => [`/*?${p}=`, `/*&${p}=`]) }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
