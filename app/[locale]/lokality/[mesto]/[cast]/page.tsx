import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cities, getCity, getPart } from '@/lib/localities';
import { pageMeta } from '@/lib/meta';
import { LocalityGuide, localityHasData } from '@/components/locality-guide';

export const revalidate = 3600;
type Props = { params: Promise<{ mesto: string; cast: string }> };
export const generateStaticParams = () => cities.flatMap((c) => c.parts.map((p) => ({ mesto: c.slug, cast: p.slug })));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesto, cast } = await params;
  const city = getCity(mesto);
  const part = getPart(mesto, cast);
  if (!city || !part) return {};
  const { hasData } = await localityHasData(city.slug, part.slug);
  return pageMeta({
    title: `Byty ${part.locative} (${city.name}): ceny, ponuka a život na sídlisku`,
    description: `${part.name}, ${city.name}: medián ceny bytov za m² podľa izieb a stavu, aktuálna ponuka, predané byty a komentár miestneho makléra.`,
    path: `/lokality/${city.slug}/${part.slug}/`,
    noindex: !hasData,
  });
}

export default async function PartPage({ params }: Props) {
  const { mesto, cast } = await params;
  const city = getCity(mesto);
  const part = getPart(mesto, cast);
  if (!city || !part) notFound();
  return <LocalityGuide city={city} part={part} />;
}
