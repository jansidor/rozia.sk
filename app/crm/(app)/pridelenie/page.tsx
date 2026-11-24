import type { Metadata } from 'next';
import { requireStaff } from '@/lib/crm/session';
import { Empty, Flash, PageTitle, dateTime, range } from '@/components/crm-ui';
import { Button } from '@/components/ui/button';
import { inputStyles } from '@/components/ui/field';
import { assignValuation } from '../../actions';

export const metadata: Metadata = { title: 'Na pridelenie' };

interface Client { full_name: string; phone: string | null }
interface Row {
  id: string; property_type: string | null; city_slug: string | null; area_m2: number | null;
  estimate_low: number | null; estimate_high: number | null; created_at: string;
  branch: { id: string; name: string } | { id: string; name: string }[] | null;
  client: Client | Client[] | null;
}
interface Broker { id: string; full_name: string; branch_id: string | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function Assignment({ searchParams }: { searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { ok, chyba } = await searchParams;
  const { supa } = await requireStaff('admin');
  const [{ data: valuations, error }, { data: brokers }, { data: branches }] = await Promise.all([
    supa
      .from('valuations')
      .select('id, property_type, city_slug, area_m2, estimate_low, estimate_high, created_at, branch:branches(id, name), client:clients(full_name, phone)')
      .eq('status', 'nepridelene')
      .order('created_at', { ascending: true })
      .limit(100),
    supa.from('staff').select('id, full_name, branch_id').eq('role', 'broker').eq('active', true).eq('availability', 'available').order('full_name'),
    supa.from('branches').select('id, name'),
  ]);
  const rows = (valuations ?? []) as unknown as Row[];
  const list = (brokers ?? []) as Broker[];
  const branchName = new Map(((branches ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));

  return (
    <>
      <PageTitle lead="Nové ocenenia čakajú na pridelenie. Systém navrhne pobočku podľa obce; vyberte makléra a potvrďte.">Na pridelenie</PageTitle>
      <Flash ok={ok} error={chyba ?? (error ? 'Zoznam sa nepodarilo načítať.' : undefined)} />
      {rows.length === 0 ? (
        <Empty>Nič nečaká na pridelenie.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const b = one(r.branch);
            const c = one(r.client);
            const sorted = [...list].sort((x, y) => Number(y.branch_id === b?.id) - Number(x.branch_id === b?.id) || x.full_name.localeCompare(y.full_name, 'sk'));
            return (
              <li key={r.id} className="rounded-2xl border border-subtle bg-white p-4 shadow-card">
                <p className="text-lg font-semibold">{r.property_type ?? 'Nehnuteľnosť'}{r.city_slug ? `, ${r.city_slug}` : ''}{r.area_m2 ? ` · ${r.area_m2} m²` : ''}</p>
                <p className="tabular text-muted">Odhad {range(r.estimate_low, r.estimate_high)} · prijaté {dateTime(r.created_at)} · {b ? `navrhnutá pobočka ${b.name}` : 'pobočka sa nenašla'}{c ? ` · ${c.full_name}${c.phone ? `, ${c.phone}` : ''}` : ''}</p>
                <form action={assignValuation} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="min-w-56 flex-1">
                    <label htmlFor={`to-${r.id}`} className="mb-1.5 block text-sm font-medium">Maklér</label>
                    <select id={`to-${r.id}`} name="to" required defaultValue="" className={inputStyles}>
                      <option value="" disabled>Vyberte makléra</option>
                      {sorted.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}{s.branch_id ? ` (${branchName.get(s.branch_id) ?? 'pobočka'})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Prideliť</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
