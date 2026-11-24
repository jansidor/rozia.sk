-- Rozia CRM – 0004: oprava oprávnení po kontrole PR #1 a odovzdanie kolegovi.
-- Nadväzuje na 0002 a 0003. Bezpečné spustiť opakovane (create or replace, drop ... if exists).
-- Nič nemaže a nemení údaje; mení len práva, politiky a pridáva funkcie a stĺpce.

-- ───────── 1. Práva na funkcie: Supabase dáva novým funkciám priame EXECUTE pre anon a authenticated ─────────
-- `revoke ... from public` (0002) to neodoberie. audit() nemá kontrolu roly, takže ju mohol zavolať ktokoľvek s verejným
-- kľúčom cez /rest/v1/rpc/audit a zapisovať falošné záznamy do auditu. Odoberáme explicitne.
-- Pozor na budúce funkcie: Postgres dáva novej funkcii EXECUTE aj pre PUBLIC, čo sa v schéme nedá vypnúť predvolene.
-- Preto každá nová funkcia v schéme public musí mať `revoke all ... from public, anon, authenticated` a grant len tam,
-- kde treba. Dodržanie stráži test N9 v tests/rls_crm_2.sql (zoznam povolených funkcií).

alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Interné funkcie: nikto zvonka (volajú ich len funkcie s právami vlastníka).
revoke all on function audit(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function guard_financing_columns() from public, anon, authenticated;

-- Pomocné funkcie rolí vyhodnocujú politiky v mene prihláseného používateľa, preto ich potrebuje authenticated; anon nie.
revoke all on function app_role(), app_is_admin(), app_is_finance(), app_branch() from public, anon;
grant execute on function app_role(), app_is_admin(), app_is_finance(), app_branch() to authenticated;

-- Funkcie pre prihlásených (každá si ešte kontroluje rolu).
revoke all on function set_financing_status(uuid, text, text), finance_view_client(uuid), claim_unassigned(uuid) from public, anon;
grant execute on function set_financing_status(uuid, text, text), finance_view_client(uuid), claim_unassigned(uuid) to authenticated;

-- ───────── 2. Dostupnosť zamestnanca (dovolenka, PN, neaktívny) ─────────
alter table staff add column if not exists availability text not null default 'available'
  check (availability in ('available', 'away', 'inactive'));
alter table staff add column if not exists away_until date;

-- Maklér si sám nastaví „neprítomný“ / „dostupný“ (nič iné na svojom účte meniť nesmie).
create or replace function set_my_availability(p_availability text, p_away_until date default null)
  returns void language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_role(), '') not in ('broker', 'admin', 'finance') then raise exception 'Nedostatočné oprávnenie'; end if;
  if p_availability not in ('available', 'away') then raise exception 'Povolené stavy: available, away'; end if;
  update staff set availability = p_availability, away_until = case when p_availability = 'away' then p_away_until end
   where id = auth.uid();
end $$;
revoke all on function set_my_availability(text, date) from public, anon;
grant execute on function set_my_availability(text, date) to authenticated;

-- ───────── 3. Ocenenia: maklér smie meniť len stav a väzbu na klienta, nie odhad ani zdrojové údaje ─────────
-- Trigger rozlišuje volajúceho podľa current_user: pri priamom UPDATE je to authenticated, vo funkciách s právami
-- vlastníka (claim_unassigned, odovzdanie) vlastník. Admin a service role (webhook, import) nie sú obmedzení.
create or replace function guard_valuation_columns() returns trigger
  language plpgsql as
$$
begin
  if current_user in ('anon', 'authenticated') and not coalesce(app_is_admin(), false)
     and (to_jsonb(new) - 'status' - 'client_id') is distinct from (to_jsonb(old) - 'status' - 'client_id')
  then
    raise exception 'Maklér smie meniť len stav a klienta ocenenia';
  end if;
  return new;
end $$;
revoke all on function guard_valuation_columns() from public, anon, authenticated;
drop trigger if exists valuations_guard_columns on valuations;
create trigger valuations_guard_columns before update on valuations
  for each row execute function guard_valuation_columns();

drop policy if exists "valuations assigned update" on valuations;
create policy "valuations assigned update" on valuations for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid() and status in ('pridelene', 'archiv'));

-- ───────── 4. Nepridelené: pobočka, záložná pobočka a ocenenia bez pobočky pre všetkých maklérov ─────────
-- Rozhodnutie z plánu: ocenenie bez makléra/pobočky sa nestratí a smie si ho vziať ktorýkoľvek maklér.
-- Ocenenie s pobočkou vidí a berie maklér tej pobočky a pobočky, ktorá je jej záložná (Dolný Kubín, Martin → Ružomberok).
drop policy if exists "valuations read" on valuations;
create policy "valuations read" on valuations for select to authenticated using (
  app_is_admin()
  or assigned_to = auth.uid()
  or (status = 'nepridelene' and app_role() = 'broker' and (
        branch_id is null
        or branch_id = app_branch()
        or exists (select 1 from branches b where b.id = valuations.branch_id and b.fallback_branch_id = app_branch()))));

create or replace function claim_unassigned(p_valuation uuid) returns void
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); my_branch uuid;
begin
  if coalesce(app_role(), '') <> 'broker' then raise exception 'Len maklér si môže prevziať ocenenie'; end if;
  my_branch := app_branch();
  perform pg_advisory_xact_lock(hashtext('claim:' || me::text)); -- dve súbežné prevzatia toho istého makléra sa zoradia
  if exists (select 1 from valuation_claims where staff_id = me and claimed_at > now() - interval '24 hours') then
    raise exception 'Limit: 1 prevzatie z Nepridelených za 24 hodín';
  end if;
  update valuations v set status = 'pridelene', assigned_to = me, assigned_at = now(), unassigned_since = null
   where v.id = p_valuation and v.status = 'nepridelene'
     and (v.branch_id is null
          or v.branch_id = my_branch
          or exists (select 1 from branches b where b.id = v.branch_id and b.fallback_branch_id = my_branch));
  if not found then raise exception 'Ocenenie nie je voľné alebo patrí inej pobočke'; end if;
  insert into valuation_claims (valuation_id, staff_id) values (p_valuation, me);
  perform audit('valuation.claim', 'valuations', p_valuation::text);
end $$;

-- ───────── 5. Financie: kontakt len klienta, ktorý má nábor ─────────
create or replace function finance_view_client(p_client uuid)
  returns table (id uuid, full_name text, phone text, email text)
  language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_role(), '') not in ('finance', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  if app_role() = 'finance' and not exists (select 1 from mandates m where m.client_id = p_client) then
    raise exception 'Klient nemá nábor';
  end if;
  perform audit('client.read_by_finance', 'clients', p_client::text);
  return query select c.id, c.full_name, c.phone, c.email from clients c where c.id = p_client;
end $$;

-- ───────── 6. Odovzdanie kolegovi ─────────
-- Maklér odovzdá svoj nábor (vrátane klienta, jeho dokumentov a pôvodného ocenenia) inému dostupnému maklérovi,
-- aj z inej pobočky (malé pobočky). Admin môže odovzdať ľubovoľný. Poznámky a dokumenty ostávajú pri nábore.

create or replace function handoff_target_ok(p_to uuid) returns staff
  language plpgsql stable security definer set search_path = public as
$$
declare t staff;
begin
  select * into t from staff where id = p_to and active and role = 'broker' and availability = 'available';
  if not found then raise exception 'Cieľ musí byť aktívny a dostupný maklér'; end if;
  return t;
end $$;
revoke all on function handoff_target_ok(uuid) from public, anon, authenticated;

create or replace function handoff_mandate(p_mandate uuid, p_to uuid, p_note text default null)
  returns void language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); m mandates; t staff;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into m from mandates where id = p_mandate for update;
  if not found then raise exception 'Nábor neexistuje'; end if;
  if app_role() = 'broker' and m.broker_id <> me then raise exception 'Odovzdať môžete len svoj nábor'; end if;
  if p_to = m.broker_id then raise exception 'Nábor už patrí tomuto maklérovi'; end if;
  t := handoff_target_ok(p_to);
  update mandates set broker_id = p_to, branch_id = t.branch_id, updated_at = now() where id = p_mandate;
  update clients set owner_id = p_to, branch_id = t.branch_id, updated_at = now() where id = m.client_id;
  if m.valuation_id is not null then
    update valuations set assigned_to = p_to, assigned_at = now() where id = m.valuation_id;
  end if;
  insert into handoffs (mandate_id, valuation_id, from_staff, to_staff, note)
  values (p_mandate, m.valuation_id, m.broker_id, p_to, p_note);
  perform audit('mandate.handoff', 'mandates', p_mandate::text,
                jsonb_build_object('from', m.broker_id, 'to', p_to, 'by', me));
end $$;

create or replace function handoff_valuation(p_valuation uuid, p_to uuid, p_note text default null)
  returns void language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); v valuations; t staff;
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  select * into v from valuations where id = p_valuation for update;
  if not found then raise exception 'Ocenenie neexistuje'; end if;
  if v.status <> 'pridelene' or v.assigned_to is null then raise exception 'Odovzdať sa dá len pridelené ocenenie'; end if;
  if app_role() = 'broker' and v.assigned_to <> me then raise exception 'Odovzdať môžete len svoje ocenenie'; end if;
  if p_to = v.assigned_to then raise exception 'Ocenenie už patrí tomuto maklérovi'; end if;
  t := handoff_target_ok(p_to);
  update valuations set assigned_to = p_to, assigned_at = now(), branch_id = coalesce(t.branch_id, branch_id) where id = p_valuation;
  if v.client_id is not null then
    update clients set owner_id = p_to, branch_id = t.branch_id, updated_at = now() where id = v.client_id;
  end if;
  insert into handoffs (valuation_id, from_staff, to_staff, note) values (p_valuation, v.assigned_to, p_to, p_note);
  perform audit('valuation.handoff', 'valuations', p_valuation::text,
                jsonb_build_object('from', v.assigned_to, 'to', p_to, 'by', me));
end $$;

-- Zoznam kolegov na výber pri odovzdaní: len meno, pobočka a dostupnosť (žiadne e-maily). Maklér inak vidí v staff len seba.
create or replace function list_colleagues()
  returns table (id uuid, full_name text, branch_id uuid, branch_name text, availability text, away_until date)
  language plpgsql stable security definer set search_path = public as
$$
begin
  if coalesce(app_role(), '') not in ('broker', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  return query
    select s.id, s.full_name, s.branch_id, b.name, s.availability, s.away_until
      from staff s left join branches b on b.id = s.branch_id
     where s.active and s.role = 'broker' and s.id <> auth.uid()
     order by b.name nulls last, s.full_name;
end $$;

revoke all on function handoff_mandate(uuid, uuid, text), handoff_valuation(uuid, uuid, text), list_colleagues() from public, anon;
grant execute on function handoff_mandate(uuid, uuid, text), handoff_valuation(uuid, uuid, text), list_colleagues() to authenticated;
