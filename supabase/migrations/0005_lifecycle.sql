-- Rozia CRM – 0005: životný cyklus náboru, archív a anonymizácia, vrátený klient, pridelenie ocenení,
-- návrh dokumentov, číselník obcí a pobočiek. Nadväzuje na 0002 až 0004. Bezpečné spustiť opakovane.
-- Nič nemaže existujúce údaje. Nové funkcie sú predvolene interné (revoke) a prihláseným sa povoľujú výslovne.

-- ───────── 1. Nastavenia ─────────
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists "staff read settings" on app_settings;
create policy "staff read settings" on app_settings for select to authenticated using (app_role() is not null);
drop policy if exists "admin write settings" on app_settings;
create policy "admin write settings" on app_settings for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- assignment_mode: 'manual' (fáza 1: prideľujú admini) alebo 'round_robin' (fáza 2: striedavo v pobočke).
insert into app_settings (key, value) values
  ('assignment_mode', '"manual"'),
  ('archive_retention_months', '24'),
  ('return_match_threshold', '0.8')
on conflict (key) do nothing;

create or replace function setting_num(p_key text, p_default numeric) returns numeric
  language sql stable security definer set search_path = public as
$$ select coalesce((select (value #>> '{}')::numeric from app_settings where key = p_key), p_default) $$;
revoke all on function setting_num(text, numeric) from public, anon, authenticated;

-- ───────── 2. Pomocné čisté funkcie (interné) ─────────
create or replace function norm_text(t text) returns text language sql immutable as
$$ select regexp_replace(lower(translate(coalesce(t, ''),
     'ÁÄČĎÉĚÍĹĽŇÓÔÖŔŘŠŤÚŮÜÝŽáäčďéěíĺľňóôöŕřšťúůüýž', 'AACDEEILLNOOORRSTUUUYZaacdeeillnooorrstuuuyz')), '[^a-z0-9]+', '', 'g') $$;

create or replace function norm_phone(t text) returns text language sql immutable as
$$ select case when length(regexp_replace(coalesce(t, ''), '\D', '', 'g')) >= 9
               then right(regexp_replace(t, '\D', '', 'g'), 9) end $$;

create or replace function norm_property_type(t text) returns text language sql immutable as
$$ select case norm_text(t)
     when 'byt' then 'byty' when 'byty' then 'byty'
     when 'dom' then 'domy' when 'domy' then 'domy'
     when 'pozemok' then 'pozemky' when 'pozemky' then 'pozemky'
     when 'chata' then 'chaty' when 'chaty' then 'chaty'
     when 'apartman' then 'apartmany' when 'apartmany' then 'apartmany'
     when '' then null
     else norm_text(t) end $$;

revoke all on function norm_text(text), norm_phone(text), norm_property_type(text) from public, anon, authenticated;

-- ───────── 3. Číselník obcí a pobočiek ─────────
create table if not exists municipalities (
  id bigint generated always as identity primary key,
  name text not null,
  name_norm text generated always as (norm_text(name)) stored,
  district text not null,
  unique (name, district)
);
create index if not exists municipalities_name on municipalities (name_norm);

create table if not exists branch_districts (
  branch_id uuid not null references branches (id) on delete cascade,
  district text not null,
  primary key (branch_id, district)
);

alter table municipalities enable row level security;
alter table branch_districts enable row level security;
drop policy if exists "staff read municipalities" on municipalities;
create policy "staff read municipalities" on municipalities for select to authenticated using (app_role() is not null);
drop policy if exists "admin write municipalities" on municipalities;
create policy "admin write municipalities" on municipalities for all to authenticated using (app_is_admin()) with check (app_is_admin());
drop policy if exists "staff read branch districts" on branch_districts;
create policy "staff read branch districts" on branch_districts for select to authenticated using (app_role() is not null);
drop policy if exists "admin write branch districts" on branch_districts;
create policy "admin write branch districts" on branch_districts for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- Obce 7 okresov (zdroj: backend/data/obce-siedmich-okresov.csv v repe nacenime).
insert into municipalities (name, district) values
  ('Bešeňová', 'Ružomberok'),
  ('Hubová', 'Ružomberok'),
  ('Ivachnová', 'Ružomberok'),
  ('Kalameny', 'Ružomberok'),
  ('Komjatná', 'Ružomberok'),
  ('Likavka', 'Ružomberok'),
  ('Liptovská Lúžna', 'Ružomberok'),
  ('Liptovská Osada', 'Ružomberok'),
  ('Liptovská Teplá', 'Ružomberok'),
  ('Liptovská Štiavnica', 'Ružomberok'),
  ('Liptovské Revúce', 'Ružomberok'),
  ('Liptovské Sliače', 'Ružomberok'),
  ('Liptovský Michal', 'Ružomberok'),
  ('Lisková', 'Ružomberok'),
  ('Ludrová', 'Ružomberok'),
  ('Lúčky', 'Ružomberok'),
  ('Martinček', 'Ružomberok'),
  ('Potok', 'Ružomberok'),
  ('Ružomberok', 'Ružomberok'),
  ('Stankovany', 'Ružomberok'),
  ('Turík', 'Ružomberok'),
  ('Valaská Dubová', 'Ružomberok'),
  ('Ľubochňa', 'Ružomberok'),
  ('Štiavnička', 'Ružomberok'),
  ('Švošov', 'Ružomberok'),
  ('Beňadiková', 'Liptovský Mikuláš'),
  ('Bobrovec', 'Liptovský Mikuláš'),
  ('Bobrovník', 'Liptovský Mikuláš'),
  ('Bobrovček', 'Liptovský Mikuláš'),
  ('Bukovina', 'Liptovský Mikuláš'),
  ('Demänovská Dolina', 'Liptovský Mikuláš'),
  ('Dúbrava', 'Liptovský Mikuláš'),
  ('Galovany', 'Liptovský Mikuláš'),
  ('Gôtovany', 'Liptovský Mikuláš'),
  ('Huty', 'Liptovský Mikuláš'),
  ('Hybe', 'Liptovský Mikuláš'),
  ('Ižipovce', 'Liptovský Mikuláš'),
  ('Jakubovany', 'Liptovský Mikuláš'),
  ('Jalovec', 'Liptovský Mikuláš'),
  ('Jamník', 'Liptovský Mikuláš'),
  ('Konská', 'Liptovský Mikuláš'),
  ('Kráľova Lehota', 'Liptovský Mikuláš'),
  ('Kvačany', 'Liptovský Mikuláš'),
  ('Lazisko', 'Liptovský Mikuláš'),
  ('Liptovská Anna', 'Liptovský Mikuláš'),
  ('Liptovská Kokava', 'Liptovský Mikuláš'),
  ('Liptovská Porúbka', 'Liptovský Mikuláš'),
  ('Liptovská Sielnica', 'Liptovský Mikuláš'),
  ('Liptovské Beharovce', 'Liptovský Mikuláš'),
  ('Liptovské Kľačany', 'Liptovský Mikuláš'),
  ('Liptovské Matiašovce', 'Liptovský Mikuláš'),
  ('Liptovský Hrádok', 'Liptovský Mikuláš'),
  ('Liptovský Ján', 'Liptovský Mikuláš'),
  ('Liptovský Mikuláš', 'Liptovský Mikuláš'),
  ('Liptovský Ondrej', 'Liptovský Mikuláš'),
  ('Liptovský Peter', 'Liptovský Mikuláš'),
  ('Liptovský Trnovec', 'Liptovský Mikuláš'),
  ('Malatíny', 'Liptovský Mikuláš'),
  ('Malužiná', 'Liptovský Mikuláš'),
  ('Malé Borové', 'Liptovský Mikuláš'),
  ('Nižná Boca', 'Liptovský Mikuláš'),
  ('Partizánska Ľupča', 'Liptovský Mikuláš'),
  ('Pavlova Ves', 'Liptovský Mikuláš'),
  ('Pavčina Lehota', 'Liptovský Mikuláš'),
  ('Podtureň', 'Liptovský Mikuláš'),
  ('Pribylina', 'Liptovský Mikuláš'),
  ('Prosiek', 'Liptovský Mikuláš'),
  ('Smrečany', 'Liptovský Mikuláš'),
  ('Svätý Kríž', 'Liptovský Mikuláš'),
  ('Trstené', 'Liptovský Mikuláš'),
  ('Uhorská Ves', 'Liptovský Mikuláš'),
  ('Vavrišovo', 'Liptovský Mikuláš'),
  ('Važec', 'Liptovský Mikuláš'),
  ('Veterná Poruba', 'Liptovský Mikuláš'),
  ('Veľké Borové', 'Liptovský Mikuláš'),
  ('Vlachy', 'Liptovský Mikuláš'),
  ('Vyšná Boca', 'Liptovský Mikuláš'),
  ('Východná', 'Liptovský Mikuláš'),
  ('Závažná Poruba', 'Liptovský Mikuláš'),
  ('Ľubeľa', 'Liptovský Mikuláš'),
  ('Žiar', 'Liptovský Mikuláš'),
  ('Belá-Dulice', 'Martin'),
  ('Benice', 'Martin'),
  ('Blatnica', 'Martin'),
  ('Bystrička', 'Martin'),
  ('Diaková', 'Martin'),
  ('Dolný Kalník', 'Martin'),
  ('Dražkovce', 'Martin'),
  ('Folkušová', 'Martin'),
  ('Horný Kalník', 'Martin'),
  ('Karlová', 'Martin'),
  ('Kláštor pod Znievom', 'Martin'),
  ('Košťany nad Turcom', 'Martin'),
  ('Krpeľany', 'Martin'),
  ('Laskár', 'Martin'),
  ('Ležiachov', 'Martin'),
  ('Lipovec', 'Martin'),
  ('Martin', 'Martin'),
  ('Necpaly', 'Martin'),
  ('Nolčovo', 'Martin'),
  ('Podhradie', 'Martin'),
  ('Príbovce', 'Martin'),
  ('Rakovo', 'Martin'),
  ('Ratkovo', 'Martin'),
  ('Sklabinský Podzámok', 'Martin'),
  ('Sklabiňa', 'Martin'),
  ('Slovany', 'Martin'),
  ('Socovce', 'Martin'),
  ('Sučany', 'Martin'),
  ('Trebostovo', 'Martin'),
  ('Trnovo', 'Martin'),
  ('Turany', 'Martin'),
  ('Turčianska Štiavnička', 'Martin'),
  ('Turčianske Jaseno', 'Martin'),
  ('Turčianske Kľačany', 'Martin'),
  ('Turčiansky Peter', 'Martin'),
  ('Turčiansky Ďur', 'Martin'),
  ('Valča', 'Martin'),
  ('Vrícko', 'Martin'),
  ('Vrútky', 'Martin'),
  ('Záborie', 'Martin'),
  ('Ďanová', 'Martin'),
  ('Šútovo', 'Martin'),
  ('Žabokreky', 'Martin'),
  ('Abramová', 'Turčianske Teplice'),
  ('Blažovce', 'Turčianske Teplice'),
  ('Bodorová', 'Turčianske Teplice'),
  ('Borcová', 'Turčianske Teplice'),
  ('Brieštie', 'Turčianske Teplice'),
  ('Budiš', 'Turčianske Teplice'),
  ('Dubové', 'Turčianske Teplice'),
  ('Horná Štubňa', 'Turčianske Teplice'),
  ('Háj', 'Turčianske Teplice'),
  ('Ivančiná', 'Turčianske Teplice'),
  ('Jasenovo', 'Turčianske Teplice'),
  ('Jazernica', 'Turčianske Teplice'),
  ('Kaľamenová', 'Turčianske Teplice'),
  ('Liešno', 'Turčianske Teplice'),
  ('Malý Čepčín', 'Turčianske Teplice'),
  ('Moškovec', 'Turčianske Teplice'),
  ('Mošovce', 'Turčianske Teplice'),
  ('Ondrašová', 'Turčianske Teplice'),
  ('Rakša', 'Turčianske Teplice'),
  ('Rudno', 'Turčianske Teplice'),
  ('Sklené', 'Turčianske Teplice'),
  ('Slovenské Pravno', 'Turčianske Teplice'),
  ('Turček', 'Turčianske Teplice'),
  ('Turčianske Teplice', 'Turčianske Teplice'),
  ('Veľký Čepčín', 'Turčianske Teplice'),
  ('Čremošné', 'Turčianske Teplice'),
  ('Bziny', 'Dolný Kubín'),
  ('Chlebnice', 'Dolný Kubín'),
  ('Dlhá nad Oravou', 'Dolný Kubín'),
  ('Dolný Kubín', 'Dolný Kubín'),
  ('Horná Lehota', 'Dolný Kubín'),
  ('Istebné', 'Dolný Kubín'),
  ('Jasenová', 'Dolný Kubín'),
  ('Kraľovany', 'Dolný Kubín'),
  ('Krivá', 'Dolný Kubín'),
  ('Leštiny', 'Dolný Kubín'),
  ('Malatiná', 'Dolný Kubín'),
  ('Medzibrodie nad Oravou', 'Dolný Kubín'),
  ('Oravská Poruba', 'Dolný Kubín'),
  ('Oravský Podzámok', 'Dolný Kubín'),
  ('Osádka', 'Dolný Kubín'),
  ('Pokryváč', 'Dolný Kubín'),
  ('Pribiš', 'Dolný Kubín'),
  ('Pucov', 'Dolný Kubín'),
  ('Párnica', 'Dolný Kubín'),
  ('Sedliacka Dubová', 'Dolný Kubín'),
  ('Veličná', 'Dolný Kubín'),
  ('Vyšný Kubín', 'Dolný Kubín'),
  ('Zázrivá', 'Dolný Kubín'),
  ('Žaškov', 'Dolný Kubín'),
  ('Babín', 'Námestovo'),
  ('Beňadovo', 'Námestovo'),
  ('Bobrov', 'Námestovo'),
  ('Breza', 'Námestovo'),
  ('Hruštín', 'Námestovo'),
  ('Klin', 'Námestovo'),
  ('Krušetnica', 'Námestovo'),
  ('Lokca', 'Námestovo'),
  ('Lomná', 'Námestovo'),
  ('Mútne', 'Námestovo'),
  ('Novoť', 'Námestovo'),
  ('Námestovo', 'Námestovo'),
  ('Oravská Jasenica', 'Námestovo'),
  ('Oravská Lesná', 'Námestovo'),
  ('Oravská Polhora', 'Námestovo'),
  ('Oravské Veselé', 'Námestovo'),
  ('Rabča', 'Námestovo'),
  ('Rabčice', 'Námestovo'),
  ('Sihelné', 'Námestovo'),
  ('Vasiľov', 'Námestovo'),
  ('Vavrečka', 'Námestovo'),
  ('Zubrohlava', 'Námestovo'),
  ('Zákamenné', 'Námestovo'),
  ('Ťapešovo', 'Námestovo'),
  ('Brezovica', 'Tvrdošín'),
  ('Habovka', 'Tvrdošín'),
  ('Hladovka', 'Tvrdošín'),
  ('Liesek', 'Tvrdošín'),
  ('Nižná', 'Tvrdošín'),
  ('Oravský Biely Potok', 'Tvrdošín'),
  ('Podbiel', 'Tvrdošín'),
  ('Suchá Hora', 'Tvrdošín'),
  ('Trstená', 'Tvrdošín'),
  ('Tvrdošín', 'Tvrdošín'),
  ('Vitanová', 'Tvrdošín'),
  ('Zuberec', 'Tvrdošín'),
  ('Zábiedovo', 'Tvrdošín'),
  ('Čimhová', 'Tvrdošín'),
  ('Štefanov nad Oravou', 'Tvrdošín')
on conflict (name, district) do nothing;

-- Pobočka pre obec (a voliteľne okres). Nejednoznačné alebo neznáme = null (ocenenie ide do Nepridelených).
create or replace function branch_for_municipality(p_name text, p_district text default null) returns uuid
  language plpgsql stable security definer set search_path = public as
$$
declare ids uuid[];
begin
  select array_agg(distinct bd.branch_id) into ids
    from municipalities m join branch_districts bd on bd.district = m.district
    join branches b on b.id = bd.branch_id and b.active
   where m.name_norm = norm_text(p_name) and (p_district is null or m.district = p_district);
  if ids is not null and array_length(ids, 1) = 1 then return ids[1]; end if;
  return null;
end $$;
revoke all on function branch_for_municipality(text, text) from public, anon;
grant execute on function branch_for_municipality(text, text) to authenticated;

-- ───────── 4. Anonymizácia: stĺpce a fronta na mazanie súborov ─────────
alter table clients add column if not exists anonymized_at timestamptz;
alter table mandates add column if not exists anonymized_at timestamptz;

-- Súbory vo Storage, ktoré má server zmazať (databáza ich zmazať nevie). Číta a mení len service role.
create table if not exists storage_cleanup (
  id bigint generated always as identity primary key,
  path text not null,
  reason text not null,
  queued_at timestamptz not null default now(),
  done_at timestamptz
);
alter table storage_cleanup enable row level security;

-- ───────── 5. Nedohodnutý nábor do archívu a obnovenie ─────────
create or replace function close_mandate_unagreed(p_mandate uuid, p_reason text) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); m mandates;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into m from mandates where id = p_mandate for update;
  if not found then raise exception 'Nábor neexistuje'; end if;
  if app_role() = 'broker' and m.broker_id <> me then raise exception 'Uzavrieť môžete len svoj nábor'; end if;
  if m.status <> 'aktivny' then raise exception 'Nábor nie je aktívny'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Treba uviesť dôvod'; end if;
  -- rozpracované dokumenty sa zmažú (súbory zmaže server podľa storage_cleanup); skontrolované a hotové ostávajú
  insert into storage_cleanup (path, reason)
    select storage_path, 'mandate.unagreed' from client_documents where mandate_id = p_mandate and status = 'navrh';
  delete from client_documents where mandate_id = p_mandate and status = 'navrh';
  update mandates set status = 'nedohodnuty', archived_at = now(), archive_reason = p_reason, updated_at = now() where id = p_mandate;
  if m.valuation_id is not null then update valuations set status = 'archiv' where id = m.valuation_id; end if;
  perform audit('mandate.unagreed', 'mandates', p_mandate::text, jsonb_build_object('by', me));
end $$;

create or replace function restore_mandate(p_mandate uuid) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); m mandates;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into m from mandates where id = p_mandate for update;
  if not found then raise exception 'Nábor neexistuje'; end if;
  if app_role() = 'broker' and m.broker_id <> me then raise exception 'Obnoviť môžete len svoj nábor'; end if;
  if m.status <> 'nedohodnuty' then raise exception 'Obnoviť sa dá len nedohodnutý nábor'; end if;
  if m.anonymized_at is not null then raise exception 'Nábor je už anonymizovaný, údaje klienta sa obnoviť nedajú'; end if;
  update mandates set status = 'aktivny', archived_at = null, archive_reason = null, updated_at = now() where id = p_mandate;
  if m.valuation_id is not null then
    update valuations set status = 'pridelene', assigned_to = m.broker_id, assigned_at = coalesce(assigned_at, now()) where id = m.valuation_id;
  end if;
  perform audit('mandate.restored', 'mandates', p_mandate::text, jsonb_build_object('by', me));
end $$;

revoke all on function close_mandate_unagreed(uuid, text), restore_mandate(uuid) from public, anon;
grant execute on function close_mandate_unagreed(uuid, text), restore_mandate(uuid) to authenticated;

-- Anonymizácia archívu po uplynutí retencie (návrh 24 mesiacov, app_settings). Spúšťa len server (naplánovaná úloha, service role).
create or replace function anonymize_archived(p_months int default null) returns int
  language plpgsql security definer set search_path = public as
$$
declare months int := coalesce(p_months, setting_num('archive_retention_months', 24)::int); m mandates; n int := 0;
begin
  for m in select * from mandates
            where status = 'nedohodnuty' and anonymized_at is null and archived_at < now() - make_interval(months => months)
            for update loop
    insert into storage_cleanup (path, reason) select storage_path, 'mandate.anonymized' from client_documents where mandate_id = m.id;
    delete from client_documents where mandate_id = m.id;
    delete from mandate_notes where mandate_id = m.id;
    delete from financing_notes where mandate_id = m.id;
    update financing_status_history set reason = null where mandate_id = m.id;
    update mandates set title = 'Anonymizovaný nábor', address = null, parcel_no = null, lv_no = null,
           archive_reason = null, financing_reason = null, anonymized_at = now(), updated_at = now() where id = m.id;
    if m.valuation_id is not null then update valuations set payload = '{}' where id = m.valuation_id; end if;
    -- klient sa anonymizuje, len ak nemá iný nábor, ktorý nie je anonymizovaný
    if not exists (select 1 from mandates x where x.client_id = m.client_id and x.anonymized_at is null) then
      update clients set full_name = 'Anonymizovaný klient', phone = null, email = null, address = null, birth_date = null,
             anonymized_at = now(), updated_at = now() where id = m.client_id;
    end if;
    perform audit('mandate.anonymized', 'mandates', m.id::text, jsonb_build_object('months', months));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function anonymize_archived(int) from public, anon, authenticated;

-- ───────── 6. Vrátený klient ─────────
create or replace function mandate_props(m mandates) returns jsonb
  language sql stable security definer set search_path = public as
$$
  select jsonb_strip_nulls(jsonb_build_object(
    'city_slug', (select v.city_slug from valuations v where v.id = m.valuation_id),
    'property_type', norm_property_type(m.property_type),
    'area_m2', m.area_m2,
    'price', coalesce(m.asking_price, (select (v.estimate_low + v.estimate_high) / 2 from valuations v where v.id = m.valuation_id)),
    'address', nullif(m.address, '')))
$$;

create or replace function valuation_props(v valuations) returns jsonb
  language sql immutable as
$$
  select jsonb_strip_nulls(jsonb_build_object(
    'city_slug', v.city_slug,
    'property_type', norm_property_type(v.property_type),
    'area_m2', v.area_m2,
    'price', case when v.estimate_low is not null and v.estimate_high is not null then (v.estimate_low + v.estimate_high) / 2 end,
    'address', nullif(coalesce(v.payload ->> 'adresa', v.payload ->> 'address'), '')))
$$;

-- Podobnosť dvoch nehnuteľností: len polia, ktoré majú obe strany. Váhy: obec .25, typ .20, výmera .20 (±10 %), cena .15 (±15 %), adresa .20.
-- Vráti {"score": 0..1, "changes": {pole: {old, new}}}. Zmeny hlási pri akomkoľvek rozdiele, skóre počíta s toleranciou.
create or replace function property_similarity(a jsonb, b jsonb) returns jsonb
  language plpgsql immutable as
$$
declare k text; w numeric; total numeric := 0; hit numeric := 0; ok boolean; differs boolean; ch jsonb := '{}'; x numeric; y numeric;
begin
  foreach k in array array['city_slug', 'property_type', 'area_m2', 'price', 'address'] loop
    if a ->> k is null or b ->> k is null then continue; end if;
    w := case k when 'city_slug' then 0.25 when 'property_type' then 0.20 when 'area_m2' then 0.20 when 'price' then 0.15 else 0.20 end;
    if k in ('area_m2', 'price') then
      x := (a ->> k)::numeric; y := (b ->> k)::numeric;
      ok := abs(x - y) <= (case k when 'area_m2' then 0.10 else 0.15 end) * greatest(x, y);
      differs := x <> y;
    else
      ok := norm_text(a ->> k) = norm_text(b ->> k);
      differs := not ok;
    end if;
    total := total + w;
    if ok then hit := hit + w; end if;
    if differs then ch := ch || jsonb_build_object(k, jsonb_build_object('old', a -> k, 'new', b -> k)); end if;
  end loop;
  return jsonb_build_object('score', case when total = 0 then 0 else round(hit / total, 3) end, 'changes', ch);
end $$;
revoke all on function mandate_props(mandates), valuation_props(valuations), property_similarity(jsonb, jsonb) from public, anon, authenticated;

-- Kandidáti „klient sa vrátil“ pre dané ocenenie: ten istý telefón alebo e-mail ako klient ocenenia. Smie volať pridelený maklér alebo admin.
-- Vracia len súhrn (bez kontaktov a poznámok iných maklérov).
create or replace function returning_client_check(p_valuation uuid)
  returns table (client_id uuid, mandate_id uuid, mandate_status text, archived_at timestamptz, archive_reason text,
                 previous_owner text, score numeric, is_match boolean, changes jsonb)
  language plpgsql security definer set search_path = public as
$$
declare v valuations; c clients; threshold numeric := setting_num('return_match_threshold', 0.8);
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into v from valuations where id = p_valuation;
  if not found then raise exception 'Ocenenie neexistuje'; end if;
  if app_role() = 'broker' and v.assigned_to is distinct from auth.uid() then raise exception 'Ocenenie nie je pridelené vám'; end if;
  if v.client_id is null then return; end if;
  select * into c from clients where id = v.client_id;
  return query
    with cand as (
      select k.* from clients k
       where k.id <> c.id and k.anonymized_at is null
         and ((norm_phone(c.phone) is not null and norm_phone(k.phone) = norm_phone(c.phone))
              or (nullif(lower(btrim(c.email)), '') is not null and lower(btrim(k.email)) = lower(btrim(c.email))))),
    pairs as (
      select k.id as cid, lm.id as mid, lm.status as mstatus, lm.archived_at as march, lm.archive_reason as mreason, lm.created_at as mcreated,
             (select s.full_name from staff s where s.id = k.owner_id) as prev_owner,
             case when lm.id is null then null else property_similarity(mandate_props(lm), valuation_props(v)) end as sim
        from cand k left join mandates lm on lm.client_id = k.id),
    scored as (
      -- z náborov klienta sa vezme ten, ktorý sa novému ocenení najviac podobá (pri zhode ten novší)
      select distinct on (cid) * from pairs
       order by cid, (sim ->> 'score')::numeric desc nulls last, mcreated desc nulls last)
    select cid, mid, mstatus, march, mreason, prev_owner,
           (sim ->> 'score')::numeric, coalesce((sim ->> 'score')::numeric >= threshold, false), sim -> 'changes'
      from scored order by (sim ->> 'score')::numeric desc nulls last;
end $$;

-- Prepojí nové ocenenie s existujúcim klientom. Voliteľne obnoví jeho nedohodnutý nábor a doplní zmenené údaje z ocenenia.
-- Klient aj obnovený nábor prechádzajú na makléra, ktorému je ocenenie pridelené. Pôvodný záznam sa zapíše do auditu.
create or replace function link_returning_client(p_valuation uuid, p_client uuid, p_restore_mandate uuid default null)
  returns jsonb language plpgsql security definer set search_path = public as
$$
declare v valuations; c_old uuid; assignee staff; m mandates; changes jsonb := '{}'; ok boolean;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into v from valuations where id = p_valuation for update;
  if not found then raise exception 'Ocenenie neexistuje'; end if;
  if app_role() = 'broker' and v.assigned_to is distinct from auth.uid() then raise exception 'Ocenenie nie je pridelené vám'; end if;
  if v.assigned_to is null then raise exception 'Ocenenie nie je pridelené'; end if;
  select exists (select 1 from returning_client_check(p_valuation) r where r.client_id = p_client) into ok;
  if not ok then raise exception 'Klient nemá rovnaký telefón ani e-mail ako klient ocenenia'; end if;
  select * into assignee from staff where id = v.assigned_to;
  c_old := v.client_id;
  if p_restore_mandate is not null then
    select * into m from mandates where id = p_restore_mandate for update;
    if not found or m.client_id <> p_client then raise exception 'Nábor nepatrí tomuto klientovi'; end if;
    if m.status <> 'nedohodnuty' or m.anonymized_at is not null then raise exception 'Obnoviť sa dá len nedohodnutý nábor, ktorý nie je anonymizovaný'; end if;
    changes := property_similarity(mandate_props(m), valuation_props(v)) -> 'changes';
  end if;
  update valuations set client_id = p_client where id = p_valuation;
  update clients set owner_id = assignee.id, branch_id = assignee.branch_id, updated_at = now() where id = p_client;
  if p_restore_mandate is not null then
    update mandates set status = 'aktivny', archived_at = null, archive_reason = null, broker_id = assignee.id, branch_id = assignee.branch_id,
           valuation_id = p_valuation, property_type = coalesce(norm_property_type(v.property_type), property_type),
           area_m2 = coalesce(v.area_m2, area_m2), updated_at = now() where id = p_restore_mandate;
  end if;
  -- prázdny nový záznam klienta (vznikol z ocenenia) sa zruší, ak naň nič nie je viazané
  if c_old is not null and c_old <> p_client
     and not exists (select 1 from mandates where client_id = c_old)
     and not exists (select 1 from client_documents where client_id = c_old)
     and not exists (select 1 from valuations where client_id = c_old) then
    delete from clients where id = c_old;
  end if;
  perform audit('client.returning_linked', 'clients', p_client::text,
                jsonb_build_object('valuation', p_valuation, 'restored_mandate', p_restore_mandate, 'replaced_client', c_old, 'by', auth.uid()));
  return jsonb_build_object('client_id', p_client, 'restored_mandate', p_restore_mandate, 'changes', changes);
end $$;

revoke all on function returning_client_check(uuid), link_returning_client(uuid, uuid, uuid) from public, anon;
grant execute on function returning_client_check(uuid), link_returning_client(uuid, uuid, uuid) to authenticated;

-- ───────── 7. Pridelenie ocenení ─────────
-- Fáza 1: ručne admin (fronta „Na pridelenie“ = ocenenia so stavom nepridelene, admin ich vidí všetky).
create or replace function assign_valuation(p_valuation uuid, p_to uuid, p_note text default null) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); v valuations; t staff;
begin
  if coalesce(app_role(), '') <> 'admin' then raise exception 'Prideľovať môže len admin'; end if;
  select * into v from valuations where id = p_valuation for update;
  if not found then raise exception 'Ocenenie neexistuje'; end if;
  if v.status = 'archiv' then raise exception 'Archivované ocenenie sa nedá prideliť'; end if;
  t := handoff_target_ok(p_to);
  update valuations set status = 'pridelene', assigned_to = p_to, assigned_at = now(), unassigned_since = null,
         branch_id = coalesce(branch_id, t.branch_id) where id = p_valuation;
  if v.client_id is not null then
    update clients set owner_id = p_to, branch_id = t.branch_id, updated_at = now() where id = v.client_id;
  end if;
  insert into handoffs (valuation_id, from_staff, to_staff, note) values (p_valuation, me, p_to, coalesce(p_note, 'pridelené adminom'));
  perform audit('valuation.assign', 'valuations', p_valuation::text, jsonb_build_object('to', p_to, 'by', me));
end $$;
revoke all on function assign_valuation(uuid, uuid, text) from public, anon;
grant execute on function assign_valuation(uuid, uuid, text) to authenticated;

-- Fáza 2: automatické striedanie v pobočke. Beží len ak je app_settings.assignment_mode = 'round_robin'. Volá server (service role).
-- Poradie: maklér pobočky s najstarším posledným pridelením, dostupný (alebo s uplynutou neprítomnosťou). Bez nikoho: záložná pobočka.
-- Ak nikto nie je, ocenenie ostane v Nepridelených.
create or replace function pick_broker(p_branch uuid) returns uuid
  language sql stable security definer set search_path = public as
$$
  select s.id from staff s
   where s.active and s.role = 'broker' and s.branch_id = p_branch
     and (s.availability = 'available' or (s.availability = 'away' and s.away_until is not null and s.away_until < current_date))
   order by (select max(v2.assigned_at) from valuations v2 where v2.assigned_to = s.id) nulls first, s.id
   limit 1
$$;
revoke all on function pick_broker(uuid) from public, anon, authenticated;

create or replace function auto_assign_valuation(p_valuation uuid) returns uuid
  language plpgsql security definer set search_path = public as
$$
declare v valuations; target uuid; fb uuid; t staff;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  if coalesce((select value #>> '{}' from app_settings where key = 'assignment_mode'), 'manual') <> 'round_robin' then return null; end if;
  select * into v from valuations where id = p_valuation for update;
  if not found or v.status <> 'nepridelene' or v.branch_id is null then return null; end if;
  target := pick_broker(v.branch_id);
  if target is null then
    select fallback_branch_id into fb from branches where id = v.branch_id;
    if fb is not null then target := pick_broker(fb); end if;
  end if;
  if target is null then return null; end if;
  select * into t from staff where id = target;
  update valuations set status = 'pridelene', assigned_to = target, assigned_at = now(), unassigned_since = null where id = p_valuation;
  if v.client_id is not null then
    update clients set owner_id = target, branch_id = t.branch_id, updated_at = now() where id = v.client_id;
  end if;
  perform audit('valuation.auto_assign', 'valuations', p_valuation::text, jsonb_build_object('to', target));
  return target;
end $$;
revoke all on function auto_assign_valuation(uuid) from public, anon, authenticated;

-- ───────── 8. Návrh dokumentov k náboru ─────────
-- Pravidlo (document_rules.when_cond) podporuje kľúče property_type a transaction (hodnota alebo pole hodnôt).
-- Neznámy kľúč znamená „pravidlo nezodpovedá“, aby sa nenavrhol nesprávny dokument.
create or replace function rule_matches(p_cond jsonb, p_property_type text, p_transaction text) returns boolean
  language plpgsql immutable as
$$
declare k text; val jsonb; got text; elem jsonb; hit boolean;
begin
  for k, val in select * from jsonb_each(coalesce(p_cond, '{}')) loop
    if k = 'property_type' then got := norm_property_type(p_property_type);
    elsif k = 'transaction' then got := norm_text(p_transaction);
    else return false; end if;
    if jsonb_typeof(val) = 'array' then
      hit := false;
      for elem in select * from jsonb_array_elements(val) loop
        if (case k when 'property_type' then norm_property_type(elem #>> '{}') else norm_text(elem #>> '{}') end) = got then hit := true; end if;
      end loop;
      if not hit then return false; end if;
    else
      if (case k when 'property_type' then norm_property_type(val #>> '{}') else norm_text(val #>> '{}') end) is distinct from got then return false; end if;
    end if;
  end loop;
  return true;
end $$;
revoke all on function rule_matches(jsonb, text, text) from public, anon, authenticated;

create or replace function suggest_documents(p_mandate uuid)
  returns table (template_code text, requirement text, sort_pos int, title text, template_version int, template_missing boolean)
  language plpgsql stable security definer set search_path = public as
$$
declare m mandates;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into m from mandates where id = p_mandate;
  if not found then raise exception 'Nábor neexistuje'; end if;
  if app_role() = 'broker' and m.broker_id <> auth.uid() then raise exception 'Nábor nie je váš'; end if;
  return query
    select d.code, d.req, d.pos, t.title, t.version, (t.id is null)
      from (select distinct on (r.template_code) r.template_code as code, r.requirement as req, r.position as pos
              from document_rules r
             where r.active and rule_matches(r.when_cond, m.property_type, m.transaction)
             order by r.template_code, (r.requirement = 'povinna') desc, r.position) d
      left join lateral (select dt.id, dt.title, dt.version from document_templates dt where dt.code = d.code order by dt.version desc limit 1) t on true
     order by (d.req = 'povinna') desc, d.pos, d.code;
end $$;
revoke all on function suggest_documents(uuid) from public, anon;
grant execute on function suggest_documents(uuid) to authenticated;

-- Východiskové pravidlá (admin ich upraví; presné zoznamy sa potvrdia podľa dokumentácie v duplikáte NajBývania).
insert into document_rules (template_code, requirement, when_cond, position)
select v.code, v.req, v.cond::jsonb, v.pos
  from (values
    ('zmluva-o-sprostredkovani-predaja', 'povinna',    '{}',                                              0),
    ('prepis-vody',                      'odporucana', '{"property_type":"byty","transaction":"predaj"}', 10),
    ('prepis-elektriny',                 'odporucana', '{"property_type":"byty","transaction":"predaj"}', 11),
    ('prepis-plynu',                     'odporucana', '{"property_type":"byty","transaction":"predaj"}', 12)
  ) as v(code, req, cond, pos)
 where not exists (select 1 from document_rules r where r.template_code = v.code and r.when_cond = v.cond::jsonb);
