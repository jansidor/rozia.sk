import { createHmac, timingSafeEqual } from 'node:crypto';

/** Povolený rozdiel časovej pečiatky podpisu a času servera (sekundy). Rovnaká hodnota ako v nacenime (WebhookPodpis). */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/** Podpis webhooku z nacenime: hex HMAC-SHA256 z reťazca "<t>.<surové telo>". Pozri docs/WEBHOOK.md v repe nacenime. */
export function signatureFor(secret: string, t: number, body: string): string {
  return createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
}

/**
 * Overí hlavičku `X-Nacenime-Signature: t=<unix>,v1=<hex>` voči surovému telu požiadavky.
 * Akceptuje viac tajomstiev (výmena tajomstva: staré aj nové naraz). Porovnáva v konštantnom čase.
 * Vráti null pri platnom podpise, inak krátky dôvod len pre internú diagnostiku (nikdy sa neposiela klientovi ani nelogujú údaje z tela).
 */
export function verifySignature(
  header: string | null,
  body: string,
  secrets: readonly string[],
  nowSeconds: number = Math.floor(Date.now() / 1000),
  tolerance: number = SIGNATURE_TOLERANCE_SECONDS,
): string | null {
  const usable = secrets.filter((s) => s.length > 0);
  if (usable.length === 0) return 'tajomstvo nie je nastavené';
  if (!header) return 'chýba podpis';
  const m = /^t=(\d{1,12}),v1=([0-9a-f]{64})$/.exec(header);
  const tText = m?.[1];
  const sigHex = m?.[2];
  if (!tText || !sigHex) return 'neplatný formát podpisu';
  const t = Number(tText);
  if (Math.abs(nowSeconds - t) > tolerance) return 'časová pečiatka mimo tolerancie';
  const given = Buffer.from(sigHex, 'hex');
  for (const secret of usable) {
    const expected = Buffer.from(signatureFor(secret, t, body), 'hex');
    if (expected.length === given.length && timingSafeEqual(expected, given)) return null;
  }
  return 'podpis nesedí';
}
