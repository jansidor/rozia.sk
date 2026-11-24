import { timingSafeEqual } from 'node:crypto';

export interface CronDeps {
  /** Tajomstvo z CRON_SECRET. Vercel ho posiela v hlavičke Authorization: Bearer <tajomstvo>. */
  secret: string;
  /** Spustí dennú údržbu (databázová funkcia run_retention servisným kľúčom) a vráti počty bez osobných údajov. */
  run: () => Promise<Record<string, unknown>>;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Denná údržba (uchovávanie údajov podľa zásad ochrany osobných údajov). Bez správneho tajomstva sa nič nespustí. */
export async function handleRetention(request: Request, deps: CronDeps): Promise<Response> {
  if (deps.secret.length < 16) return json({ error: 'not_configured' }, 503);
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!sameSecret(token, deps.secret)) return json({ error: 'unauthorized' }, 401);
  try {
    return json({ ok: true, result: await deps.run() }, 200);
  } catch {
    return json({ error: 'retention_failed' }, 500);
  }
}
