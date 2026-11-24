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
