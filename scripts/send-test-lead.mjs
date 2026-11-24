#!/usr/bin/env node
// Odošle podpísaný TESTOVACÍ lead na príjem webhooku rozia (rovnaký formát a podpis ako posiela nacenime.sk, pozri docs/WEBHOOK.md v repe nacenime).
// Slúži na overenie nasadenia pred zapnutím skutočného webhooku. Údaje sú vymyslené, id leadu je od 900 000 000 (ľahko sa dajú zmazať).
//
// Použitie:
//   NACENIME_WEBHOOK_SECRET=<rovnaké tajomstvo ako vo Verceli> node scripts/send-test-lead.mjs https://<doména>/api/inbound/nacenime/ [id]
// Adresa MUSÍ končiť lomkou. Tajomstvo sa nikdy nevypisuje. Pri úspechu odpoveď {"status":"processed"} (opakovanie s rovnakým id: "duplicate").
import { createHmac } from 'node:crypto';

const [url, idArg] = process.argv.slice(2);
const secret = process.env.NACENIME_WEBHOOK_SECRET ?? '';
if (!url || !/^https?:\/\/.+\/$/.test(url)) {
  console.error('Zadajte adresu webhooku, ktorá končí lomkou, napr. https://<doména>/api/inbound/nacenime/');
  process.exit(2);
}
if (secret.length < 32) {
  console.error('Nastavte premennú NACENIME_WEBHOOK_SECRET (min. 32 znakov), rovnakú ako vo Verceli.');
  process.exit(2);
}

const id = idArg ? Number(idArg) : 900_000_000 + Math.floor(Math.random() * 99_000_000);
if (!Number.isInteger(id) || id < 900_000_000) {
  console.error('Id testovacieho leadu musí byť celé číslo od 900000000.');
  process.exit(2);
}

const body = JSON.stringify({
  zdroj: 'nacenime.sk', id, vytvorene: new Date().toISOString(), ziadost: 'telefonat',
  meno: 'Testovací Klient', telefon: '0900 000 001', email: null,
  typ: 'Byt', vymera: 60, stav: 'Pôvodný', adresa: 'Testovacia 1', psc: '034 01', obec: 'Ružomberok',
  cena_od: 100000, cena_do: 120000, vysledok: 'ok', dovod: 'Predaj', predstava_ceny: 110000, dom_popis: null,
});
const t = Math.floor(Date.now() / 1000);
const signature = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');

const res = await fetch(url, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/json', 'x-nacenime-event-id': `nacenime-lead-${id}`, 'x-nacenime-signature': `t=${t},v1=${signature}` },
  body,
});
console.log(`Odoslané: nacenime-lead-${id}`);
console.log(`HTTP ${res.status}${res.status >= 300 && res.status < 400 ? ' (presmerovanie: chýba lomka na konci adresy?)' : ''}`);
console.log((await res.text()).slice(0, 300));
process.exit(res.ok ? 0 : 1);
