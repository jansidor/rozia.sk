import { createClient } from '@supabase/supabase-js';
import { handleInbound } from '@/lib/inbound';

/**
 * Príjem leadov z nacenime.sk (webhook). Adresa MUSÍ končiť lomkou: https://<doména>/api/inbound/nacenime/
 * (web má zapnuté trailingSlash; bez lomky by prišlo presmerovanie 308, ktoré nacenime nenasleduje a doručenie by zlyhávalo).
 * Tajomstvá: NACENIME_WEBHOOK_SECRET (+ voliteľne NACENIME_WEBHOOK_SECRET_PREVIOUS pri výmene). Zápis cez SUPABASE_SERVICE_ROLE_KEY.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secrets = [process.env.NACENIME_WEBHOOK_SECRET ?? '', process.env.NACENIME_WEBHOOK_SECRET_PREVIOUS ?? ''];

  return handleInbound(request, {
    secrets: url && key ? secrets : [],
    ingest: async (eventId, payload) => {
      if (!url || !key) throw new Error('not configured');
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await db.rpc('ingest_nacenime_event', { p_event_id: eventId, p_payload: payload });
      if (error) throw new Error('rpc failed');
      return { status: String((data as { status?: string } | null)?.status ?? 'unknown') };
    },
  });
}

export function GET(): Response {
  return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
