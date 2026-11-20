import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { pageMeta } from '@/lib/meta';
import { site } from '@/lib/site';
import { telHref } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ContactForm } from '@/components/contact-form';

export const metadata = pageMeta({
  title: 'Kontakt',
  description: 'Kontakt na realitnú kanceláriu Rozia v Ružomberku. Napíšte nám, ozveme sa najneskôr nasledujúci pracovný deň.',
  path: '/kontakt/',
});

export default function ContactPage() {
  const { legal } = site;
  const identity = [legal.companyName, legal.seat, legal.ico && `IČO: ${legal.ico}`, legal.dic && `DIČ: ${legal.dic}`, legal.icDph && `IČ DPH: ${legal.icDph}`, legal.register].filter(Boolean);
  const row = 'flex min-h-11 items-center gap-3';
  return (
    <>
      <PageHeader crumbs={[{ name: 'Kontakt', path: '/kontakt/' }]} title="Kontakt" lead="Napíšte nám. Ozveme sa najneskôr nasledujúci pracovný deň." />
      <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-subtle bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-2xl">Napíšte nám</h2>
          <div className="mt-5"><ContactForm /></div>
        </div>
        <aside aria-label="Kontaktné údaje">
          <h2 className="text-2xl">{site.name}</h2>
          <address className="mt-4 not-italic">
            <p className={row}><MapPin aria-hidden className="size-5 text-green-700" />{site.city}, Liptov</p>
            {site.phone && (
              <a href={telHref(site.phone)} className={`${row} tabular font-semibold text-green-700 underline-offset-4 hover:text-green-950 hover:underline`}>
                <Phone aria-hidden className="size-5" />{site.phone}
              </a>
            )}
            <a href={`mailto:${site.email}`} className={`${row} font-semibold text-green-700 underline-offset-4 hover:text-green-950 hover:underline`}>
              <Mail aria-hidden className="size-5" />{site.email}
            </a>
          </address>
          <p className="mt-4 text-muted">
            Hľadáte konkrétneho makléra? <Link href="/makleri/" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">Priame telefóny maklérov</Link>
          </p>
          {identity.length > 0 && (
            <div className="mt-6 border-t border-subtle pt-5 text-sm text-muted">
              <h3 className="font-sans text-sm font-semibold tracking-normal text-green-950">Fakturačné údaje</h3>
              {identity.map((i) => <p key={i} className="mt-1">{i}</p>)}
            </div>
          )}
          <p className="mt-5 text-sm text-muted">Orgán dozoru: {legal.supervisor}</p>
        </aside>
      </div>
    </>
  );
}
