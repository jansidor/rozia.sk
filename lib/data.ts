import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Agent, Article, Comparable, Listing, LocalityInfo, Photo, PriceStat, PropertyType, Sale, Transaction, TrustStats } from './types';
import { median } from './format';
import { site } from './site';
import * as demo from './demo';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Ukážkové dáta sa NIKDY nezapnú v produkčnom nasadení. */
export const demoMode =
  process.env.ROZIA_DEMO_DATA === '1' && process.env.VERCEL_ENV !== 'production';
export const hasDatabase = Boolean(url && anon);

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!url || !anon) return null;
  client ??= createClient(url, anon, { auth: { persistSession: false } });
  return client;
}

/** Servisný klient (len server): na údaje, ktoré verejný kľúč nesmie čítať (pohľad comparables, viď migrácia 0003). */
let adminClient: SupabaseClient | null = null;
function adminDb(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  adminClient ??= createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

async function rows(table: string, build: (q: any) => any): Promise<Row[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await build(c.from(table).select('*'));
  if (error) {
    console.error(`[data] ${table}: ${error.message}`);
    return [];
  }
  return (data as Row[]) ?? [];
}

const toAgent = (r: Row): Agent => ({
  id: r.id, slug: r.slug, name: r.name, photoUrl: r.photo_url ?? null, phone: r.phone, email: r.email ?? null,
  area: r.area, bio: r.bio ?? null, soldLast12m: r.sold_last_12m ?? null,
});
const toPhoto = (r: Row): Photo => ({ url: r.url, alt: r.alt ?? '', blurDataUrl: r.blur_data_url ?? null });
const toListing = (r: Row): Listing => ({
  id: r.id, slug: r.slug, title: r.title, transaction: r.transaction, type: r.property_type,
  citySlug: r.city_slug, partSlug: r.part_slug ?? null, localityLabel: r.locality_label,
  price: Number(r.price), previousPrice: r.previous_price ? Number(r.previous_price) : null,
  areaM2: Number(r.area_m2), rooms: r.rooms ?? null, floor: r.floor ?? null, condition: r.condition ?? null,
  energyClass: r.energy_class ?? null, description: r.description ?? '', features: r.features ?? [],
  photos: ((r.photos as Row[] | null) ?? []).sort((a, b) => a.position - b.position).map(toPhoto),
  status: r.status, publishedAt: r.published_at, updatedAt: r.updated_at,
  lat: r.lat ?? null, lng: r.lng ?? null, agent: r.agent ? toAgent(r.agent) : null,
});
const toSale = (r: Row): Sale => ({
  id: r.id, title: r.title, type: r.property_type, citySlug: r.city_slug, partSlug: r.part_slug ?? null,
  localityLabel: r.locality_label, areaM2: r.area_m2 ? Number(r.area_m2) : null, rooms: r.rooms ?? null,
  daysOnMarket: r.days_on_market, pctOfAskingPrice: Number(r.pct_of_asking_price), soldAt: r.sold_at,
  photo: r.photo_url ? { url: r.photo_url, alt: r.title, blurDataUrl: null } : null,
});
const toStat = (r: Row): PriceStat => ({
  citySlug: r.city_slug, partSlug: r.part_slug ?? null, rooms: r.rooms ?? null, condition: r.condition ?? null,
  medianPerM2: Number(r.median_per_m2), sampleSize: r.sample_size, period: r.period, updatedAt: r.updated_at,
});

/* ---------- Ponuka ---------- */

export interface ListingFilter {
  transaction?: Transaction;
  type?: PropertyType;
  citySlug?: string;
  partSlug?: string;
  agentId?: string;
  priceMax?: number;
  rooms?: number;
  areaMin?: number;
  sort?: 'najnovsie' | 'cena-asc' | 'cena-desc';
}

export async function getListings(f: ListingFilter = {}): Promise<Listing[]> {
  let list: Listing[];
  if (demoMode) {
    list = demo.demoListings;
  } else {
    const c = db();
    if (!c) return [];
    let q = c.from('listings').select('*, agent:agents(*), photos:listing_photos(*)').in('status', ['active', 'reserved']);
    if (f.transaction) q = q.eq('transaction', f.transaction);
    if (f.type) q = q.eq('property_type', f.type);
    if (f.citySlug) q = q.eq('city_slug', f.citySlug);
    const { data, error } = await q.limit(500);
    if (error) {
      console.error(`[data] listings: ${error.message}`);
      return [];
    }
    list = (data as Row[]).map(toListing);
  }
  list = list.filter(
    (l) =>
      l.status !== 'sold' &&
      (!f.transaction || l.transaction === f.transaction) &&
      (!f.type || l.type === f.type) &&
      (!f.citySlug || l.citySlug === f.citySlug) &&
      (!f.partSlug || l.partSlug === f.partSlug) &&
      (!f.agentId || l.agent?.id === f.agentId) &&
      (!f.priceMax || l.price <= f.priceMax) &&
      (!f.rooms || (f.rooms >= 4 ? (l.rooms ?? 0) >= 4 : l.rooms === f.rooms)) &&
      (!f.areaMin || l.areaM2 >= f.areaMin),
  );
  const sort = f.sort ?? 'najnovsie';
  return [...list].sort((a, b) =>
    sort === 'cena-asc' ? a.price - b.price : sort === 'cena-desc' ? b.price - a.price : b.publishedAt.localeCompare(a.publishedAt),
  );
}

export async function getListing(id: number): Promise<Listing | null> {
  if (demoMode) return demo.demoListings.find((l) => l.id === id) ?? null;
  const c = db();
  if (!c) return null;
  const { data } = await c.from('listings').select('*, agent:agents(*), photos:listing_photos(*)').eq('id', id).maybeSingle();
  return data ? toListing(data as Row) : null;
}

/* ---------- Predané (len so súhlasom klienta – vynucuje aj RLS) ---------- */

export async function getSales(f: { citySlug?: string; partSlug?: string } = {}): Promise<Sale[]> {
  const all = demoMode
    ? demo.demoSales
    : (await rows('sales', (q) => q.eq('client_consent', true).order('sold_at', { ascending: false }).limit(500))).map(toSale);
  return all.filter((s) => (!f.citySlug || s.citySlug === f.citySlug) && (!f.partSlug || s.partSlug === f.partSlug));
}

/** Pás dôkazov: vráti null, ak nie je dosť reálnych predajov → blok sa skryje. */
export async function getTrustStats(): Promise<TrustStats | null> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const recent = (await getSales()).filter((s) => s.soldAt >= since);
  if (recent.length < site.minSalesForStats) return null;
  return {
    soldLast12m: recent.length,
    medianDays: Math.round(median(recent.map((s) => s.daysOnMarket))!),
    avgPctOfAsking: recent.reduce((s, r) => s + r.pctOfAskingPrice, 0) / recent.length,
  };
}

/* ---------- Makléri ---------- */

export async function getAgents(): Promise<Agent[]> {
  if (demoMode) return demo.demoAgents;
  return (await rows('agents', (q) => q.eq('published', true).order('position'))).map(toAgent);
}
export async function getAgent(slug: string): Promise<Agent | null> {
  return (await getAgents()).find((a) => a.slug === slug) ?? null;
}

/* ---------- Cenová mapa a ocenenie ---------- */

/** Najnovšie obdobie cenovej mapy. */
export async function getPriceStats(): Promise<PriceStat[]> {
  const all = demoMode ? demo.demoPriceStats : (await rows('price_stats', (q) => q.order('period', { ascending: false }).limit(2000))).map(toStat);
  const latest = all.reduce((m, s) => (s.period > m ? s.period : m), '');
  return all.filter((s) => s.period === latest);
}

export async function getComparables(citySlug: string, partSlug: string | null): Promise<Comparable[]> {
  if (demoMode) return demo.demoComparables[partSlug ? `${citySlug}/${partSlug}` : citySlug] ?? [];
  // Pohľad comparables nie je verejný (obsahuje aj predaje bez súhlasu klienta); číta ho len server so servisným kľúčom.
  const c = adminDb();
  if (!c) {
    if (hasDatabase) console.error('[data] comparables: chýba SUPABASE_SERVICE_ROLE_KEY, odhad ceny nemá z čoho počítať');
    return [];
  }
  let q = c.from('comparables').select('*').eq('city_slug', citySlug).eq('property_type', 'byty');
  if (partSlug) q = q.eq('part_slug', partSlug);
  const { data, error } = await q.limit(300);
  if (error) {
    console.error(`[data] comparables: ${error.message}`);
    return [];
  }
  return ((data as Row[]) ?? []).map((r) => ({ pricePerM2: Number(r.price_per_m2), source: r.source }));
}

/* ---------- Obsah ---------- */

export async function getLocalityInfo(citySlug: string, partSlug: string | null): Promise<LocalityInfo | null> {
  if (demoMode) return demo.demoLocalityInfo.find((i) => i.citySlug === citySlug && i.partSlug === partSlug) ?? null;
  const c = db();
  if (!c) return null;
  let q = c.from('locality_info').select('*, agent:agents(*)').eq('city_slug', citySlug);
  q = partSlug ? q.eq('part_slug', partSlug) : q.is('part_slug', null);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const r = data as Row;
  return {
    citySlug, partSlug, schools: r.schools ?? null, transport: r.transport ?? null, parking: r.parking ?? null,
    housing: r.housing ?? null, agentComment: r.agent_comment ?? null, agent: r.agent ? toAgent(r.agent) : null,
    faq: r.faq ?? [], updatedAt: r.updated_at,
  };
}

export async function getArticles(): Promise<Article[]> {
  if (demoMode) return demo.demoArticles;
  return (await rows('articles', (q) => q.eq('published', true).order('published_at', { ascending: false }))).map((r) => ({
    slug: r.slug, title: r.title, excerpt: r.excerpt ?? '', body: r.body ?? '', author: r.author ?? null,
    publishedAt: r.published_at, updatedAt: r.updated_at,
  }));
}
export async function getArticle(slug: string): Promise<Article | null> {
  return (await getArticles()).find((a) => a.slug === slug) ?? null;
}
