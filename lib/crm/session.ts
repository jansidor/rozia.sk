import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CRM_HOME, CRM_LOGIN } from './guard';
import { isRole, type StaffRole } from './nav';

export const crmConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Cookies relácie: len serverové (httpOnly), SameSite=Lax, v produkcii Secure. */
export const sessionCookie = (options: Record<string, unknown> | undefined) => ({
  ...options,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

/** Klient Supabase v mene prihláseného používateľa (verejný kľúč + jeho relácia). Oprávnenia vynucuje RLS. */
export async function crmClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase nie je nastavený');
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, sessionCookie(options)));
        } catch {
          /* volané zo Server Componentu: obnovu cookies robí proxy */
        }
      },
    },
  });
}

export interface Me {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  branchId: string | null;
  availability: string;
}

export type Session = { supa: SupabaseClient; me: Me } | { supa: SupabaseClient; me: null; reason: 'anonymous' | 'no-staff' };

/** Prihlásený zamestnanec (alebo dôvod, prečo nie). Používa getUser(), ktoré relaciu overí na serveri Supabase. */
export async function currentSession(): Promise<Session> {
  const supa = await crmClient();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { supa, me: null, reason: 'anonymous' };
  const { data } = await supa
    .from('staff')
    .select('id, full_name, email, role, branch_id, availability, active')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!data || !data.active || !isRole(data.role)) return { supa, me: null, reason: 'no-staff' };
  return {
    supa,
    me: { id: data.id, fullName: data.full_name, email: data.email, role: data.role, branchId: data.branch_id, availability: data.availability },
  };
}

/** Vyžaduje prihlásenie a (voliteľne) jednu z rolí. Nesprávna rola ide späť na úvod. */
export async function requireStaff(...roles: StaffRole[]): Promise<{ supa: SupabaseClient; me: Me }> {
  const s = await currentSession();
  if (!s.me) redirect(CRM_LOGIN);
  if (roles.length > 0 && !roles.includes(s.me.role)) redirect(CRM_HOME);
  return { supa: s.supa, me: s.me };
}
