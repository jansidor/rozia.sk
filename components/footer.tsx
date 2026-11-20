import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from './logo';
import { CookieSettingsButton } from './cookie-banner';
import { footerNav, legalNav } from '@/lib/nav';
import { site } from '@/lib/site';
import { telHref } from '@/lib/format';

const linkCls = 'inline-flex min-h-11 min-w-11 items-center text-[15px] text-white/85 underline-offset-4 hover:text-white hover:underline';

export function Footer() {
  const { legal } = site;
  const identity = [
    legal.companyName,
    legal.seat,
    legal.ico && `IČO: ${legal.ico}`,
    legal.dic && `DIČ: ${legal.dic}`,
    legal.icDph && `IČ DPH: ${legal.icDph}`,
    legal.register,
  ].filter(Boolean);

  return (
    <footer className="on-dark bg-green-900 text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark />
          <p className="mt-4 max-w-xs text-[15px] text-white/85">
            Realitná kancelária pre Liptov: Ružomberok, Liptovský Mikuláš, Liptovský Hrádok, Jasná a Liptovská Mara.
          </p>
          <address className="mt-5 space-y-1 text-[15px] not-italic">
            <p className="flex items-center gap-2.5 py-1.5">
              <MapPin aria-hidden className="size-5 shrink-0 text-green-400" />
              <span>{site.name}, {site.city}</span>
            </p>
            {site.phone && (
              <a href={telHref(site.phone)} className={`${linkCls} gap-2.5 tabular`}>
                <Phone aria-hidden className="size-5 shrink-0 text-green-400" />
                {site.phone}
              </a>
            )}
            <a href={`mailto:${site.email}`} className={`${linkCls} gap-2.5`}>
              <Mail aria-hidden className="size-5 shrink-0 text-green-400" />
              {site.email}
            </a>
          </address>
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-green-400">{group.title}</h2>
            <ul className="mt-3">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkCls}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="container-page py-6 text-sm text-white/85">
          <ul className="flex flex-wrap gap-x-6">
            {legalNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls.replace('text-[15px]', 'text-sm')}>{l.label}</Link>
              </li>
            ))}
            <li><CookieSettingsButton className={linkCls.replace('text-[15px]', 'text-sm')} /></li>
          </ul>
          {identity.length > 0 && <p className="mt-3">{identity.join(' · ')}</p>}
          <p className="mt-3">Orgán dozoru: {legal.supervisor}</p>
          <p className="mt-3">© {new Date().getFullYear()} {legal.companyName ?? site.name}</p>
        </div>
      </div>
    </footer>
  );
}
