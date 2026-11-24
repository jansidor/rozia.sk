import type { Metadata } from 'next';
import { signIn } from '../actions';
import { inputStyles } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Flash } from '@/components/crm-ui';
import { crmConfigured } from '@/lib/crm/session';

export const metadata: Metadata = { title: 'Prihlásenie' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ chyba?: string }> }) {
  const { chyba } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-semibold">Rozia CRM</h1>
      <p className="mt-1 mb-6 text-muted">Prihlásenie pre maklérov a administrátorov.</p>
      {!crmConfigured && <Flash error="Prihlásenie nie je nastavené (chýbajú premenné Supabase)." />}
      {chyba && <Flash error="Prihlásenie sa nepodarilo. Skontrolujte e-mail a heslo." />}
      <form action={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className={inputStyles} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Heslo</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} className={inputStyles} />
        </div>
        <Button type="submit" full>Prihlásiť</Button>
      </form>
    </main>
  );
}
