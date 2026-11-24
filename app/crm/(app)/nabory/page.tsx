import type { Metadata } from 'next';
import { requireStaff } from '@/lib/crm/session';
import { Empty, FINANCING_SK, PageTitle, STATUS_SK, dateTime } from '@/components/crm-ui';

export const metadata: Metadata = { title: 'Nábory' };

interface Row {
  id: string; title: string; status: string; financing_status: string; created_at: string; address: string | null;
  client: { full_name: string } | { full_name: string }[] | null;
}

export default async function Mandates() {
  const { supa, me } = await requireStaff('broker', 'admin');
  const { data, error } = await supa
    .from('mandates')
    .select('id, title, status, financing_status, created_at, address, client:clients(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle lead={me.role === 'broker' ? 'Vaše nábory.' : 'Všetky nábory.'}>{me.role === 'broker' ? 'Moje nábory' : 'Nábory'}</PageTitle>
      {error && <p role="alert" className="mb-4 text-danger">Nábory sa nepodarilo načítať.</p>}
      {rows.length === 0 ? (
        <Empty>Zatiaľ žiadne nábory. Vytvorenie náboru z ocenenia pribudne v ďalšej verzii.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const c = Array.isArray(r.client) ? r.client[0] : r.client;
            return (
              <li key={r.id} className="rounded-2xl border border-subtle bg-white p-4 shadow-card">
                <p className="text-lg font-semibold">{r.title}</p>
                <p className="text-muted">{c?.full_name ?? 'klient'}{r.address ? ` · ${r.address}` : ''} · {dateTime(r.created_at)}</p>
                <p className="mt-1 text-sm"><span className="font-medium">{STATUS_SK[r.status] ?? r.status}</span> · financovanie: {FINANCING_SK[r.financing_status] ?? r.financing_status}</p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
