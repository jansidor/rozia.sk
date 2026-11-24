import { describe, expect, it } from 'vitest';
import { handleRetention } from '../lib/cron';

const secret = 'cron-tajomstvo-0123456789';
const req = (auth?: string) => new Request('https://rozia.sk/api/cron/retention/', { headers: auth ? { authorization: auth } : {} });

describe('denná údržba (handleRetention)', () => {
  it('so správnym tajomstvom spustí údržbu a vráti počty', async () => {
    let called = 0;
    const res = await handleRetention(req(`Bearer ${secret}`), { secret, run: async () => { called++; return { web_leads_deleted: 2 }; } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: { web_leads_deleted: 2 } });
    expect(called).toBe(1);
  });
  it('bez tajomstva, so zlým tajomstvom alebo bez hlavičky nič nespustí', async () => {
    let called = 0;
    const run = async () => { called++; return {}; };
    expect((await handleRetention(req(), { secret, run })).status).toBe(401);
    expect((await handleRetention(req('Bearer zle'), { secret, run })).status).toBe(401);
    expect((await handleRetention(req(secret), { secret, run })).status).toBe(401);
    expect((await handleRetention(req(`Bearer ${secret}x`), { secret, run })).status).toBe(401);
    expect(called).toBe(0);
  });
  it('bez nastaveného (alebo príliš krátkeho) tajomstva 503', async () => {
    let called = 0;
    const run = async () => { called++; return {}; };
    expect((await handleRetention(req('Bearer '), { secret: '', run })).status).toBe(503);
    expect((await handleRetention(req('Bearer abc'), { secret: 'abc', run })).status).toBe(503);
    expect(called).toBe(0);
  });
  it('zlyhanie databázy: 500 bez podrobností', async () => {
    const res = await handleRetention(req(`Bearer ${secret}`), { secret, run: async () => { throw new Error('tajné detaily'); } });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('tajné');
  });
});
