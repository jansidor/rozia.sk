'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useRef, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Button } from './ui/button';
import { eurPerM2 } from '@/lib/format';

export interface MapPoint {
  label: string;
  lat: number;
  lng: number;
  /** Ak chýba, bod sa zobrazí len ako značka lokality. */
  medianPerM2?: number;
  href?: string;
}

const STYLE = 'https://tiles.openfreemap.org/styles/positron';

/**
 * Mapa (MapLibre GL + OpenFreeMap) sa načíta až na klik: šetrí LCP/INP a bez
 * súhlasu návštevníka sa nekontaktuje server tretej strany. Rovnaké údaje sú
 * vždy dostupné aj v tabuľke vedľa mapy.
 */
export function PriceMap({ points, center, zoom, title = 'Mapa cien' }: { points: MapPoint[]; center: { lat: number; lng: number }; zoom: number; title?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  async function load() {
    setState('loading');
    try {
      const maplibre = await import('maplibre-gl');
      const map = new maplibre.Map({
        container: container.current!,
        style: STYLE,
        center: [center.lng, center.lat],
        zoom,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', () => setState((s) => (s === 'loading' ? 'error' : s)));
      map.once('load', () => setState('ready'));
      for (const p of points) {
        const el = document.createElement(p.href ? 'a' : 'div');
        if (p.href) (el as HTMLAnchorElement).href = p.href;
        el.className =
          'tabular flex min-h-11 flex-col items-center justify-center rounded-xl border-2 border-green-950 bg-white px-2.5 py-1 text-center text-green-950 shadow-lg';
        const name = document.createElement('span');
        name.className = 'text-[11px] font-medium leading-tight';
        name.textContent = p.label;
        el.append(name);
        if (p.medianPerM2) {
          const price = document.createElement('strong');
          price.className = 'text-sm leading-tight';
          price.textContent = eurPerM2(p.medianPerM2);
          el.append(price);
        }
        new maplibre.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      }
    } catch {
      setState('error');
    }
  }

  return (
    <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-subtle bg-surface sm:aspect-16/10">
      <div ref={container} className="absolute inset-0" role="region" aria-label={title} />
      {state !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
          <MapIcon aria-hidden className="size-10 text-green-500" strokeWidth={1.5} />
          {state === 'error' ? (
            <p role="alert" className="max-w-sm font-medium text-danger">Mapu sa nepodarilo načítať. Údaje nájdete v tabuľke.</p>
          ) : (
            <>
              <p className="max-w-sm text-sm text-muted">
                Mapa sa načíta až po kliknutí. Mapové podklady poskytuje OpenFreeMap (© OpenStreetMap).
              </p>
              <Button type="button" onClick={load} disabled={state === 'loading'}>
                {state === 'loading' ? 'Načítavam mapu…' : 'Zobraziť mapu'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
