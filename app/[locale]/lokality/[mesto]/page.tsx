import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cities, getCity } from '@/lib/localities';
import { pageMeta } from '@/lib/meta';
import { LocalityGuide, localityHasData } from '@/components/locality-guide';

export const revalidate = 3600;
type Props = { params: Promise<{ mesto: string }> };
export const generateStaticParams = () => cities.map((c) => ({ mesto: c.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCity((await params).mesto);
  if (!city) return {};
  const { hasData } = await localityHasData(city.slug, null);
  return pageMeta({
    title: `Byty ${city.locative}: ceny, ponuka a život v lokalite`,
    description: `${city.name}: medián ceny bytov za m², aktuálna ponuka, predané nehnuteľnosti a informácie o lokalite od miestneho makléra.`,
    path: `/lokality/${city.slug}/`,
    noindex: !hasData,
  });
}

export default async function CityPage({ params }: Props) {
  const city = getCity((await params).mesto);
  if (!city) notFound();
  return <LocalityGuide city={city} part={null} />;
}
