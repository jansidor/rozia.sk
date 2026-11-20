import type { Metadata } from 'next';
import { ListingHub, hubMetadata } from '@/components/listing-hub';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return hubMetadata({ transaction: 'predaj' }, await searchParams);
}

export default async function Page({ searchParams }: Props) {
  return <ListingHub params={{ transaction: 'predaj' }} search={await searchParams} />;
}
