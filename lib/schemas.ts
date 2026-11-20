import { z } from 'zod';
import { normalizePhone } from './format';

export const PHONE_ERROR = 'Číslo zadajte v tvare +421 9xx xxx xxx.';
export const GDPR_TEXT = 'Súhlasím so spracovaním údajov na účel ocenenia a kontaktovania.';
export const GDPR_TEXT_CONTACT = 'Súhlasím so spracovaním údajov na účel vybavenia mojej správy.';
export const MARKETING_TEXT = 'Chcem raz za štvrťrok dostať cenovú mapu Liptova e-mailom.';

const phone = z.string().trim().transform((v, ctx) => {
  const n = normalizePhone(v);
  if (!n) {
    ctx.addIssue({ code: 'custom', message: PHONE_ERROR });
    return z.NEVER;
  }
  return n;
});
const checkbox = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean());
const consent = checkbox.refine((v) => v, 'Bez súhlasu vám nevieme odpovedať.');
const optionalInt = z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().nullable());

export const propertySchema = z.object({
  address: z.string().trim().min(3, 'Zadajte ulicu a číslo.').max(160),
  locality: z.string().trim().min(1, 'Vyberte obec alebo časť.'),
  type: z.enum(['byty', 'domy', 'chaty', 'apartmany', 'pozemky'], 'Vyberte typ nehnuteľnosti.'),
  areaM2: z.coerce.number('Zadajte plochu v m².').min(10, 'Plocha musí byť aspoň 10 m².').max(100_000, 'Skontrolujte plochu.'),
  rooms: optionalInt.pipe(z.number().min(1).max(12).nullable()),
  floor: optionalInt.pipe(z.number().min(-1).max(30).nullable()),
  hasElevator: checkbox,
  condition: z.enum(['povodny', 'ciastocna-rekonstrukcia', 'rekonstrukcia', 'novostavba'], 'Vyberte stav.'),
  yearBuilt: optionalInt.pipe(z.number().min(1800, 'Skontrolujte rok.').max(2030, 'Skontrolujte rok.').nullable()),
  balcony: checkbox,
  cellar: checkbox,
  parking: checkbox,
});
export type PropertyInput = z.infer<typeof propertySchema>;

export const valuationLeadSchema = propertySchema.extend({
  name: z.string().trim().min(2, 'Zadajte meno.').max(80),
  phone,
  email: z.union([z.literal(''), z.email('Skontrolujte e-mail.')]).default(''),
  timing: z.enum(['do-3-mesiacov', 'do-roka', 'len-zistujem'], 'Vyberte, kedy plánujete predávať.'),
  gdpr: consent,
  marketing: checkbox,
});

export const contactSchema = z.object({
  kind: z.enum(['kontakt', 'kariera', 'dopyt']).default('kontakt'),
  name: z.string().trim().min(2, 'Zadajte meno.').max(80),
  phone,
  email: z.union([z.literal(''), z.email('Skontrolujte e-mail.')]).default(''),
  message: z.string().trim().min(5, 'Napíšte aspoň krátku správu.').max(2000),
  context: z.string().max(200).default(''),
  gdpr: consent,
});

export type FieldErrors = Record<string, string>;
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    out[key] ??= issue.message;
  }
  return out;
}
