import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export const inputStyles =
  'block min-h-11 w-full rounded-xl border border-control bg-white px-3.5 py-2.5 text-base text-green-950 placeholder:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:border-2';

interface FieldProps {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
}

export function FieldShell({ label, name, error, hint, optional, className, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-muted">(nepovinné)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${name}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p>}
      <FieldError id={`${name}-error`} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </p>
  );
}

const describedBy = (name: string, error?: string, hint?: ReactNode) =>
  error ? `${name}-error` : hint ? `${name}-hint` : undefined;

export function TextField({ label, name, error, hint, optional, className, ...input }: FieldProps & Omit<ComponentProps<'input'>, 'name' | 'className'>) {
  return (
    <FieldShell {...{ label, name, error, hint, optional, className }}>
      <input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy(name, error, hint)} required={!optional} className={inputStyles} {...input} />
    </FieldShell>
  );
}

export function SelectField({ label, name, error, hint, optional, className, children, ...select }: FieldProps & Omit<ComponentProps<'select'>, 'name' | 'className'>) {
  return (
    <FieldShell {...{ label, name, error, hint, optional, className }}>
      <select id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy(name, error, hint)} required={!optional} className={inputStyles} {...select}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextArea({ label, name, error, hint, optional, className, ...area }: FieldProps & Omit<ComponentProps<'textarea'>, 'name' | 'className'>) {
  return (
    <FieldShell {...{ label, name, error, hint, optional, className }}>
      <textarea id={name} name={name} rows={4} aria-invalid={Boolean(error)} aria-describedby={describedBy(name, error, hint)} required={!optional} className={inputStyles} {...area} />
    </FieldShell>
  );
}

/** Checkbox s klikateľnou plochou ≥ 44 px. Nikdy nie je predvolene zaškrtnutý. */
export function Checkbox({ name, error, children, className, ...input }: { name: string; error?: string; children: ReactNode; className?: string } & Omit<ComponentProps<'input'>, 'name' | 'type' | 'className'>) {
  return (
    <div className={className}>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
        <input type="checkbox" id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className="mt-0.5 size-5 shrink-0 rounded border-control" {...input} />
        <span className="text-sm leading-snug">{children}</span>
      </label>
      <FieldError id={`${name}-error`} error={error} />
    </div>
  );
}

export function Notice({ tone, title, children, className }: { tone: 'info' | 'warning' | 'danger' | 'success'; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-info-bg text-info border-info/30',
    warning: 'bg-warning-bg text-warning border-warning/30',
    danger: 'bg-danger-bg text-danger border-danger/30',
    success: 'bg-green-50 text-success border-success/30',
  } as const;
  const Icon = { info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', tones[tone], className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-1')}>{children}</div>
      </div>
    </div>
  );
}
