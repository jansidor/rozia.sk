-- Rozia CRM – spevnenie po 0002 (nálezy z testov oprávnení a zo Supabase Security Advisora).
-- Bezpečné spustiť aj nad databázou, kde 0002 už beží (create or replace, drop policy if exists).

-- ───────── 1. Pohľad comparables už nie je verejný (Advisor: „Security Definer View“, kritické) ─────────
-- Odhad ceny sa počíta na serveri (server action), ktorý ho číta servisným kľúčom. Verejný (anon) kľúč k nemu prístup
-- nemá, takže €/m² predajov bez súhlasu klienta sa nedajú vytiahnuť priamo cez API.
alter view comparables set (security_invoker = on);
revoke all on comparables from anon, authenticated;
grant select on comparables to service_role;

-- ───────── 2. Kontroly rolí bezpečné voči NULL ─────────
-- V 0002 `app_role() not in (...)` vracalo pri prihlásenom používateľovi bez záznamu v staff NULL (nie true),
-- takže podmienka sa nespustila a funkcia prebehla. coalesce to uzatvára.

create or replace function app_branch() returns uuid
  language sql stable security definer set search_path = public as
$$ select branch_id from staff where id = auth.uid() and active $$;

create or replace function set_financing_status(p_mandate uuid, p_status text, p_reason text default null)
  returns void language plpgsql security definer set search_path = public as
$$
declare old_status text;
begin
  if coalesce(app_role(), '') not in ('finance', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
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

create or replace function finance_view_client(p_client uuid)
  returns table (id uuid, full_name text, phone text, email text)
  language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_role(), '') not in ('finance', 'admin') then raise exception 'Nedostatočné oprávnenie'; end if;
  perform audit('client.read_by_finance', 'clients', p_client::text);
  return query select c.id, c.full_name, c.phone, c.email from clients c where c.id = p_client;
end $$;

-- ───────── 3. Nepridelené: pobočka a záložná pobočka, prevzatie len raz za 24 h ─────────
-- Maklér vidí a smie prevziať nepridelené ocenenia svojej pobočky a pobočiek, ktoré majú ako zálohu jeho pobočku
-- (Dolný Kubín a Martin → Ružomberok). Ocenenie bez pobočky riešia len admini.

drop policy if exists "valuations read" on valuations;
create policy "valuations read" on valuations for select to authenticated using (
  app_is_admin()
  or assigned_to = auth.uid()
  or (status = 'nepridelene' and branch_id is not null and (
        branch_id = app_branch()
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
   where v.id = p_valuation and v.status = 'nepridelene' and v.branch_id is not null
     and (v.branch_id = my_branch
          or exists (select 1 from branches b where b.id = v.branch_id and b.fallback_branch_id = my_branch));
  if not found then raise exception 'Ocenenie nie je voľné alebo patrí inej pobočke'; end if;
  insert into valuation_claims (valuation_id, staff_id) values (p_valuation, me);
  perform audit('valuation.claim', 'valuations', p_valuation::text);
end $$;
