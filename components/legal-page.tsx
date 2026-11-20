import type { ReactNode } from 'react';
import { Breadcrumbs } from './page-header';
import { Notice } from './ui/field';
import { legalReady, site } from '@/lib/site';

/** Právne dokumenty. Kým chýba identifikácia prevádzkovateľa, stránka je označená ako návrh a neindexuje sa. */
export function LegalPage({ title, path, updated, draft = !legalReady, children }: { title: string; path: string; updated: string; draft?: boolean; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl pt-3 pb-16">
      <Breadcrumbs items={[{ name: title, path }]} />
      <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
      <p className="tabular mt-3 text-muted">Účinné od {updated}</p>
      {draft && (
        <Notice tone="warning" title="Návrh dokumentu" className="mt-6">
          Dokument dopĺňame o identifikačné údaje prevádzkovateľa a prechádza právnou kontrolou. Dovtedy sa na nás obráťte na {site.email}.
        </Notice>
      )}
      <div className="prose-rozia mt-8">{children}</div>
    </article>
  );
}

export function Operator() {
  const { legal } = site;
  const parts = [legal.companyName ?? site.name, legal.seat, legal.ico && `IČO: ${legal.ico}`, legal.register].filter(Boolean);
  return <>{parts.join(', ')}</>;
}
