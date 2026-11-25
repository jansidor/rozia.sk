import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/crm/session';
import { FIELD_SK, Flash, PageTitle, STATUS_SK, dateTime, one, range, mailHref } from '@/components/crm-ui';
import { Button } from '@/components/ui/button';
import { createMandate, linkReturningClient } from '../../../actions';

export const metadata: Metadata = { title: 'Ocenenie' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Client { full_name: string; phone: string | null; email: string | null }
interface Valuation {
  id: string; status: string; property_type: string | null; city_slug: string | null; area_m2: number | null;
  estimate_low: number | null; estimate_high: number | null; created_at: string; assigned_at: string | null;
  payload: Record<string, unknown> | null; client: Client | Client[] | null;
}
interface Candidate {
  client_id: string; mandate_id: string | null; mandate_status: string | null; archived_at: string | null; archive_reason: string | null;
  previous_owner: string | null; score: number | null; is_match: boolean; changes: Record<string, { old: unknown; new: unknown }> | null;
}

const show = (v: unknown) => (v == null || v === '' ? '–' : String(v));

export default async function ValuationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { id } = await params;
  const { ok, chyba } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supa, me } = await requireStaff('broker');

  const { data } = await supa
    .from('valuations')
    .select('id, status, property_type, city_slug, area_m2, estimate_low, estimate_high, created_at, assigned_at, payload, client:clients(full_name, phone, email)')
    .eq('id', id)
    .eq('assigned_to', me.id)
    .maybeSingle();
  if (!data) notFound();
  const v = data as unknown as Valuation;
  const c = one(v.client);
  const p = v.payload ?? {};

  const [{ data: mandates }, { data: cand }] = await Promise.all([
    supa.from('mandates').select('id, status').eq('valuation_id', id).in('status', ['aktivny', 'predany']).limit(1),
    supa.rpc('returning_client_check', { p_valuation: id }),
  ]);
  const mandate = ((mandates ?? []) as { id: string; status: string }[])[0];
  const candidates = ((cand ?? []) as Candidate[]);

  return (
    <>
      <p className="mb-2"><Link href="/crm/ocenenia/" className="text-green-700 underline">← Moje ocenenia</Link></p>
      <PageTitle lead={`${STATUS_SK[v.status] ?? v.status} · pridelené ${dateTime(v.assigned_at ?? v.created_at)}`}>
        {v.property_type ?? 'Nehnuteľnosť'}{v.city_slug ? `, ${v.city_slug}` : ''}{v.area_m2 ? ` · ${v.area_m2} m²` : ''}
      </PageTitle>
      <Flash ok={ok} error={chyba} />

      <section className="mb-6 rounded-2xl border border-subtle bg-white p-4 shadow-card" aria-labelledby="udaje">
        <h2 id="udaje" className="text-lg font-semibold">Údaje z kalkulačky</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">Odhad ceny</dt><dd className="tabular">{range(v.estimate_low, v.estimate_high)}</dd></div>
          <div><dt className="text-sm text-muted">Predstava klienta</dt><dd>{show(p.predstava_ceny)}</dd></div>
          <div><dt className="text-sm text-muted">Adresa</dt><dd>{show(p.adresa)}{p.psc ? `, ${String(p.psc)}` : ''}{p.obec ? ` ${String(p.obec)}` : ''}</dd></div>
          <div><dt className="text-sm text-muted">Stav nehnuteľnosti</dt><dd>{show(p.stav)}</dd></div>
          <div><dt className="text-sm text-muted">Dôvod</dt><dd>{show(p.dovod)}</dd></div>
          <div><dt className="text-sm text-muted">Popis domu</dt><dd className="whitespace-pre-wrap">{show(typeof p.dom_popis === 'object' ? JSON.stringify(p.dom_popis) : p.dom_popis)}</dd></div>
        </dl>
        {c && (
          <p className="mt-3 border-t border-subtle pt-3">
            <strong>{c.full_name}</strong>
            {c.phone && <> · <a className="text-green-700 underline" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></>}
            {c.email && <> · <a className="text-green-700 underline" href={mailHref(c.email)}>{c.email}</a></>}
          </p>
        )}
      </section>

      {candidates.length > 0 && (
        <section className="mb-6 rounded-2xl border-2 border-warning bg-warning-bg p-4" aria-labelledby="vrateny">
          <h2 id="vrateny" className="text-lg font-semibold">Klient sa možno vrátil</h2>
          <p className="text-sm">V systéme je záznam s rovnakým telefónom alebo e-mailom.</p>
          <ul className="mt-3 space-y-4">
            {candidates.map((k) => (
              <li key={k.client_id} className="rounded-xl bg-white p-3">
                <p>
                  {k.mandate_id
                    ? <>Predošlý nábor: <strong>{STATUS_SK[k.mandate_status ?? ''] ?? k.mandate_status}</strong>{k.archived_at ? ` (archivovaný ${dateTime(k.archived_at)}${k.archive_reason ? `, dôvod: ${k.archive_reason}` : ''})` : ''}{k.previous_owner ? ` · maklér ${k.previous_owner}` : ''}</>
                    : 'Klient už v systéme je, ale nemá nábor.'}
                </p>
                {k.score != null && <p className="text-sm text-muted">Zhoda nehnuteľnosti: {Math.round(k.score * 100)} %{k.is_match ? ' (rovnaká alebo podobná)' : ' (iná nehnuteľnosť)'}</p>}
                {k.changes && Object.keys(k.changes).length > 0 && (
                  <ul className="mt-2 text-sm">
                    {Object.entries(k.changes).map(([field, ch]) => (
                      <li key={field}>{FIELD_SK[field] ?? field}: {show(ch.old)} → <strong>{show(ch.new)}</strong></li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  {k.mandate_id && k.mandate_status === 'nedohodnuty' && (
                    <form action={linkReturningClient}>
                      <input type="hidden" name="valuation" value={id} />
                      <input type="hidden" name="client" value={k.client_id} />
                      <input type="hidden" name="mandate" value={k.mandate_id} />
                      <Button type="submit" variant={k.is_match ? 'primary' : 'secondary'}>Obnoviť pôvodný nábor</Button>
                    </form>
                  )}
                  {(!k.mandate_id || k.mandate_status !== 'aktivny') && (
                    <form action={linkReturningClient}>
                      <input type="hidden" name="valuation" value={id} />
                      <input type="hidden" name="client" value={k.client_id} />
                      <Button type="submit" variant="secondary">Nový nábor pre tohto klienta</Button>
                    </form>
                  )}
                </div>
                {k.mandate_status === 'aktivny' && <p className="mt-2 text-sm">Klient má aktívny nábor. Dohodnite sa s jeho maklérom alebo s adminom.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="nabor">
        <h2 id="nabor" className="mb-2 text-lg font-semibold">Nábor</h2>
        {mandate ? (
          <p>Nábor už existuje. <Link className="text-green-700 underline" href={`/crm/nabory/${mandate.id}/`}>Otvoriť nábor</Link></p>
        ) : (
          <form action={createMandate}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="brand">Vytvoriť nábor</Button>
            <p className="mt-2 text-sm text-muted">Údaje klienta, adresa, výmera a predstava ceny sa predvyplnia z ocenenia.</p>
          </form>
        )}
      </section>
    </>
  );
}
