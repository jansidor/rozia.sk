import { notFound } from 'next/navigation';

/** Zachytí neexistujúce adresy, aby dostali lokalizovanú 404 s hlavičkou a pätičkou. */
export default function CatchAll() {
  notFound();
}
