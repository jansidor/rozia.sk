'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';
import { ButtonLink } from './ui/button';
import { mainNav } from '@/lib/nav';
import { cn } from '@/lib/cn';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-white/95 backdrop-blur">
      <a href="#obsah" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-green-950 focus:px-4 focus:py-2.5 focus:text-white">
        Preskočiť na obsah
      </a>
      <div className="container-page flex h-18 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Hlavná navigácia" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-green-950 hover:bg-green-50 aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-green-500 aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/kontakt/" variant="quiet" className="hidden text-green-950 sm:inline-flex xl:inline-flex">
            Kontakt
          </ButtonLink>
          <ButtonLink href="/predat-nehnutelnost/ocenenie/" size="sm" className="hidden sm:inline-flex">
            Zistiť cenu
          </ButtonLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobilne-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-lg text-green-950 hover:bg-green-50 xl:hidden"
          >
            {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            <span className="sr-only">{open ? 'Zavrieť menu' : 'Otvoriť menu'}</span>
          </button>
        </div>
      </div>
      <nav id="mobilne-menu" aria-label="Mobilná navigácia" hidden={!open} className={cn('border-t border-subtle bg-white xl:hidden', open && 'block')}>
        <ul className="container-page max-h-[calc(100dvh-4.5rem)] overflow-y-auto py-3">
          {[...mainNav, { href: '/kontakt/', label: 'Kontakt' }].map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined} className="flex min-h-12 items-center rounded-lg px-2 text-lg font-medium hover:bg-green-50 aria-[current=page]:font-semibold">
                {item.label}
              </Link>
            </li>
          ))}
          <li className="pt-3 pb-2">
            <ButtonLink href="/predat-nehnutelnost/ocenenie/" full>
              Zistiť cenu nehnuteľnosti
            </ButtonLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
