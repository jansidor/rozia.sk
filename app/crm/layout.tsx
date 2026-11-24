import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';

/** Interná aplikácia pre maklérov. Vlastný koreňový layout: bez hlavičky, päty a cookie lišty verejného webu, neindexuje sa. */
export const metadata: Metadata = {
  title: { default: 'Rozia CRM', template: '%s | Rozia CRM' },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#0D2B1D', width: 'device-width', initialScale: 1 };

export default function CrmRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk">
      <body className="min-h-dvh bg-surface text-green-950">{children}</body>
    </html>
  );
}
