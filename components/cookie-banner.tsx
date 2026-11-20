'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonStyles } from './ui/button';
import { cn } from '@/lib/cn';

const COOKIE = 'rozia_consent';
const MAX_AGE = 60 * 60 * 24 * 365; // 12 mesiacov
const OPEN_EVENT = 'rozia:cookie-settings';

export interface Consent {
  analytics: boolean;
  marketing: boolean;
  ts: string;
}

export function readConsent(): Consent | null {
  const raw = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))?.split('=')[1];
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Consent;
  } catch {
    return null;
  }
}

function writeConsent(c: Omit<Consent, 'ts'>) {
  const value = encodeURIComponent(JSON.stringify({ ...c, ts: new Date().toISOString() }));
  document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent('rozia:consent', { detail: c }));
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Nastavenia cookies
    </button>
  );
}

const equalButton = cn(buttonStyles({ variant: 'secondary' }), 'whitespace-nowrap');

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setOpen(true);
    const reopen = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (open) document.documentElement.dataset.cookieBanner = 'open';
    else delete document.documentElement.dataset.cookieBanner;
  }, [open]);

  if (!open) return null;

  const save = (c: { analytics: boolean; marketing: boolean }) => {
    writeConsent(c);
    setOpen(false);
  };

  return (
    <section
      role="region"
      aria-label="Súhlas s cookies"
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t-2 border-green-950 bg-white shadow-lift"
    >
      <div className="container-page max-h-[85dvh] overflow-y-auto py-4 sm:py-5">
        <div className="lg:flex lg:items-start lg:gap-8">
          <div className="lg:flex-1">
            <h2 className="text-lg">Cookies na rozia.sk</h2>
            <p className="mt-1 text-sm text-muted">
              Nevyhnutné cookies používame vždy, bez nich web nefunguje. Analytické a marketingové zapneme len s vaším
              súhlasom. Web môžete používať aj bez nich.{' '}
              <Link href="/cookies/" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-950">
                Viac o cookies
              </Link>
            </p>
          </div>
          {/* „Odmietnuť všetky“ a „Prijať všetky“ sú v tej istej vrstve a majú identický štýl. */}
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] lg:mt-0 lg:w-[36rem] lg:shrink-0">
            <button type="button" className={equalButton} onClick={() => save({ analytics: false, marketing: false })}>
              Odmietnuť všetky
            </button>
            <button type="button" className={equalButton} onClick={() => save({ analytics: true, marketing: true })}>
              Prijať všetky
            </button>
            <button type="button" className={buttonStyles({ variant: 'quiet' })} aria-expanded={details} aria-controls="cookie-kategorie" onClick={() => setDetails((v) => !v)}>
              Nastavenia
            </button>
          </div>
        </div>
        <fieldset id="cookie-kategorie" hidden={!details} className={cn('mt-4 border-t border-subtle pt-3', !details && 'hidden')}>
          <legend className="sr-only">Kategórie cookies</legend>
          <div className="grid gap-x-8 sm:grid-cols-3">
            <label className="flex min-h-11 items-start gap-3 py-2.5 text-sm text-muted">
              <input type="checkbox" checked disabled className="mt-0.5 size-5" />
              <span><strong className="text-green-950">Nevyhnutné</strong> – vždy zapnuté (uloženie tejto voľby).</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-sm text-muted">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 size-5" />
              <span><strong className="text-green-950">Analytické</strong> – anonymné meranie návštevnosti.</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-sm text-muted">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-5" />
              <span><strong className="text-green-950">Marketingové</strong> – meranie reklamy.</span>
            </label>
          </div>
          <button type="button" className={cn(buttonStyles({ variant: 'primary', size: 'sm' }), 'mt-2')} onClick={() => save({ analytics, marketing })}>
            Uložiť výber
          </button>
        </fieldset>
      </div>
    </section>
  );
}
