'use server';

import { redirect } from 'next/navigation';
import { crmClient } from '@/lib/crm/session';
import { CRM_HOME, CRM_LOGIN } from '@/lib/crm/guard';
import { friendlyError } from '@/lib/crm/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const back = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params).toString()}`;

/** Prihlásenie e-mailom a heslom. Pri chybe vždy rovnaká správa (neprezrádza, či účet existuje). */
export async function signIn(data: FormData): Promise<void> {
  const email = text(data, 'email').toLowerCase();
  const password = String(data.get('password') ?? '');
  if (!email || !password || email.length > 254 || password.length > 200) redirect(back(CRM_LOGIN, { chyba: '1' }));
  const supa = await crmClient();
  const { error } = await supa.auth.signInWithPassword({ email, password });
  if (error) redirect(back(CRM_LOGIN, { chyba: '1' }));
  redirect(CRM_HOME);
}

export async function signOut(): Promise<void> {
  const supa = await crmClient();
  await supa.auth.signOut();
  redirect(CRM_LOGIN);
}

/** Maklér si vezme nepridelené ocenenie. Limit, pobočku a súbeh strážia databázové pravidlá, nie toto rozhranie. */
export async function claimValuation(data: FormData): Promise<void> {
  const id = text(data, 'id');
  if (!UUID.test(id)) redirect(back('/crm/nepridelene/', { chyba: friendlyError('') }));
  const supa = await crmClient();
  const { error } = await supa.rpc('claim_unassigned', { p_valuation: id });
  if (error) redirect(back('/crm/nepridelene/', { chyba: friendlyError(error.message) }));
  redirect(back('/crm/ocenenia/', { ok: 'Ocenenie je vaše.' }));
}

/** Admin pridelí ocenenie maklérovi. */
export async function assignValuation(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const to = text(data, 'to');
  if (!UUID.test(id) || !UUID.test(to)) redirect(back('/crm/pridelenie/', { chyba: 'Vyberte makléra.' }));
  const supa = await crmClient();
  const { error } = await supa.rpc('assign_valuation', { p_valuation: id, p_to: to, p_note: null });
  if (error) redirect(back('/crm/pridelenie/', { chyba: friendlyError(error.message) }));
  redirect(back('/crm/pridelenie/', { ok: 'Ocenenie je pridelené.' }));
}

const FINANCING = ['nove', 'priprava', 'riesi_sa', 'vyriesene', 'neriesi_sa'] as const;

/** Financie (alebo admin) zmenia stav financovania náboru. Pri „Nerieši sa“ treba dôvod (kontroluje aj databáza). */
export async function setFinancing(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const status = text(data, 'status');
  const reason = text(data, 'reason');
  const page = `/crm/financovanie/${id}/`;
  if (!UUID.test(id) || !(FINANCING as readonly string[]).includes(status)) redirect(back('/crm/financovanie/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { error } = await supa.rpc('set_financing_status', { p_mandate: id, p_status: status, p_reason: reason || null });
  if (error) redirect(back(page, { chyba: friendlyError(error.message) }));
  redirect(back(page, { ok: 'Stav financovania je uložený.' }));
}

/** Poznámka k financovaniu (len Financie a admin; RLS to vynucuje aj v databáze). */
export async function addFinancingNote(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const body = text(data, 'body');
  const page = `/crm/financovanie/${id}/`;
  if (!UUID.test(id) || body.length === 0 || body.length > 2000) redirect(back('/crm/financovanie/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) redirect(CRM_LOGIN);
  const { error } = await supa.from('financing_notes').insert({ mandate_id: id, author: auth.user.id, body });
  if (error) redirect(back(page, { chyba: friendlyError(error.message) }));
  redirect(back(page, { ok: 'Poznámka je uložená.' }));
}


const GENERIC = friendlyError('');
const NOT_FOUND = 'Záznam sa nenašiel alebo naň nemáte oprávnenie.';
const mandatePage = (id: string) => `/crm/nabory/${id}/`;
const valuationPage = (id: string) => `/crm/ocenenia/${id}/`;

/** Z prideleného ocenenia vznikne nábor s predvyplnenými údajmi (funkcia v databáze). */
export async function createMandate(data: FormData): Promise<void> {
  const id = text(data, 'id');
  if (!UUID.test(id)) redirect(back('/crm/ocenenia/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { data: mandateId, error } = await supa.rpc('create_mandate_from_valuation', { p_valuation: id });
  if (error || typeof mandateId !== 'string') redirect(back(valuationPage(id), { chyba: friendlyError(error?.message) }));
  redirect(back(mandatePage(mandateId), { ok: 'Nábor je vytvorený. Doplňte údaje.' }));
}

const numberOrNull = (raw: string, min: number, max: number): number | null | 'bad' => {
  if (raw === '') return null;
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max ? n : 'bad';
};

/** Úprava údajov náboru (len vlastný nábor, RLS). Stav financovania sa tadiaľto nemení. */
export async function updateMandate(data: FormData): Promise<void> {
  const id = text(data, 'id');
  if (!UUID.test(id)) redirect(back('/crm/nabory/', { chyba: GENERIC }));
  const title = text(data, 'title');
  const area = numberOrNull(text(data, 'area_m2'), 0.01, 999_999);
  const price = numberOrNull(text(data, 'asking_price'), 0, 999_999_999);
  const commission = numberOrNull(text(data, 'commission_pct'), 0, 100);
  if (!title || title.length > 200 || area === 'bad' || price === 'bad' || commission === 'bad') {
    redirect(back(mandatePage(id), { chyba: 'Skontrolujte údaje: názov je povinný, čísla musia byť platné.' }));
  }
  const supa = await crmClient();
  const { data: rows, error } = await supa
    .from('mandates')
    .update({
      title,
      address: text(data, 'address').slice(0, 300) || null,
      parcel_no: text(data, 'parcel_no').slice(0, 60) || null,
      lv_no: text(data, 'lv_no').slice(0, 60) || null,
      area_m2: area, asking_price: price, commission_pct: commission,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');
  if (error || !rows || rows.length === 0) redirect(back(mandatePage(id), { chyba: error ? friendlyError(error.message) : NOT_FOUND }));
  redirect(back(mandatePage(id), { ok: 'Údaje sú uložené.' }));
}

export async function addMandateNote(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const body = text(data, 'body');
  if (!UUID.test(id) || body.length === 0 || body.length > 2000) redirect(back('/crm/nabory/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) redirect(CRM_LOGIN);
  const { error } = await supa.from('mandate_notes').insert({ mandate_id: id, author: auth.user.id, body });
  if (error) redirect(back(mandatePage(id), { chyba: friendlyError(error.message) }));
  redirect(back(mandatePage(id), { ok: 'Poznámka je uložená.' }));
}

/** Nedohodli sme sa: nábor ide do archívu (kontakt a popis ostanú, rozpracované dokumenty sa zmažú). Dôvod je povinný. */
export async function closeMandate(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const reason = text(data, 'reason');
  if (!UUID.test(id)) redirect(back('/crm/nabory/', { chyba: GENERIC }));
  if (!reason || reason.length > 300) redirect(back(mandatePage(id), { chyba: 'Uveďte dôvod, prečo sa nedohodli.' }));
  const supa = await crmClient();
  const { error } = await supa.rpc('close_mandate_unagreed', { p_mandate: id, p_reason: reason });
  if (error) redirect(back(mandatePage(id), { chyba: friendlyError(error.message) }));
  redirect(back(mandatePage(id), { ok: 'Nábor je v archíve. Môžete ho kedykoľvek obnoviť.' }));
}

export async function restoreMandate(data: FormData): Promise<void> {
  const id = text(data, 'id');
  if (!UUID.test(id)) redirect(back('/crm/nabory/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { error } = await supa.rpc('restore_mandate', { p_mandate: id });
  if (error) redirect(back(mandatePage(id), { chyba: friendlyError(error.message) }));
  redirect(back(mandatePage(id), { ok: 'Nábor je obnovený.' }));
}

/** Odovzdanie náboru kolegovi (klient, poznámky a dokumenty idú s ním). */
export async function handoffMandate(data: FormData): Promise<void> {
  const id = text(data, 'id');
  const to = text(data, 'to');
  const note = text(data, 'note').slice(0, 300);
  if (!UUID.test(id)) redirect(back('/crm/nabory/', { chyba: GENERIC }));
  if (!UUID.test(to)) redirect(back(mandatePage(id), { chyba: 'Vyberte kolegu.' }));
  const supa = await crmClient();
  const { error } = await supa.rpc('handoff_mandate', { p_mandate: id, p_to: to, p_note: note || null });
  if (error) redirect(back(mandatePage(id), { chyba: friendlyError(error.message) }));
  redirect(back('/crm/nabory/', { ok: 'Nábor je odovzdaný kolegovi.' }));
}

/** Vrátený klient: prepojí ocenenie s existujúcim klientom a voliteľne obnoví jeho pôvodný nábor so zmenenými údajmi. */
export async function linkReturningClient(data: FormData): Promise<void> {
  const valuation = text(data, 'valuation');
  const client = text(data, 'client');
  const mandate = text(data, 'mandate');
  if (!UUID.test(valuation) || !UUID.test(client) || (mandate && !UUID.test(mandate))) redirect(back('/crm/ocenenia/', { chyba: GENERIC }));
  const supa = await crmClient();
  const { error } = await supa.rpc('link_returning_client', { p_valuation: valuation, p_client: client, p_restore_mandate: mandate || null });
  if (error) redirect(back(valuationPage(valuation), { chyba: friendlyError(error.message) }));
  if (mandate) redirect(back(mandatePage(mandate), { ok: 'Pôvodný nábor je obnovený. Skontrolujte zmenené údaje.' }));
  redirect(back(valuationPage(valuation), { ok: 'Ocenenie je prepojené s existujúcim klientom.' }));
}
