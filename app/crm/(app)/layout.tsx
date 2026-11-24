import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/crm/session';
import { CRM_LOGIN } from '@/lib/crm/guard';
import { navFor, ROLE_LABEL } from '@/lib/crm/nav';
import { signOut } from '../actions';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const s = await currentSession();
  if (!s.me && s.reason === 'anonymous') redirect(CRM_LOGIN);

  if (!s.me) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Účet nemá pridelenú rolu</h1>
        <p className="mt-2 text-muted">Ste prihlásený, ale váš účet ešte nie je zaradený medzi zamestnancov. Požiadajte správcu o pridelenie roly.</p>
        <form action={signOut} className="mt-6"><Button type="submit" variant="secondary">Odhlásiť</Button></form>
      </main>
    );
  }

  const nav = navFor(s.me.role);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-subtle bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/crm/" className="text-lg font-semibold">Rozia CRM</Link>
          <nav aria-label="Hlavné menu" className="flex flex-wrap gap-x-4 gap-y-1">
            {nav.map((i) => (
              <Link key={i.href} href={i.href} className="min-h-11 content-center text-base font-medium text-green-700 hover:text-green-950 hover:underline">{i.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted">{s.me.fullName} · {ROLE_LABEL[s.me.role]}</span>
            <form action={signOut}><Button type="submit" variant="secondary" size="sm">Odhlásiť</Button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
