-- Rozia CRM – 0009: opravy z nezávislej kontroly (A0, 25. 11. 2026). Bezpečné spustiť opakovane (create or replace, drop ... if exists).
-- Nič nemaže ani nemení údaje; mení len funkcie, spúšťač a politiky.
--
-- 1. claim_unassigned: po „Vziať si“ maklér nevidel kontakt klienta (clients.owner_id ostalo prázdne, RLS ho skrylo). Teraz sa vlastník nastaví ako pri assign_valuation.
-- 2. link_returning_client: maklér si mohol „prepojením“ prevziať klienta s AKTÍVNYM alebo PREDANÝM nábor iného makléra
--    (pôvodný maklér stratil prístup ku klientovi a dokumentom, nový maklér ich získal). Teraz sa to odmietne.
-- 3. guard_valuation_columns: maklér už nemôže priamo (cez API) prepísať client_id svojho ocenenia na cudzieho klienta
--    (potom by ho create_mandate_from_valuation urobil jeho vlastníkom). Prepojenie robí len link_returning_client (funkcia s právami vlastníka).
-- 4. mandates: maklér mohol priamo meniť stav, anonymized_at, client_id, source a pod. a vkladať/mazať nábory mimo funkcií a auditu.
--    Teraz smie priamo meniť len údaje, ktoré upravuje obrazovka náboru; vytvorenie a zmenu životného cyklu robia funkcie, vkladať a mazať smie len admin.

-- ───────── 1. Prevzatie z Nepridelených nastaví vlastníka klienta ─────────
create or replace function claim_unassigned(p_valuation uuid) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); my_branch uuid; v valuations;
begin
  if coalesce(app_role(), '') <> 'broker' then raise exception 'Len maklér si môže prevziať ocenenie'; end if;
  my_branch := app_branch();
  perform pg_advisory_xact_lock(hashtext('claim:' || me::text)); -- dve súbežné prevzatia toho istého makléra sa zoradia
  if exists (select 1 from valuation_claims where staff_id = me and claimed_at > now() - interval '24 hours') then
    raise exception 'Limit: 1 prevzatie z Nepridelených za 24 hodín';
  end if;
  update valuations x set status = 'pridelene', assigned_to = me, assigned_at = now(), unassigned_since = null
   where x.id = p_valuation and x.status = 'nepridelene'
     and (x.branch_id is null
          or x.branch_id = my_branch
          or exists (select 1 from branches b where b.id = x.branch_id and b.fallback_branch_id = my_branch))
  returning * into v;
  if not found then raise exception 'Ocenenie nie je voľné alebo patrí inej pobočke'; end if;
  -- klient z nacenime nemá vlastníka; bez toho by maklér po prevzatí nevidel jeho kontakt
  if v.client_id is not null then
    update clients set owner_id = me, branch_id = coalesce(my_branch, branch_id), updated_at = now()
     where id = v.client_id and owner_id is null;
  end if;
  insert into valuation_claims (valuation_id, staff_id) values (p_valuation, me);
  perform audit('valuation.claim', 'valuations', p_valuation::text);
end $$;

-- ───────── 2. Vrátený klient: nie klient s aktívnym alebo predaným nábor iného makléra ─────────
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
  -- klient s rozbehnutým alebo uzavretým obchodom iného makléra sa nepreberá (dohoda s jeho maklérom alebo adminom)
  if exists (select 1 from mandates x where x.client_id = p_client and x.status in ('aktivny', 'predany') and x.broker_id is distinct from assignee.id) then
    raise exception 'Klient má aktívny alebo predaný nábor iného makléra';
  end if;
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

-- ───────── 3. Ocenenie: maklér priamo mení len stav ─────────
create or replace function guard_valuation_columns() returns trigger
  language plpgsql as
$$
begin
  if current_user in ('anon', 'authenticated') and not coalesce(app_is_admin(), false)
     and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status')
  then
    raise exception 'Maklér smie meniť len stav ocenenia';
  end if;
  return new;
end $$;
revoke all on function guard_valuation_columns() from public, anon, authenticated;

-- ───────── 4. Nábory: priama zmena len údajov náboru, vkladanie a mazanie len admin ─────────
create or replace function guard_mandate_columns() returns trigger
  language plpgsql as
$$
declare editable constant text[] := array['title', 'address', 'parcel_no', 'lv_no', 'area_m2', 'asking_price', 'commission_pct', 'updated_at'];
begin
  if current_user in ('anon', 'authenticated') and not coalesce(app_is_admin(), false)
     and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable)
  then
    raise exception 'Maklér smie priamo meniť len údaje náboru';
  end if;
  return new;
end $$;
revoke all on function guard_mandate_columns() from public, anon, authenticated;
drop trigger if exists mandates_guard_columns on mandates;
create trigger mandates_guard_columns before update on mandates
  for each row execute function guard_mandate_columns();

drop policy if exists "mandates broker" on mandates;
drop policy if exists "mandates broker read" on mandates;
drop policy if exists "mandates broker update" on mandates;
drop policy if exists "mandates admin insert" on mandates;
drop policy if exists "mandates admin delete" on mandates;
create policy "mandates broker read" on mandates for select to authenticated
  using (broker_id = auth.uid() or app_is_admin());
create policy "mandates broker update" on mandates for update to authenticated
  using (broker_id = auth.uid() or app_is_admin())
  with check (broker_id = auth.uid() or app_is_admin());
create policy "mandates admin insert" on mandates for insert to authenticated with check (app_is_admin());
create policy "mandates admin delete" on mandates for delete to authenticated using (app_is_admin());
