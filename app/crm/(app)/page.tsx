import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/crm/session';
import { PageTitle } from '@/components/crm-ui';
import { navFor } from '@/lib/crm/nav';

export const metadata: Metadata = { title: 'Prehľad' };

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await q).count ?? 0;
}

export default async function CrmHome() {
  const { supa, me } = await requireStaff();
  const head = { count: 'exact' as const, head: true };
  const cards: { label: string; value: number; href: string }[] = [];

  if (me.role === 'broker') {
    cards.push(
      { label: 'Moje ocenenia', value: await count(supa.from('valuations').select('id', head).eq('assigned_to', me.id).eq('status', 'pridelene')), href: '/crm/ocenenia/' },
      { label: 'Nepridelené, ktoré si môžete vziať', value: await count(supa.from('valuations').select('id', head).eq('status', 'nepridelene')), href: '/crm/nepridelene/' },
      { label: 'Moje aktívne nábory', value: await count(supa.from('mandates').select('id', head).eq('status', 'aktivny')), href: '/crm/nabory/' },
    );
  } else if (me.role === 'admin') {
    cards.push(
      { label: 'Na pridelenie', value: await count(supa.from('valuations').select('id', head).eq('status', 'nepridelene')), href: '/crm/pridelenie/' },
      { label: 'Aktívne nábory', value: await count(supa.from('mandates').select('id', head).eq('status', 'aktivny')), href: '/crm/nabory/' },
      { label: 'Financovanie sa rieši', value: await count(supa.from('mandates').select('id', head).eq('financing_status', 'riesi_sa')), href: '/crm/financovanie/?stav=riesi_sa' },
    );
  } else {
    cards.push(
      { label: 'Nové nábory na posúdenie', value: await count(supa.from('mandates').select('id', head).eq('financing_status', 'nove')), href: '/crm/financovanie/?stav=nove' },
      { label: 'Rieši sa', value: await count(supa.from('mandates').select('id', head).eq('financing_status', 'riesi_sa')), href: '/crm/financovanie/?stav=riesi_sa' },
    );
  }

  return (
    <>
      <PageTitle lead={`Prihlásený: ${me.fullName}`}>Prehľad</PageTitle>
      <ul className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="block rounded-2xl border border-subtle bg-white p-5 shadow-card hover:border-green-700">
              <span className="tabular block text-4xl font-semibold">{c.value}</span>
              <span className="mt-1 block text-muted">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">Menu: {navFor(me.role).map((i) => i.label).join(', ')}.</p>
    </>
  );
}
