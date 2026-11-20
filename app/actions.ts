'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { contactSchema, fieldErrors, GDPR_TEXT, GDPR_TEXT_CONTACT, propertySchema, valuationLeadSchema, type FieldErrors } from '@/lib/schemas';
import { estimate, VALUATION_VERSION, type ValuationResult } from '@/lib/valuation';
import { getComparables } from '@/lib/data';
import { getCity } from '@/lib/localities';

export type FormState =
  | { status: 'idle' }
  | { status: 'error'; errors: FieldErrors; message?: string }
  | { status: 'ok' };

const UNAVAILABLE = 'Formulár je dočasne nedostupný. Napíšte nám, prosím, na info@rozia.sk.';

async function saveLead(row: Record<string, unknown>): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = await headers();
  const full = { ...row, source_path: h.get('referer'), user_agent: h.get('user-agent') };
  if (!url || !key) {
    // Lokálny vývoj bez databázy: lead len zalogujeme. V produkcii je to chyba.
    if (process.env.NODE_ENV === 'production') {
      console.error('[lead] Supabase nie je nakonfigurovaný, lead sa NEULOŽIL.');
      return false;
    }
    console.info('[lead:dev]', full);
    return true;
  }
  const { error } = await createClient(url, key, { auth: { persistSession: false } }).from('leads').insert(full);
  if (error) console.error(`[lead] ${error.message}`);
  return !error;
}

/** Krok 4 → 5 formulára ocenenia: rozsah ceny alebo fallback na makléra. */
export async function estimateAction(data: FormData): Promise<{ errors: FieldErrors } | { result: ValuationResult }> {
  const parsed = propertySchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const p = parsed.data;
  const [citySlug = '', partSlug = null] = p.locality.split('/');
  if (p.type !== 'byty') return { result: { kind: 'agent', reason: 'unsupported-type' } };
  if (!getCity(citySlug)?.autoValuation) return { result: { kind: 'agent', reason: 'unsupported-locality' } };
  let comparables = partSlug ? await getComparables(citySlug, partSlug) : [];
  if (comparables.length < 5) comparables = await getComparables(citySlug, null);
  return { result: estimate(p, comparables) };
}

export async function submitValuationLead(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = valuationLeadSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  const { name, phone, email, gdpr, marketing, ...property } = parsed.data;
  const ok = await saveLead({
    kind: 'ocenenie', name, phone, email: email || null,
    payload: { ...property, estimate: String(data.get('estimate') ?? ''), valuationVersion: VALUATION_VERSION },
    gdpr_consent: gdpr, gdpr_consent_text: GDPR_TEXT, marketing_consent: marketing,
  });
  return ok ? { status: 'ok' } : { status: 'error', errors: {}, message: UNAVAILABLE };
}

export async function submitContact(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  const { kind, name, phone, email, message, context, gdpr } = parsed.data;
  const ok = await saveLead({
    kind, name, phone, email: email || null, message, payload: context ? { context } : {},
    gdpr_consent: gdpr, gdpr_consent_text: GDPR_TEXT_CONTACT, marketing_consent: false,
  });
  return ok ? { status: 'ok' } : { status: 'error', errors: {}, message: UNAVAILABLE };
}
