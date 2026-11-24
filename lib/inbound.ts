import { verifySignature } from './webhook';

/** Najväčšie prijaté telo (bajty). Lead z nacenime má pár stoviek bajtov. */
export const MAX_BODY_BYTES = 64 * 1024;

const EVENT_ID = /^nacenime-lead-(\d{1,12})$/;

export type IngestResult = { status: string };

export interface InboundDeps {
  /** Tajomstvá na overenie (aktuálne a voliteľne predchádzajúce pri výmene). */
  secrets: readonly string[];
  /** Uloží a spracuje udalosť (v produkcii volá databázovú funkciu ingest_nacenime_event servisným kľúčom). */
  ingest: (eventId: string, payload: Record<string, unknown>) => Promise<IngestResult>;
  now?: () => number;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

/**
 * Spracuje požiadavku webhooku z nacenime. Poradie je dôležité:
 * 1. bez tajomstva sa nič nespracuje (503),
 * 2. veľkosť tela, 3. overenie podpisu zo SUROVÉHO tela (401), 4. až potom sa telo parsuje (400),
 * 5. 2xx sa vráti až po bezpečnom uložení; pri výpadku databázy 500, aby nacenime doručenie zopakovalo.
 * Z tela sa nič nelogujú (obsahuje osobné údaje).
 */
export async function handleInbound(request: Request, deps: InboundDeps): Promise<Response> {
  if (deps.secrets.filter((s) => s.length > 0).length === 0) return json({ error: 'not_configured' }, 503);

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);

  const reason = verifySignature(
    request.headers.get('x-nacenime-signature'),
    body,
    deps.secrets,
    Math.floor((deps.now ? deps.now() : Date.now()) / 1000),
  );
  if (reason !== null) return json({ error: 'unauthorized' }, 401);

  const eventId = request.headers.get('x-nacenime-event-id') ?? '';
  const leadId = EVENT_ID.exec(eventId)?.[1];
  if (!leadId) return json({ error: 'invalid_event_id' }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return json({ error: 'invalid_payload' }, 400);
  if (String((payload as Record<string, unknown>).id ?? '') !== leadId) return json({ error: 'event_id_mismatch' }, 400);

  try {
    const result = await deps.ingest(eventId, payload as Record<string, unknown>);
    // 'error' = udalosť je uložená, ale spracovanie zlyhalo (ostane na opakovanie); nacenime ju nemá posielať znova
    return json({ status: result.status }, 200);
  } catch {
    return json({ error: 'storage_unavailable' }, 500);
  }
}
