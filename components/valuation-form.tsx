'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, UserRoundSearch } from 'lucide-react';
import { estimateAction, submitValuationLead } from '@/app/actions';
import { GDPR_TEXT, MARKETING_TEXT, PHONE_ERROR, type FieldErrors } from '@/lib/schemas';
import type { ValuationResult } from '@/lib/valuation';
import { CONDITIONS, PROPERTY_TYPES, type PropertyType } from '@/lib/types';
import { eur, eurPerM2, normalizePhone } from '@/lib/format';
import { localityOptions } from '@/lib/localities';
import { Button } from './ui/button';
import { Checkbox, FieldError, Notice, SelectField, TextField } from './ui/field';
import { cn } from '@/lib/cn';

const STEPS = ['Adresa', 'Typ', 'Plocha', 'Stav', 'Kontakt'] as const;
const DISCLAIMER =
  'Orientačný odhad z verejne dostupných a interných údajov o ponukách a predajoch. Nie je znaleckým posudkom a nenahrádza ocenenie pre banku.';
const FALLBACK =
  'Pre túto nehnuteľnosť nemáme dosť porovnateľných predajov na automatický odhad. Maklér z okolia vás ocení osobne do 24 hodín.';
const TIMING = [
  { value: 'do-3-mesiacov', label: 'Do 3 mesiacov' },
  { value: 'do-roka', label: 'Do roka' },
  { value: 'len-zistujem', label: 'Len zisťujem' },
];

export function ValuationForm({ initialAddress = '', initialLocality = '' }: { initialAddress?: string; initialLocality?: string }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<PropertyType | ''>('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Po zmene kroku presunie fokus na nadpis kroku (čítačky obrazovky, klávesnica).
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step, done]);

  const value = (name: string) => String(new FormData(form.current!).get(name) ?? '').trim();

  function validate(current: number): FieldErrors {
    const e: FieldErrors = {};
    if (current === 1) {
      if (value('address').length < 3) e.address = 'Zadajte ulicu a číslo.';
      if (!value('locality')) e.locality = 'Vyberte obec alebo časť.';
    }
    if (current === 2 && !type) e.type = 'Vyberte typ nehnuteľnosti.';
    if (current === 3) {
      const area = Number(value('areaM2'));
      if (!area || area < 10) e.areaM2 = 'Zadajte plochu v m² (aspoň 10).';
    }
    if (current === 4 && type !== 'pozemky' && !value('condition')) e.condition = 'Vyberte stav.';
    if (current === 5) {
      if (value('name').length < 2) e.name = 'Zadajte meno.';
      if (!normalizePhone(value('phone'))) e.phone = PHONE_ERROR;
      if (!value('timing')) e.timing = 'Vyberte, kedy plánujete predávať.';
      if (!value('gdpr')) e.gdpr = 'Bez súhlasu vám nevieme poslať výsledok.';
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (step < 4) return setStep(step + 1);
    startTransition(async () => {
      const res = await estimateAction(new FormData(form.current!));
      if ('errors' in res) return setErrors(res.errors);
      setResult(res.result);
      setStep(5);
    });
  }

  function submit() {
    const e = validate(5);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length > 0) return;
    startTransition(async () => {
      const res = await submitValuationLead({ status: 'idle' }, new FormData(form.current!));
      if (res.status === 'ok') return setDone(true);
      if (res.status === 'error') {
        setErrors(res.errors);
        setFormError(res.message ?? 'Skontrolujte označené polia.');
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-subtle bg-white p-6 shadow-card sm:p-10">
        <CircleCheck aria-hidden className="size-12 text-success" />
        <h2 ref={heading} tabIndex={-1} className="mt-4 text-3xl outline-none">Hotovo.</h2>
        <p className="mt-3 text-lg text-muted">
          Maklér z vašej lokality vám zavolá do 24 hodín s presným ocenením. Zavoláme raz, s výsledkom.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/predane/" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">Pozrieť predané nehnuteľnosti</Link>
          <Link href="/cenova-mapa-liptova/" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-950">Cenová mapa Liptova</Link>
        </div>
      </div>
    );
  }

  const showRooms = type !== 'pozemky';
  const showFloor = type === 'byty' || type === 'apartmany';
  const estimateText = result?.kind === 'range' ? `${result.low}-${result.high}` : 'agent';

  return (
    <div className="rounded-3xl border border-subtle bg-white p-5 shadow-card sm:p-8">
      <ol className="flex gap-1.5 sm:gap-2" aria-label="Kroky formulára">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'hotový' : n === step ? 'aktuálny' : 'čaká';
          return (
            <li key={label} aria-current={n === step ? 'step' : undefined} className="flex-1">
              <span className={cn('block h-1.5 rounded-full', n <= step ? 'bg-green-500' : 'bg-subtle')} />
              <span className={cn('mt-2 flex items-center gap-1 text-xs sm:text-sm', n === step ? 'font-semibold text-green-950' : 'text-muted')}>
                {n < step && <Check aria-hidden className="size-3.5 text-success" />}
                <span className="sr-only">Krok {n} z 5, {state}: </span>
                <span className={cn(n !== step && 'max-sm:sr-only')}>{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <form
        ref={form}
        noValidate
        className="mt-8"
        onChange={(e) => {
          // Chyba pri poli zmizne, hneď ako ho používateľ začne opravovať.
          const name = (e.target as unknown as HTMLInputElement).name;
          if (errors[name]) setErrors(({ [name]: _fixed, ...rest }) => rest);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 5) next();
          else submit();
        }}
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="estimate" value={estimateText} />

        <fieldset hidden={step !== 1}>
          <legend className="sr-only">Adresa</legend>
          <h2 ref={step === 1 ? heading : undefined} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">Kde sa nehnuteľnosť nachádza?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField label="Ulica a číslo" name="address" defaultValue={initialAddress} autoComplete="street-address" placeholder="napr. Bystrická cesta 12" error={errors.address} />
            <SelectField label="Obec alebo časť" name="locality" defaultValue={initialLocality} error={errors.locality}>
              <option value="">Vyberte…</option>
              {localityOptions().map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="ine">Iná obec na Liptove</option>
            </SelectField>
          </div>
        </fieldset>

        <fieldset hidden={step !== 2} aria-describedby={errors.type ? 'type-error' : undefined}>
          <legend className="sr-only">Typ nehnuteľnosti</legend>
          <h2 ref={step === 2 ? heading : undefined} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">O aký typ nehnuteľnosti ide?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(Object.keys(PROPERTY_TYPES) as PropertyType[]).map((t) => (
              <label key={t} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-950', type === t ? 'border-2 border-green-950 bg-green-50' : 'border-control')}>
                <input type="radio" name="type-radio" value={t} checked={type === t} onChange={() => { setType(t); setErrors({}); }} className="size-5" />
                {PROPERTY_TYPES[t].label}
              </label>
            ))}
          </div>
          <FieldError id="type-error" error={errors.type} />
        </fieldset>

        <fieldset hidden={step !== 3}>
          <legend className="sr-only">Plocha, izby a poschodie</legend>
          <h2 ref={step === 3 ? heading : undefined} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">Aká je veľká?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <TextField label={type === 'pozemky' ? 'Výmera pozemku (m²)' : 'Úžitková plocha (m²)'} name="areaM2" type="number" inputMode="decimal" min={10} step="0.1" error={errors.areaM2} />
            {showRooms && <TextField label="Počet izieb" name="rooms" type="number" inputMode="numeric" min={1} max={12} optional error={errors.rooms} />}
            {showFloor && <TextField label="Poschodie" name="floor" type="number" inputMode="numeric" min={-1} max={30} optional hint="Prízemie = 0" error={errors.floor} />}
          </div>
          {showFloor && <Checkbox name="hasElevator" className="mt-2">V dome je výťah</Checkbox>}
        </fieldset>

        <fieldset hidden={step !== 4}>
          <legend className="sr-only">Stav, rok a doplnky</legend>
          <h2 ref={step === 4 ? heading : undefined} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">V akom je stave?</h2>
          {type === 'pozemky' ? (
            <>
              <input type="hidden" name="condition" value="povodny" />
              <p className="mt-4 text-muted">Pri pozemku nám stačí výmera. Siete, prístup a územný plán s vami prejde maklér.</p>
            </>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <SelectField label="Stav" name="condition" defaultValue="" error={errors.condition}>
                  <option value="">Vyberte…</option>
                  {Object.entries(CONDITIONS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </SelectField>
                <TextField label="Rok výstavby" name="yearBuilt" type="number" inputMode="numeric" min={1800} max={2030} optional error={errors.yearBuilt} />
              </div>
              <div className="mt-2 grid sm:grid-cols-3">
                <Checkbox name="balcony">Balkón alebo loggia</Checkbox>
                <Checkbox name="cellar">Pivnica</Checkbox>
                <Checkbox name="parking">Parkovacie miesto alebo garáž</Checkbox>
              </div>
            </>
          )}
        </fieldset>

        <fieldset hidden={step !== 5}>
          <legend className="sr-only">Výsledok a kontakt</legend>
          {result?.kind === 'range' ? (
            <div className="rounded-2xl bg-green-50 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-success">Orientačný rozsah ceny</p>
              <p className="tabular mt-1 font-display text-3xl font-bold sm:text-4xl">
                {eur(result.low)} – {eur(result.high)}
              </p>
              <p className="tabular mt-1 text-sm text-muted">
                približne {eurPerM2(result.perM2)} · z {result.comparables} porovnateľných bytov v okolí
              </p>
              <p className="mt-3 text-sm text-muted">{DISCLAIMER}</p>
            </div>
          ) : (
            result && (
              <div className="flex gap-4 rounded-2xl bg-info-bg p-5 text-info sm:p-6">
                <UserRoundSearch aria-hidden className="mt-0.5 size-6 shrink-0" />
                <div>
                  <p className="font-semibold">Ocenenie maklérom</p>
                  <p className="mt-1 text-sm">{FALLBACK}</p>
                </div>
              </div>
            )
          )}
          <h2 ref={step === 5 ? heading : undefined} tabIndex={-1} className="mt-8 text-2xl outline-none sm:text-3xl">Kam vám pošleme výsledok?</h2>
          {formError && <Notice tone="danger" className="mt-4">{formError}</Notice>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField label="Meno a priezvisko" name="name" autoComplete="name" error={errors.name} />
            <TextField label="Telefón" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+421 9xx xxx xxx" hint="Zavoláme raz, s výsledkom ocenenia." error={errors.phone} />
            <TextField label="E-mail" name="email" type="email" autoComplete="email" optional error={errors.email} />
          </div>
          <fieldset className="mt-5" aria-describedby={errors.timing ? 'timing-error' : undefined}>
            <legend className="text-sm font-medium">Kedy plánujete predávať?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIMING.map((t) => (
                <label key={t.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-control px-4 has-[:checked]:border-2 has-[:checked]:border-green-950 has-[:checked]:bg-green-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-950">
                  <input type="radio" name="timing" value={t.value} className="size-5" />
                  {t.label}
                </label>
              ))}
            </div>
            <FieldError id="timing-error" error={errors.timing} />
          </fieldset>
          <div className="mt-4">
            <Checkbox name="gdpr" error={errors.gdpr} required>
              {GDPR_TEXT}{' '}
              <Link href="/ochrana-osobnych-udajov/" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-950">Ako s údajmi pracujeme</Link>
            </Checkbox>
            <Checkbox name="marketing">{MARKETING_TEXT} <span className="text-muted">(nepovinné)</span></Checkbox>
          </div>
        </fieldset>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-subtle pt-5">
          {step > 1 ? (
            <Button type="button" variant="quiet" onClick={() => { setErrors({}); setStep(step - 1); }}>
              <ArrowLeft aria-hidden className="size-4" />
              Späť
            </Button>
          ) : <span />}
          <Button type="submit" disabled={pending}>
            {pending ? 'Počítam…' : step === 5 ? 'Poslať mi odhad' : step === 4 ? 'Zobraziť odhad' : 'Pokračovať'}
            {!pending && step < 5 && <ArrowRight aria-hidden className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
