import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/crm/session';
import { Empty, FINANCING_SK, PageTitle, STATUS_SK, dateTime } from '@/components/crm-ui';

export const metadata: Metadata = { title: 'Financovanie' };

interface Row {
  id: string; title: string; status: string; financing_status: string; created_at: string; property_type: string | null;
  branch: { name: string } | { name: string }[] | null;
}

export default async function FinancingList({ searchParams }: { searchParams: Promise<{ stav?: string; chyba?: string }> }) {
  const { stav } = await searchParams;
  const { supa } = await requireStaff('finance', 'admin');
  let q = supa
    .from('mandates')
    .select('id, title, status, financing_status, created_at, property_type, branch:branches(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (stav && Object.hasOwn(FINANCING_SK, stav)) q = q.eq('financing_status', stav);
  const { data, error } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle lead="Všetky začaté nábory zo všetkých pobočiek. Otvorte nábor, uvidíte kontakt klienta a nastavíte stav financovania.">Financovanie</PageTitle>
      <nav aria-label="Filter stavu" className="mb-4 flex flex-wrap gap-2">
        <Link href="/crm/financovanie/" className={`min-h-11 content-center rounded-xl border px-4 text-base font-medium ${!stav ? 'border-green-950 bg-green-950 text-white' : 'border-control bg-white'}`}>Všetky</Link>
        {Object.entries(FINANCING_SK).map(([key, label]) => (
          <Link key={key} href={`/crm/financovanie/?stav=${key}`} className={`min-h-11 content-center rounded-xl border px-4 text-base font-medium ${stav === key ? 'border-green-950 bg-green-950 text-white' : 'border-control bg-white'}`}>{label}</Link>
        ))}
      </nav>
      {error && <p role="alert" className="mb-4 text-danger">Nábory sa nepodarilo načítať.</p>}
      {rows.length === 0 ? (
        <Empty>Žiadne nábory v tomto stave.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const b = Array.isArray(r.branch) ? r.branch[0] : r.branch;
            return (
              <li key={r.id}>
                <Link href={`/crm/financovanie/${r.id}/`} className="block rounded-2xl border border-subtle bg-white p-4 shadow-card hover:border-green-700">
                  <span className="block text-lg font-semibold">{r.title}</span>
                  <span className="block text-muted">{b?.name ?? 'bez pobočky'} · {STATUS_SK[r.status] ?? r.status} · {dateTime(r.created_at)}</span>
                  <span className="mt-1 block text-sm font-medium">Financovanie: {FINANCING_SK[r.financing_status] ?? r.financing_status}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
