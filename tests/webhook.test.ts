import { describe, expect, it } from 'vitest';
import { handleInbound, MAX_BODY_BYTES } from '../lib/inbound';
import { signatureFor, verifySignature } from '../lib/webhook';

const secret = 'a1b2c3d4'.repeat(8);
const t = 1_800_000_000;

describe('podpis webhooku (zhoda s PHP implementáciou v nacenime)', () => {
  // Vektor vygenerovaný skutočným Nacenime\WebhookPodpis::hlavicky() (PHP 8.3), vrátane diakritiky v tele.
  const body = '{"zdroj":"nacenime.sk","id":7,"meno":"Jana Nováková"}';
  const phpHeader = 't=1800000000,v1=de6276070fc2b95cb95a0955abaafb186970fc0ad213a5c8ee51a4979c13b8a7';

  it('rovnaký podpis ako PHP', () => {
    expect(`t=${t},v1=${signatureFor(secret, t, body)}`).toBe(phpHeader);
  });
  it('platný podpis z PHP sa overí', () => {
    expect(verifySignature(phpHeader, body, [secret], t)).toBeNull();
  });
  it('tolerancia 300 s (hranica platí, o sekundu staršie nie)', () => {
    expect(verifySignature(phpHeader, body, [secret], t + 300)).toBeNull();
    expect(verifySignature(phpHeader, body, [secret], t + 301)).toBe('časová pečiatka mimo tolerancie');
    expect(verifySignature(phpHeader, body, [secret], t - 301)).toBe('časová pečiatka mimo tolerancie');
  });
  it('zamieta zmenené telo, iné tajomstvo, podvrhnutú pečiatku a zlý formát', () => {
    expect(verifySignature(phpHeader, body + ' ', [secret], t)).toBe('podpis nesedí');
    expect(verifySignature(phpHeader, body, ['zle' + secret], t)).toBe('podpis nesedí');
    expect(verifySignature(`t=${t + 10},v1=${signatureFor(secret, t, body)}`, body, [secret], t + 10)).toBe('podpis nesedí');
    expect(verifySignature(null, body, [secret], t)).toBe('chýba podpis');
    expect(verifySignature('', body, [secret], t)).toBe('chýba podpis');
    expect(verifySignature(`t=${t},v1=abc`, body, [secret], t)).toBe('neplatný formát podpisu');
    expect(verifySignature(`t=${t},v1=${signatureFor(secret, t, body).toUpperCase()}`, body, [secret], t)).toBe('neplatný formát podpisu');
  });
  it('bez tajomstva sa nikdy neoverí', () => {
    expect(verifySignature(phpHeader, body, [], t)).toBe('tajomstvo nie je nastavené');
    expect(verifySignature(phpHeader, body, [''], t)).toBe('tajomstvo nie je nastavené');
  });
  it('výmena tajomstva: platí aj predchádzajúce', () => {
    const old = 'x'.repeat(40);
    const h = `t=${t},v1=${signatureFor(old, t, body)}`;
    expect(verifySignature(h, body, [secret, old], t)).toBeNull();
    expect(verifySignature(h, body, [secret], t)).toBe('podpis nesedí');
  });
});

function signed(payload: unknown, opts: { secret?: string; eventId?: string; time?: number; raw?: string } = {}): Request {
  const raw = opts.raw ?? JSON.stringify(payload);
  const time = opts.time ?? t;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-nacenime-signature': `t=${time},v1=${signatureFor(opts.secret ?? secret, time, raw)}`,
  };
  if (opts.eventId !== undefined) headers['x-nacenime-event-id'] = opts.eventId;
  return new Request('https://rozia.sk/api/inbound/nacenime/', { method: 'POST', headers, body: raw });
}

describe('príjem webhooku (handleInbound)', () => {
  const lead = { zdroj: 'nacenime.sk', id: 42, ziadost: 'telefonat', meno: 'Jana', telefon: '0905 111 111', obec: 'Martin' };
  const calls: Array<[string, Record<string, unknown>]> = [];
  const deps = (over: Partial<Parameters<typeof handleInbound>[1]> = {}) => ({
    secrets: [secret],
    now: () => t * 1000,
    ingest: async (id: string, p: Record<string, unknown>) => { calls.push([id, p]); return { status: 'processed' }; },
    ...over,
  });
  const reset = () => { calls.length = 0; };

  it('platná udalosť sa uloží a vráti 200', async () => {
    reset();
    const res = await handleInbound(signed(lead, { eventId: 'nacenime-lead-42' }), deps());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'processed' });
    expect(calls).toEqual([['nacenime-lead-42', lead]]);
  });
  it('bez nastaveného tajomstva 503 a nič sa neuloží', async () => {
    reset();
    const res = await handleInbound(signed(lead, { eventId: 'nacenime-lead-42' }), deps({ secrets: [] }));
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });
  it('zlý podpis a starý čas: 401 a nič sa neuloží', async () => {
    reset();
    expect((await handleInbound(signed(lead, { eventId: 'nacenime-lead-42', secret: 'iné'.repeat(20) }), deps())).status).toBe(401);
    expect((await handleInbound(signed(lead, { eventId: 'nacenime-lead-42', time: t - 1000 }), deps())).status).toBe(401);
    const noSig = new Request('https://rozia.sk/api/inbound/nacenime/', { method: 'POST', headers: { 'x-nacenime-event-id': 'nacenime-lead-42' }, body: JSON.stringify(lead) });
    expect((await handleInbound(noSig, deps())).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  it('chyby tela sa hlásia až po platnom podpise: 400', async () => {
    reset();
    expect((await handleInbound(signed(lead, { eventId: 'nacenime-lead-99' }), deps())).status).toBe(400);   // ID udalosti nesedí s telom
    expect((await handleInbound(signed(lead, { eventId: 'abc' }), deps())).status).toBe(400);
    expect((await handleInbound(signed(lead), deps())).status).toBe(400);                                      // chýba hlavička
    expect((await handleInbound(signed(null, { eventId: 'nacenime-lead-42', raw: 'not json' }), deps())).status).toBe(400);
    expect((await handleInbound(signed(null, { eventId: 'nacenime-lead-42', raw: '[1,2]' }), deps())).status).toBe(400);
    expect((await handleInbound(signed(null, { eventId: 'nacenime-lead-42', raw: '"text"' }), deps())).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it('príliš veľké telo: 413', async () => {
    reset();
    const raw = JSON.stringify({ id: 42, pad: 'x'.repeat(MAX_BODY_BYTES) });
    expect((await handleInbound(signed(null, { eventId: 'nacenime-lead-42', raw }), deps())).status).toBe(413);
    expect(calls).toHaveLength(0);
  });
  it('výpadok databázy: 500, aby nacenime doručenie zopakovalo', async () => {
    const res = await handleInbound(signed(lead, { eventId: 'nacenime-lead-42' }), deps({ ingest: async () => { throw new Error('db down'); } }));
    expect(res.status).toBe(500);
  });
  it('udalosť uložená s chybou spracovania sa potvrdí 200 (ostane na opakovanie v databáze)', async () => {
    const res = await handleInbound(signed(lead, { eventId: 'nacenime-lead-42' }), deps({ ingest: async () => ({ status: 'error' }) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'error' });
  });
  it('odpoveď nikdy neobsahuje údaje z tela', async () => {
    const res = await handleInbound(signed(lead, { eventId: 'nacenime-lead-42' }), deps());
    const text = await res.text();
    expect(text).not.toContain('Jana');
    expect(text).not.toContain('0905');
  });
});
