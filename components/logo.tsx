import Image from 'next/image';
import Link from 'next/link';
import mark from '@/public/logo-mark.png';
import { cn } from '@/lib/cn';

export function Logo({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="Rozia – domov" className={cn('inline-flex min-h-11 items-center gap-2.5', className)}>
      <span className={cn('grid place-items-center', onDark && 'rounded-xl bg-white p-1')}>
        <Image src={mark} alt="" width={40} height={36} priority className="h-9 w-auto" />
      </span>
      <span className={cn('font-display text-2xl font-extrabold tracking-[0.04em]', onDark ? 'text-white' : 'text-green-950')}>
        ROZIA
      </span>
    </Link>
  );
}
