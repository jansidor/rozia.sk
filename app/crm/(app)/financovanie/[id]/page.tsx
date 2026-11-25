import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/crm/session';
import { friendlyError } from '@/lib/crm/errors';
import { FINANCING_SK, Flash, PageTitle, STATUS_SK, dateTime, eur, mailHref } from '@/components/crm-ui';
import { Button } from '@/components/ui/button';
import { inputStyles } from '@/components/ui/field';
import { addFinancingNote, setFinancing } from '../../../actions';

export const metadata: Metadata = { title: 'Financovanie náboru' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Mandate {
  id: string; client_id: string; title: string; status: string; property_type: string | null; address: string | null;
  area_m2: number | null; asking_price: number | null; financing_status: string; financing_reason: string | null; created_at: string;
  branch: { name: string } | { name: string }[] | null;
}
interface Contact { full_name: string; phone: string | null; email: string | null }

export default async function FinancingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { id } = await params;
  const { ok, chyba } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supa } = await requireStaff('finance', 'admin');

  const { data: m } = await supa
    .from('mandates')
    .select('id, client_id, title, status, property_type, address, area_m2, asking_price, financing_status, financing_reason, created_at, branch:branches(name)')
    .eq('id', id)
    .maybeSingle();
  if (!m) notFound();
  const mandate = m as unknown as Mandate;
  const branch = Array.isArray(mandate.branch) ? mandate.branch[0] : mandate.branch;

  // Kontakt klienta sa číta cez databázovú funkciu, ktorá každé zobrazenie zapíše do auditu (GDPR).
  const { data: contactRows, error: contactError } = await supa.rpc('finance_view_client', { p_client: mandate.client_id });
  const contact = ((contactRows ?? []) as Contact[])[0];

  const [{ data: notes }, { data: history }] = await Promise.all([
    supa.from('financing_notes').select('id, body, created_at').eq('mandate_id', id).order('created_at', { ascending: false }).limit(100),
    supa.from('financing_status_history').select('id, from_status, to_status, reason, changed_at').eq('mandate_id', id).order('changed_at', { ascending: false }).limit(50),
  ]);

  return (
    <>
      <p className="mb-2"><Link href="/crm/financovanie/" className="text-green-700 underline">← Späť na zoznam</Link></p>
      <PageTitle lead={`${branch?.name ?? 'bez pobočky'} · ${STATUS_SK[mandate.status] ?? mandate.status} · vytvorené ${dateTime(mandate.created_at)}`}>{mandate.title}</PageTitle>
      <Flash ok={ok} error={chyba} />

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="klient">
        <h2 id="klient" className="text-lg font-semibold">Klient</h2>
        {contact ? (
          <p className="mt-1">
            <strong>{contact.full_name}</strong>
            {contact.phone && <> · <a className="text-green-700 underline" href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></>}
            {contact.email && <> · <a className="text-green-700 underline" href={mailHref(contact.email)}>{contact.email}</a></>}
          </p>
        ) : (
          <p className="mt-1 text-danger">{contactError ? friendlyError(contactError.message) : 'Kontakt sa nepodarilo načítať.'}</p>
        )}
        <p className="mt-1 text-sm text-muted">Zobrazenie kontaktu sa zapisuje do záznamu o prístupe.</p>
        <p className="mt-3 text-muted">{mandate.property_type ?? 'Nehnuteľnosť'}{mandate.address ? `, ${mandate.address}` : ''}{mandate.area_m2 ? ` · ${mandate.area_m2} m²` : ''}{mandate.asking_price ? ` · ${eur(mandate.asking_price)}` : ''}</p>
      </section>

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="stav">
        <h2 id="stav" className="text-lg font-semibold">Stav financovania: {FINANCING_SK[mandate.financing_status] ?? mandate.financing_status}</h2>
        {mandate.financing_reason && <p className="text-muted">Dôvod: {mandate.financing_reason}</p>}
        <form action={setFinancing} className="mt-3 grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={mandate.id} />
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Nový stav</label>
            <select id="status" name="status" defaultValue={mandate.financing_status} className={inputStyles}>
              {Object.entries(FINANCING_SK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Dôvod (povinný pri „Nerieši sa“)</label>
            <input id="reason" name="reason" maxLength={300} className={inputStyles} />
          </div>
          <Button type="submit">Uložiť stav</Button>
        </form>
      </section>

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="poznamky">
        <h2 id="poznamky" className="text-lg font-semibold">Poznámky k financovaniu</h2>
        <form action={addFinancingNote} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={mandate.id} />
          <label htmlFor="body" className="block text-sm font-medium">Nová poznámka</label>
          <textarea id="body" name="body" rows={3} required maxLength={2000} className={inputStyles} />
          <Button type="submit" variant="secondary">Pridať poznámku</Button>
        </form>
        {(notes ?? []).length > 0 && (
          <ul className="mt-4 space-y-2">
            {(notes as { id: string; body: string; created_at: string }[]).map((n) => (
              <li key={n.id} className="rounded-xl bg-surface px-3 py-2"><span className="block text-sm text-muted">{dateTime(n.created_at)}</span><span className="whitespace-pre-wrap">{n.body}</span></li>
            ))}
          </ul>
        )}
      </section>

      {(history ?? []).length > 0 && (
        <section aria-labelledby="historia">
          <h2 id="historia" className="mb-2 text-lg font-semibold">História stavu</h2>
          <ul className="space-y-1 text-sm">
            {(history as { id: number; from_status: string; to_status: string; reason: string | null; changed_at: string }[]).map((h) => (
              <li key={h.id}>{dateTime(h.changed_at)}: {FINANCING_SK[h.from_status] ?? h.from_status} → {FINANCING_SK[h.to_status] ?? h.to_status}{h.reason ? ` (${h.reason})` : ''}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
