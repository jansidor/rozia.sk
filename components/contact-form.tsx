'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitContact, type FormState } from '@/app/actions';
import { GDPR_TEXT_CONTACT } from '@/lib/schemas';
import { Button } from './ui/button';
import { Checkbox, Notice, TextArea, TextField } from './ui/field';

interface Props {
  kind?: 'kontakt' | 'kariera' | 'dopyt';
  /** Kontext pre makléra, napr. názov inzerátu. */
  context?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  submitLabel?: string;
}

export function ContactForm({ kind = 'kontakt', context = '', messageLabel = 'Správa', messagePlaceholder, submitLabel = 'Odoslať správu' }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, { status: 'idle' });
  const errors = state.status === 'error' ? state.errors : {};

  if (state.status === 'ok') {
    return (
      <Notice tone="success" title="Hotovo, správu máme.">
        Ozveme sa vám najneskôr nasledujúci pracovný deň.
      </Notice>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="context" value={context} />
      {state.status === 'error' && (
        <Notice tone="danger" title={state.message ?? 'Formulár sa nepodarilo odoslať.'}>
          {!state.message && 'Skontrolujte označené polia.'}
        </Notice>
      )}
      <TextField label="Meno a priezvisko" name="name" autoComplete="name" error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Telefón" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+421 9xx xxx xxx" error={errors.phone} />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" optional error={errors.email} />
      </div>
      <TextArea label={messageLabel} name="message" placeholder={messagePlaceholder} error={errors.message} />
      <Checkbox name="gdpr" error={errors.gdpr} required>
        {GDPR_TEXT_CONTACT}{' '}
        <Link href="/ochrana-osobnych-udajov/" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-950">
          Ako s údajmi pracujeme
        </Link>
      </Checkbox>
      <Button type="submit" disabled={pending}>{pending ? 'Odosielam…' : submitLabel}</Button>
    </form>
  );
}
