import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/crm/session';
import { Empty, Flash, PageTitle, dateTime, range } from '@/components/crm-ui';

export const metadata: Metadata = { title: 'Moje ocenenia' };

interface Client { full_name: string; phone: string | null; email: string | null }
interface Row {
  id: string; property_type: string | null; city_slug: string | null; area_m2: number | null;
  estimate_low: number | null; estimate_high: number | null; created_at: string; assigned_at: string | null;
  client: Client | Client[] | null;
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function MyValuations({ searchParams }: { searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { ok, chyba } = await searchParams;
  const { supa, me } = await requireStaff('broker');
  const { data, error } = await supa
    .from('valuations')
    .select('id, property_type, city_slug, area_m2, estimate_low, estimate_high, created_at, assigned_at, client:clients(full_name, phone, email)')
    .eq('assigned_to', me.id)
    .neq('status', 'archiv')
    .order('assigned_at', { ascending: false, nullsFirst: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle lead="Ocenenia z nacenime.sk, ktoré vám boli pridelené. Ozvite sa klientovi a vytvorte nábor.">Moje ocenenia</PageTitle>
      <Flash ok={ok} error={chyba ?? (error ? 'Ocenenia sa nepodarilo načítať.' : undefined)} />
      {rows.length === 0 ? (
        <Empty>Zatiaľ nemáte pridelené ocenenie. Skontrolujte Nepridelené.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const c = one(r.client);
            return (
              <li key={r.id} className="rounded-2xl border border-subtle bg-white p-4 shadow-card">
                <p className="text-lg font-semibold"><Link className="hover:underline" href={`/crm/ocenenia/${r.id}/`}>{r.property_type ?? 'Nehnuteľnosť'}{r.city_slug ? `, ${r.city_slug}` : ''}{r.area_m2 ? ` · ${r.area_m2} m²` : ''}</Link></p>
                <p className="tabular text-muted">Odhad {range(r.estimate_low, r.estimate_high)} · pridelené {dateTime(r.assigned_at ?? r.created_at)}</p>
                {c && (
                  <p className="mt-2">
                    <strong>{c.full_name}</strong>
                    {c.phone && <> · <a className="text-green-700 underline" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></>}
                    {c.email && <> · <a className="text-green-700 underline" href={`mailto:${c.email}`}>{c.email}</a></>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
