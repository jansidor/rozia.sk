import type { Metadata } from 'next';
import { requireStaff } from '@/lib/crm/session';
import { Empty, Flash, PageTitle, dateTime, range } from '@/components/crm-ui';
import { Button } from '@/components/ui/button';
import { claimValuation } from '../../actions';

export const metadata: Metadata = { title: 'Nepridelené' };

interface Row {
  id: string; property_type: string | null; city_slug: string | null; area_m2: number | null;
  estimate_low: number | null; estimate_high: number | null; unassigned_since: string | null; created_at: string;
  branch: { name: string } | { name: string }[] | null;
}

export default async function Unassigned({ searchParams }: { searchParams: Promise<{ ok?: string; chyba?: string }> }) {
  const { ok, chyba } = await searchParams;
  const { supa } = await requireStaff('broker');
  const { data, error } = await supa
    .from('valuations')
    .select('id, property_type, city_slug, area_m2, estimate_low, estimate_high, unassigned_since, created_at, branch:branches(name)')
    .eq('status', 'nepridelene')
    .order('created_at', { ascending: true })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle lead="Ocenenia, ktoré ešte nemajú makléra. Kto klikne prvý, toho je. Vziať si môžete jedno ocenenie za 24 hodín, dohodnite sa s ostatnými.">Nepridelené</PageTitle>
      <Flash ok={ok} error={chyba ?? (error ? 'Zoznam sa nepodarilo načítať.' : undefined)} />
      {rows.length === 0 ? (
        <Empty>Žiadne nepridelené ocenenia.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const b = Array.isArray(r.branch) ? r.branch[0] : r.branch;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-subtle bg-white p-4 shadow-card">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{r.property_type ?? 'Nehnuteľnosť'}{r.city_slug ? `, ${r.city_slug}` : ''}{r.area_m2 ? ` · ${r.area_m2} m²` : ''}</p>
                  <p className="tabular text-muted">Odhad {range(r.estimate_low, r.estimate_high)} · čaká od {dateTime(r.unassigned_since ?? r.created_at)}{b ? ` · pobočka ${b.name}` : ' · bez pobočky'}</p>
                </div>
                <form action={claimValuation}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="brand">Vziať si</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
