'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';

const KEY = 'rozia_saved';
const read = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[];
  } catch {
    return [];
  }
};

/** Uloženie do zoznamu obľúbených (v prehliadači, bez účtu). Cieľ 44 × 44 px. */
export function SaveButton({ id, title, className }: { id: number; title: string; className?: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(read().includes(id)), [id]);

  const toggle = () => {
    const list = read();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next.includes(id));
  };

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={toggle}
      className={cn('inline-flex size-11 items-center justify-center gap-2 rounded-full border border-subtle bg-white text-green-950 shadow-card hover:bg-green-50', className)}
    >
      <Heart aria-hidden className={cn('size-5', saved && 'fill-danger text-danger')} />
      <span className="sr-only">{saved ? `Uložené: ${title}. Odstrániť z uložených` : `Uložiť: ${title}`}</span>
    </button>
  );
}
