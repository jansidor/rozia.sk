-- Rozia CRM – jadro (návrh, staging). Supabase, región eu-central-1 Frankfurt.
-- Nadväzuje na 0001_public_web.sql (agents, listings, leads).
-- Zásady: oprávnenia vynucuje databáza (RLS), nič sa nevymýšľa, každá citlivá zmena ide do auditu.
-- Import z duplikátu NajBývania je jednosmerný a len na čítanie: riadky nesú source + source_id,
-- opakovaný import je idempotentný (unique source, source_id) a nič neprepíše ručne upravené polia.
-- Predpoklady na potvrdenie: viď komentáre "POTVRDIŤ".

-- ───────────────────────── pobočky a zamestnanci ─────────────────────────

create table branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  name text not null unique,                 -- Ružomberok, Liptovský Mikuláš, Dolný Kubín, Martin
  city text not null,
  is_fallback boolean not null default false, -- záložná pobočka (DK, Martin → Ružomberok)
  fallback_branch_id uuid references branches (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  agent_id uuid references agents (id) on delete set null,
  branch_id uuid references branches (id),
  role text not null check (role in ('broker', 'admin', 'finance')),
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_role on staff (role) where active;

-- Pomocné funkcie rolí. SECURITY DEFINER, aby RLS politiky nezacyklili čítanie tabuľky staff.
create function app_role() returns text
  language sql stable security definer set search_path = public as
$$ select role from staff where id = auth.uid() and active $$;

create function app_is_admin() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce(app_role() = 'admin', false) $$;

create function app_is_finance() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce(app_role() = 'finance', false) $$;

-- ───────────────────────── audit ─────────────────────────

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                                -- auth.uid(), null = systém (webhook, import)
  action text not null,                      -- napr. 'client.read_by_finance', 'document.download'
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'
);
create index audit_entity on audit_log (entity, entity_id);

create function audit(p_action text, p_entity text, p_id text, p_detail jsonb default '{}')
  returns void language sql security definer set search_path = public as
$$ insert into audit_log (actor, action, entity, entity_id, detail)
   values (auth.uid(), p_action, p_entity, p_id, coalesce(p_detail, '{}')) $$;

-- ───────────────────────── klienti ─────────────────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references staff (id),       -- maklér, ktorému klient patrí
  branch_id uuid references branches (id),
  full_name text not null,
  phone text,
  email text,
  address text,
  birth_date date,                           -- len ak ho klient poskytol; do dokumentov sa nikdy nedopĺňa samo
  source text not null default 'rozia',      -- 'rozia' | 'nacenime' | 'najbyvanie-import' | 'manual'
  source_id text,
  gdpr_purpose_financing boolean not null default false, -- účel „sprostredkovanie financovania“ (I-088a)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index clients_owner on clients (owner_id);

-- ───────────────────────── prijaté udalosti (webhook nacenime → rozia) ─────────────────────────

create table inbound_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                      -- 'nacenime'
  event_id text not null,                    -- jedna udalosť = jeden záznam
  signature_ok boolean not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'error')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (source, event_id)
);
create index inbound_events_err on inbound_events (status) where status <> 'processed';

-- ───────────────────────── ocenenia a ich prideľovanie ─────────────────────────

create table valuations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  branch_id uuid references branches (id),
  assigned_to uuid references staff (id),
  status text not null default 'nepridelene'
    check (status in ('nepridelene', 'pridelene', 'archiv')),
  source text not null default 'nacenime',
  source_id text,
  inbound_event_id uuid references inbound_events (id),
  property_type text,
  city_slug text,
  area_m2 numeric(8, 2),
  estimate_low numeric(12, 2),
  estimate_high numeric(12, 2),
  payload jsonb not null default '{}',
  unassigned_since timestamptz default now(),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);
create index valuations_status on valuations (status, branch_id);

-- Záznamy o prevzatí z „Nepridelené“. Slúžia na limit 1× za 24 h na makléra.
-- POTVRDIŤ: limit chápem ako „maklér si smie z Nepridelených zobrať najviac 1 ocenenie za 24 h“.
create table valuation_claims (
  id bigint generated always as identity primary key,
  valuation_id uuid not null references valuations (id),
  staff_id uuid not null references staff (id),
  claimed_at timestamptz not null default now()
);
create index valuation_claims_staff on valuation_claims (staff_id, claimed_at desc);

create function claim_unassigned(p_valuation uuid) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid();
begin
  if app_role() <> 'broker' then raise exception 'Len maklér si môže prevziať ocenenie'; end if;
  if exists (select 1 from valuation_claims where staff_id = me and claimed_at > now() - interval '24 hours') then
    raise exception 'Limit: 1 prevzatie z Nepridelených za 24 hodín';
  end if;
  update valuations set status = 'pridelene', assigned_to = me, assigned_at = now(), unassigned_since = null
   where id = p_valuation and status = 'nepridelene';
  if not found then raise exception 'Ocenenie už nie je voľné'; end if;
  insert into valuation_claims (valuation_id, staff_id) values (p_valuation, me);
  perform audit('valuation.claim', 'valuations', p_valuation::text);
end $$;

-- ───────────────────────── nábory ─────────────────────────

create table mandates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id),
  valuation_id uuid references valuations (id),
  broker_id uuid not null references staff (id),
  branch_id uuid references branches (id),
  title text not null,
  transaction text not null default 'predaj' check (transaction in ('predaj', 'prenajom')),
  property_type text,
  address text,
  parcel_no text,
  lv_no text,
  area_m2 numeric(8, 2),
  asking_price numeric(12, 2),
  commission_pct numeric(5, 2),
  status text not null default 'aktivny' check (status in ('aktivny', 'predany', 'nedohodnuty', 'archiv')),
  archived_at timestamptz,
  archive_reason text,                       -- archív nedohodnutých
  financing_status text not null default 'nove'
    check (financing_status in ('nove', 'priprava', 'riesi_sa', 'vyriesene', 'neriesi_sa')),
  financing_reason text,                     -- povinné pri 'neriesi_sa'
  source text not null default 'rozia',      -- 'najbyvanie-import' pri importe z Excelu (I-087)
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id),
  check (financing_status <> 'neriesi_sa' or financing_reason is not null)
);
create index mandates_broker on mandates (broker_id, status);
create index mandates_financing on mandates (financing_status, branch_id);

-- Poznámky makléra a poznámky financovania sú oddelené tabuľky (I-088a).
create table mandate_notes (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references mandates (id) on delete cascade,
  author uuid not null references staff (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table financing_notes (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references mandates (id) on delete cascade,
  author uuid not null references staff (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table financing_status_history (
  id bigint generated always as identity primary key,
  mandate_id uuid not null references mandates (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text,
  changed_by uuid references staff (id),
  changed_at timestamptz not null default now()
);

-- Odovzdanie náboru/ocenenia kolegovi.
create table handoffs (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid references mandates (id),
  valuation_id uuid references valuations (id),
  from_staff uuid not null references staff (id),
  to_staff uuid not null references staff (id),
  note text,
  created_at timestamptz not null default now(),
  check (mandate_id is not null or valuation_id is not null)
);

-- Financie smú meniť len stav financovania (a dôvod). Všetko ostatné na nábore je zakázané
-- cez RLS (financie nemajú UPDATE politiku) a stav sa mení výhradne touto funkciou.
create function set_financing_status(p_mandate uuid, p_status text, p_reason text default null)
  returns void language plpgsql security definer set search_path = public as
$$
declare old_status text;
begin
  if app_role() not in ('finance', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select financing_status into old_status from mandates where id = p_mandate for update;
  if not found then raise exception 'Nábor neexistuje'; end if;
  if p_status = 'neriesi_sa' and coalesce(p_reason, '') = '' then
    raise exception 'Pri stave „Nerieši sa“ treba uviesť dôvod';
  end if;
  perform set_config('rozia.financing_ok', '1', true);  -- len v tejto transakcii
  update mandates
     set financing_status = p_status, financing_reason = p_reason, updated_at = now()
   where id = p_mandate;
  insert into financing_status_history (mandate_id, from_status, to_status, reason, changed_by)
  values (p_mandate, old_status, p_status, p_reason, auth.uid());
end $$;

-- Nikto okrem set_financing_status() (a service role) nesmie meniť financing_* priamo.
create function guard_financing_columns() returns trigger
  language plpgsql as
$$
begin
  if (new.financing_status is distinct from old.financing_status
      or new.financing_reason is distinct from old.financing_reason)
     and coalesce(current_setting('rozia.financing_ok', true), '') <> '1'
     and coalesce(auth.role(), 'service_role') <> 'service_role'
  then
    raise exception 'Stav financovania sa mení len cez set_financing_status()';
  end if;
  return new;
end $$;
create trigger mandates_guard_financing before update on mandates
  for each row execute function guard_financing_columns();

-- Prístup Financií k osobným údajom klienta sa zapisuje do auditu (GDPR, I-088a).
create function finance_view_client(p_client uuid)
  returns table (id uuid, full_name text, phone text, email text)
  language plpgsql security definer set search_path = public as
$$
begin
  if app_role() not in ('finance', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  perform audit('client.read_by_finance', 'clients', p_client::text);
  return query select c.id, c.full_name, c.phone, c.email from clients c where c.id = p_client;
end $$;

-- ───────────────────────── dokumenty ─────────────────────────

-- Knižnica šablón: zdroj = duplikát NajBývania, len na čítanie. Zmena v duplikáte = nová verzia.
create table document_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null,                        -- stabilný kód, napr. 'zmluva-o-sprostredkovani-predaja'
  version int not null,
  title text not null,
  category text,
  format text not null check (format in ('docx', 'pdf')),
  source text not null default 'najbyvanie-duplikat',
  source_path text,
  storage_path text not null,                -- privátny Storage bucket
  checksum_sha256 text not null,
  fillable boolean not null default false,   -- má vyznačené polia na vyplnenie / existuje odvodená verzia
  created_at timestamptz not null default now(),
  unique (code, version)
);

-- Pravidlá návrhu dokumentov (I-089e); spravuje admin bez programovania.
create table document_rules (
  id uuid primary key default gen_random_uuid(),
  template_code text not null,
  requirement text not null check (requirement in ('povinna', 'odporucana')),
  when_cond jsonb not null default '{}',     -- napr. {"property_type":"byty","transaction":"predaj"}
  position int not null default 0,
  active boolean not null default true
);

-- Vyplnené dokumenty klienta: nový súbor, šablóna sa nemení. Verzie ostávajú všetky.
create table client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id),
  mandate_id uuid references mandates (id),
  template_code text not null,
  template_version int not null,             -- verzia šablóny, z ktorej vznikol
  doc_group uuid not null default gen_random_uuid(), -- jeden dokument = viac verzií
  version int not null default 1,
  status text not null default 'navrh' check (status in ('navrh', 'skontrolovany')),
  storage_path text not null,
  missing_fields text[] not null default '{}', -- čo treba doplniť; chýbajúce sa nevymýšľa
  created_by uuid references staff (id),
  created_at timestamptz not null default now(),
  unique (doc_group, version)
);

-- ───────────────────────── RLS ─────────────────────────

alter table branches enable row level security;
alter table staff enable row level security;
alter table audit_log enable row level security;
alter table clients enable row level security;
alter table inbound_events enable row level security;
alter table valuations enable row level security;
alter table valuation_claims enable row level security;
alter table mandates enable row level security;
alter table mandate_notes enable row level security;
alter table financing_notes enable row level security;
alter table financing_status_history enable row level security;
alter table handoffs enable row level security;
alter table document_templates enable row level security;
alter table document_rules enable row level security;
alter table client_documents enable row level security;

-- branches / staff
create policy "staff read branches" on branches for select to authenticated using (app_role() is not null);
create policy "admin write branches" on branches for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy "read own or admin staff" on staff for select to authenticated
  using (id = auth.uid() or app_is_admin());
create policy "admin write staff" on staff for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- audit: čítať smie len admin, zapisuje sa výhradne funkciou audit()
create policy "admin read audit" on audit_log for select to authenticated using (app_is_admin());

-- clients: maklér vlastných, admin všetkých; Financie len cez finance_view_client() (s auditom)
create policy "broker own clients" on clients for all to authenticated
  using (owner_id = auth.uid() or app_is_admin())
  with check (owner_id = auth.uid() or app_is_admin());

-- inbound_events: len service role (webhook) a admin číta
create policy "admin read inbound" on inbound_events for select to authenticated using (app_is_admin());

-- valuations: maklér pridelené sebe + nepridelené vo svojej pobočke; admin všetko
create policy "valuations read" on valuations for select to authenticated using (
  app_is_admin()
  or assigned_to = auth.uid()
  or (status = 'nepridelene' and branch_id = (select branch_id from staff where id = auth.uid())));
create policy "valuations admin write" on valuations for all to authenticated
  using (app_is_admin()) with check (app_is_admin());
create policy "valuations assigned update" on valuations for update to authenticated
  using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());
create policy "claims read own" on valuation_claims for select to authenticated
  using (staff_id = auth.uid() or app_is_admin());

-- mandates: maklér len svoje, admin všetko, Financie čítajú všetky začaté nábory (bez úprav)
create policy "mandates broker" on mandates for all to authenticated
  using (broker_id = auth.uid() or app_is_admin())
  with check (broker_id = auth.uid() or app_is_admin());
create policy "mandates finance read" on mandates for select to authenticated using (app_is_finance());

-- poznámky makléra: maklér a admin; Financie ich nevidia
create policy "mandate notes broker" on mandate_notes for all to authenticated
  using (exists (select 1 from mandates m where m.id = mandate_id and (m.broker_id = auth.uid() or app_is_admin())))
  with check (author = auth.uid() and exists (select 1 from mandates m where m.id = mandate_id and (m.broker_id = auth.uid() or app_is_admin())));

-- poznámky financovania: Financie píšu, maklér svojho náboru číta, admin všetko
create policy "financing notes read" on financing_notes for select to authenticated
  using (app_is_finance() or app_is_admin()
         or exists (select 1 from mandates m where m.id = mandate_id and m.broker_id = auth.uid()));
create policy "financing notes write" on financing_notes for insert to authenticated
  with check (author = auth.uid() and (app_is_finance() or app_is_admin()));

create policy "financing history read" on financing_status_history for select to authenticated
  using (app_is_finance() or app_is_admin()
         or exists (select 1 from mandates m where m.id = mandate_id and m.broker_id = auth.uid()));

create policy "handoffs read" on handoffs for select to authenticated
  using (from_staff = auth.uid() or to_staff = auth.uid() or app_is_admin());
create policy "handoffs create" on handoffs for insert to authenticated
  with check (from_staff = auth.uid());

-- šablóny: všetci zamestnanci len čítajú; zapisuje výhradne service role (synchronizácia z duplikátu)
create policy "templates read" on document_templates for select to authenticated using (app_role() is not null);
create policy "rules read" on document_rules for select to authenticated using (app_role() is not null);
create policy "rules admin write" on document_rules for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- vyplnené dokumenty: len maklér klienta a admin; Financie nie
create policy "client documents" on client_documents for all to authenticated
  using (app_is_admin() or exists (select 1 from clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (app_is_admin() or exists (select 1 from clients c where c.id = client_id and c.owner_id = auth.uid()));

-- Financie: žiadny priamy zápis do mandates (nemajú UPDATE politiku); stav mení set_financing_status().
revoke all on function set_financing_status(uuid, text, text) from public;
grant execute on function set_financing_status(uuid, text, text) to authenticated;
revoke all on function finance_view_client(uuid) from public;
grant execute on function finance_view_client(uuid) to authenticated;
revoke all on function claim_unassigned(uuid) from public;
grant execute on function claim_unassigned(uuid) to authenticated;
revoke all on function audit(text, text, text, jsonb) from public;
