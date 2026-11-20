import type { Metadata } from 'next';
import { ListingHub, hubMetadata } from '@/components/listing-hub';

type Props = {
  params: Promise<{ typ: string; lokalita: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  return hubMetadata({ transaction: 'predaj', ...(await params) }, await searchParams);
}

export default async function Page({ params, searchParams }: Props) {
  return <ListingHub params={{ transaction: 'predaj', ...(await params) }} search={await searchParams} />;
}
