import { createClient } from '@supabase/supabase-js';
import { handleRetention } from '@/lib/cron';

/**
 * Denná údržba databázy: anonymizácia archívu a neaktívnych leadov, mazanie starých dopytov z webu a auditu, čistenie surových udalostí.
 * Spúšťa ju Vercel Cron podľa vercel.json (GET s hlavičkou Authorization: Bearer CRON_SECRET). Adresa končí lomkou (trailingSlash).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return handleRetention(request, {
    secret: url && key ? (process.env.CRON_SECRET ?? '') : '',
    run: async () => {
      if (!url || !key) throw new Error('not configured');
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await db.rpc('run_retention');
      if (error) throw new Error('rpc failed');
      return (data ?? {}) as Record<string, unknown>;
    },
  });
}
