import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/crm/session';
import { FINANCING_SK, Flash, PageTitle, STATUS_SK, dateTime, one } from '@/components/crm-ui';
import { Button } from '@/components/ui/button';
import { inputStyles } from '@/components/ui/field';
import { addMandateNote, closeMandate, handoffMandate, restoreMandate, updateMandate } from '../../../actions';

export const metadata: Metadata = { title: 'Nábor' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Mandate {
  id: string; title: string; status: string; address: string | null; parcel_no: string | null; lv_no: string | null; area_m2: number | null;
  asking_price: number | null; commission_pct: number | null; financing_status: string; financing_reason: string | null; created_at: string;
  archived_at: string | null; archive_reason: string | null; anonymized_at: string | null; valuation_id: string | null;
  client: { full_name: string; phone: string | null; email: string | null } | { full_name: string; phone: string | null; email: string | null }[] | null;
}
interface Doc { template_code: string; requirement: string; title: string | null; template_missing: boolean }
interface Colleague { id: string; full_name: string; branch_name: string | null; availability: string; away_until: string | null }

export default async function MandateDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { id } = await params;
  const { ok, chyba } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supa, me } = await requireStaff('broker', 'admin');

  const { data } = await supa
    .from('mandates')
    .select('id, title, status, address, parcel_no, lv_no, area_m2, asking_price, commission_pct, financing_status, financing_reason, created_at, archived_at, archive_reason, anonymized_at, valuation_id, client:clients(full_name, phone, email)')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const m = data as unknown as Mandate;
  const client = one(m.client);
  const active = m.status === 'aktivny';
  const archived = m.status === 'nedohodnuty';

  const [{ data: docs }, { data: notes }, { data: fnotes }, { data: colleagues }] = await Promise.all([
    supa.rpc('suggest_documents', { p_mandate: id }),
    supa.from('mandate_notes').select('id, body, created_at').eq('mandate_id', id).order('created_at', { ascending: false }).limit(100),
    supa.from('financing_notes').select('id, body, created_at').eq('mandate_id', id).order('created_at', { ascending: false }).limit(50),
    active ? supa.rpc('list_colleagues') : Promise.resolve({ data: [] }),
  ]);
  const documents = (docs ?? []) as Doc[];
  const mates = ((colleagues ?? []) as Colleague[]).filter((k) => k.availability === 'available');

  return (
    <>
      <p className="mb-2"><Link href="/crm/nabory/" className="text-green-700 underline">← Nábory</Link></p>
      <PageTitle lead={`${STATUS_SK[m.status] ?? m.status} · vytvorený ${dateTime(m.created_at)}`}>{m.title}</PageTitle>
      <Flash ok={ok} error={chyba} />

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="klient">
        <h2 id="klient" className="text-lg font-semibold">Klient</h2>
        {client ? (
          <p className="mt-1">
            <strong>{client.full_name}</strong>
            {client.phone && <> · <a className="text-green-700 underline" href={`tel:${client.phone.replace(/\s/g, '')}`}>{client.phone}</a></>}
            {client.email && <> · <a className="text-green-700 underline" href={`mailto:${client.email}`}>{client.email}</a></>}
          </p>
        ) : <p className="mt-1 text-muted">Údaje klienta nie sú dostupné.</p>}
        <p className="mt-2 text-sm text-muted">Financovanie: {FINANCING_SK[m.financing_status] ?? m.financing_status}{m.financing_reason ? ` (${m.financing_reason})` : ''}</p>
        {m.valuation_id && <p className="mt-1 text-sm"><Link className="text-green-700 underline" href={`/crm/ocenenia/${m.valuation_id}/`}>Pôvodné ocenenie</Link></p>}
      </section>

      {archived && (
        <section className="mb-6 rounded-2xl border-2 border-warning bg-warning-bg p-4" aria-labelledby="archiv">
          <h2 id="archiv" className="text-lg font-semibold">Nábor je v archíve</h2>
          <p>Nedohodnuté {dateTime(m.archived_at)}{m.archive_reason ? `, dôvod: ${m.archive_reason}` : ''}. Kontakt a popis nehnuteľnosti ostávajú 24 mesiacov, potom sa anonymizujú.</p>
          {m.anonymized_at ? (
            <p className="mt-2 font-medium">Nábor je už anonymizovaný a obnoviť sa nedá.</p>
          ) : (
            <form action={restoreMandate} className="mt-3"><input type="hidden" name="id" value={id} /><Button type="submit">Obnoviť nábor</Button></form>
          )}
        </section>
      )}

      {!m.anonymized_at && (
        <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="udaje">
          <h2 id="udaje" className="text-lg font-semibold">Údaje náboru</h2>
          <form action={updateMandate} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <div className="sm:col-span-2"><label htmlFor="title" className="mb-1.5 block text-sm font-medium">Názov</label><input id="title" name="title" required maxLength={200} defaultValue={m.title} className={inputStyles} /></div>
            <div className="sm:col-span-2"><label htmlFor="address" className="mb-1.5 block text-sm font-medium">Adresa</label><input id="address" name="address" maxLength={300} defaultValue={m.address ?? ''} className={inputStyles} /></div>
            <div><label htmlFor="parcel_no" className="mb-1.5 block text-sm font-medium">Parcela</label><input id="parcel_no" name="parcel_no" maxLength={60} defaultValue={m.parcel_no ?? ''} className={inputStyles} /></div>
            <div><label htmlFor="lv_no" className="mb-1.5 block text-sm font-medium">List vlastníctva</label><input id="lv_no" name="lv_no" maxLength={60} defaultValue={m.lv_no ?? ''} className={inputStyles} /></div>
            <div><label htmlFor="area_m2" className="mb-1.5 block text-sm font-medium">Výmera (m²)</label><input id="area_m2" name="area_m2" inputMode="decimal" defaultValue={m.area_m2 ?? ''} className={inputStyles} /></div>
            <div><label htmlFor="asking_price" className="mb-1.5 block text-sm font-medium">Predajná cena (€)</label><input id="asking_price" name="asking_price" inputMode="decimal" defaultValue={m.asking_price ?? ''} className={inputStyles} /></div>
            <div><label htmlFor="commission_pct" className="mb-1.5 block text-sm font-medium">Provízia (%)</label><input id="commission_pct" name="commission_pct" inputMode="decimal" defaultValue={m.commission_pct ?? ''} className={inputStyles} /></div>
            <div className="sm:col-span-2"><Button type="submit">Uložiť údaje</Button></div>
          </form>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="dokumenty">
        <h2 id="dokumenty" className="text-lg font-semibold">Navrhnuté dokumenty</h2>
        {documents.length === 0 ? <p className="mt-1 text-muted">Pre tento nábor zatiaľ nie sú pravidlá dokumentov.</p> : (
          <ul className="mt-2 space-y-1">
            {documents.map((d) => (
              <li key={d.template_code}>
                <span className="font-medium">{d.title ?? d.template_code}</span>{' '}
                <span className={d.requirement === 'povinna' ? 'font-semibold text-danger' : 'text-muted'}>{d.requirement === 'povinna' ? '(povinný)' : '(odporúčaný)'}</span>
                {d.template_missing && <span className="text-sm text-muted"> · šablóna zatiaľ nie je v knižnici</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-muted">Knižnica šablón a vyplnenie dokumentov pribudnú po prevzatí šablón z duplikátu NajBývania.</p>
      </section>

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="poznamky">
        <h2 id="poznamky" className="text-lg font-semibold">Poznámky</h2>
        {!m.anonymized_at && (
          <form action={addMandateNote} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={id} />
            <label htmlFor="body" className="block text-sm font-medium">Nová poznámka</label>
            <textarea id="body" name="body" rows={3} required maxLength={2000} className={inputStyles} />
            <Button type="submit" variant="secondary">Pridať poznámku</Button>
          </form>
        )}
        {((notes ?? []) as { id: string; body: string; created_at: string }[]).length > 0 && (
          <ul className="mt-4 space-y-2">
            {((notes ?? []) as { id: string; body: string; created_at: string }[]).map((n) => (
              <li key={n.id} className="rounded-xl bg-surface px-3 py-2"><span className="block text-sm text-muted">{dateTime(n.created_at)}</span><span className="whitespace-pre-wrap">{n.body}</span></li>
            ))}
          </ul>
        )}
        {((fnotes ?? []) as { id: string; body: string; created_at: string }[]).length > 0 && (
          <>
            <h3 className="mt-5 font-semibold">Poznámky k financovaniu</h3>
            <ul className="mt-2 space-y-2">
              {((fnotes ?? []) as { id: string; body: string; created_at: string }[]).map((n) => (
                <li key={n.id} className="rounded-xl bg-info-bg px-3 py-2"><span className="block text-sm text-muted">{dateTime(n.created_at)}</span><span className="whitespace-pre-wrap">{n.body}</span></li>
              ))}
            </ul>
          </>
        )}
      </section>

      {active && (
        <>
          <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="odovzdat">
            <h2 id="odovzdat" className="text-lg font-semibold">Odovzdať kolegovi</h2>
            <p className="text-sm text-muted">Dovolenka, PN alebo nábor nezvládnete. Klient, poznámky a dokumenty idú s náborom.</p>
            {mates.length === 0 ? <p className="mt-2 text-muted">Momentálne nie je k dispozícii žiadny kolega.</p> : (
              <form action={handoffMandate} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={id} />
                <div><label htmlFor="to" className="mb-1.5 block text-sm font-medium">Kolega</label>
                  <select id="to" name="to" required defaultValue="" className={inputStyles}>
                    <option value="" disabled>Vyberte kolegu</option>
                    {mates.map((k) => <option key={k.id} value={k.id}>{k.full_name}{k.branch_name ? ` (${k.branch_name})` : ''}</option>)}
                  </select></div>
                <div><label htmlFor="note" className="mb-1.5 block text-sm font-medium">Dôvod (nepovinné)</label><input id="note" name="note" maxLength={300} className={inputStyles} /></div>
                <Button type="submit" variant="secondary">Odovzdať</Button>
              </form>
            )}
          </section>
          <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="nedohodli">
            <h2 id="nedohodli" className="text-lg font-semibold">Nedohodli sme sa</h2>
            <p className="text-sm text-muted">Nábor pôjde do archívu. Meno, kontakt a popis nehnuteľnosti ostanú 24 mesiacov, rozpracované dokumenty sa zmažú. Dá sa obnoviť.</p>
            <form action={closeMandate} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={id} />
              <div><label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Dôvod</label><input id="reason" name="reason" required maxLength={300} className={inputStyles} /></div>
              <Button type="submit" variant="secondary">Uzavrieť nábor</Button>
            </form>
          </section>
        </>
      )}
      {me.role === 'admin' && <p className="text-sm text-muted">Pozeráte ako admin.</p>}
    </>
  );
}
