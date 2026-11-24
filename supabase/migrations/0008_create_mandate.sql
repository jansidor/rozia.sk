-- Rozia CRM – 0008: vytvorenie náboru z ocenenia (predvyplnené údaje z kalkulačky). Bezpečné spustiť opakovane.
-- Maklér, ktorému je ocenenie pridelené, jedným krokom založí nábor: klient, nehnuteľnosť (typ, adresa, výmera) a predstava ceny sa prevezmú z ocenenia.
-- K jednému oceneniu môže byť naraz len jeden aktívny alebo predaný nábor (poistka aj proti dvojitému kliknutiu).

create unique index if not exists mandates_one_active_per_valuation
  on mandates (valuation_id) where valuation_id is not null and status in ('aktivny', 'predany');

create or replace function create_mandate_from_valuation(p_valuation uuid) returns uuid
  language plpgsql security definer set search_path = public as
$$
declare me uuid := auth.uid(); v valuations; my_branch uuid; m_id uuid; adr text; obec text; ttl text; price numeric;
begin
  if coalesce(app_role(), '') <> 'broker' then raise exception 'Nábor môže vytvoriť len maklér'; end if;
  select * into v from valuations where id = p_valuation for update;
  if not found then raise exception 'Ocenenie neexistuje'; end if;
  if v.assigned_to is distinct from me then raise exception 'Ocenenie nie je pridelené vám'; end if;
  if v.status <> 'pridelene' then raise exception 'Nábor sa dá vytvoriť len z prideleného ocenenia'; end if;
  if v.client_id is null then raise exception 'Ocenenie nemá klienta'; end if;
  if exists (select 1 from mandates where valuation_id = v.id and status in ('aktivny', 'predany')) then
    raise exception 'Nábor k tomuto oceneniu už existuje';
  end if;

  my_branch := app_branch();
  adr := nullif(btrim(coalesce(v.payload ->> 'adresa', '')), '');
  obec := nullif(btrim(coalesce(v.payload ->> 'obec', '')), '');
  ttl := concat_ws(', ', coalesce(nullif(btrim(coalesce(v.property_type, '')), ''), 'Nehnuteľnosť'), coalesce(adr, obec));
  price := case when coalesce(v.payload ->> 'predstava_ceny', '') ~ '^\d{1,10}(\.\d{1,2})?$' then (v.payload ->> 'predstava_ceny')::numeric end;

  insert into mandates (client_id, valuation_id, broker_id, branch_id, title, transaction, property_type, address, area_m2, asking_price)
  values (v.client_id, v.id, me, my_branch, ttl, 'predaj', norm_property_type(v.property_type),
          nullif(concat_ws(', ', adr, obec), ''), v.area_m2, price)
  returning id into m_id;

  update clients set owner_id = me, branch_id = coalesce(my_branch, branch_id), updated_at = now() where id = v.client_id and owner_id is distinct from me;
  perform audit('mandate.created', 'mandates', m_id::text, jsonb_build_object('valuation', v.id, 'by', me));
  return m_id;
end $$;

revoke all on function create_mandate_from_valuation(uuid) from public, anon;
grant execute on function create_mandate_from_valuation(uuid) to authenticated;
