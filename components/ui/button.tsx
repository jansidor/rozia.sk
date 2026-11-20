import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-disabled disabled:border-transparent',
  {
    variants: {
      variant: {
        /* biely text na #0D2B1D = 15,2:1 */
        primary: 'bg-green-950 text-white hover:bg-green-900',
        /* #0D2B1D na #5BA829 = 5,13:1 (biely text na brand zelenej je zakázaný) */
        brand: 'bg-green-500 text-green-950 hover:bg-green-400',
        secondary: 'border-2 border-green-950 bg-white text-green-950 hover:bg-green-50',
        quiet: 'text-green-700 underline-offset-4 hover:text-green-950 hover:underline px-2',
        onDark: 'border-2 border-white/70 text-white hover:bg-white hover:text-green-950',
      },
      size: { md: '', lg: 'min-h-13 px-7 text-lg', sm: 'px-4 text-sm' },
      full: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type Variants = VariantProps<typeof buttonStyles>;

export function Button({ variant, size, full, className, ...props }: ComponentProps<'button'> & Variants) {
  return <button className={cn(buttonStyles({ variant, size, full }), className)} {...props} />;
}

export function ButtonLink({ variant, size, full, className, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonStyles({ variant, size, full }), className)} {...props} />;
}
