'use client';

import { FileDown } from 'lucide-react';
import { Button } from './ui/button';

export function PrintButton({ children }: { children: string }) {
  return (
    <Button type="button" variant="secondary" className="no-print" onClick={() => window.print()}>
      <FileDown aria-hidden className="size-5" />
      {children}
    </Button>
  );
}
