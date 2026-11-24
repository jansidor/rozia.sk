-- Rozia CRM – 0006: príjem leadov z nacenime.sk (webhook) do CRM.
-- Nadväzuje na 0002 (tabuľka inbound_events) a 0005 (číselník obcí, automatické pridelenie).
-- Všetky funkcie sú interné: volá ich len server so servisným kľúčom (route /api/inbound/nacenime/). Bezpečné spustiť opakovane.
--
-- Tok: route overí podpis a zavolá ingest_nacenime_event(). Funkcia uloží SUROVÚ udalosť (jedinečné (source, event_id), takže opakované
-- doručenie nič nezdvojí) a spracuje ju: vytvorí klienta a ocenenie, určí pobočku podľa obce a (ak je zapnuté striedanie) pridelí makléra.
-- Chybná udalosť ostane uložená so stavom 'error' a textom chyby; nič sa nestratí a dá sa spracovať znova (retry_inbound_errors).

-- ───────── Spracovanie jednej uloženej udalosti ─────────
-- Telo udalosti je JSON z nacenime (backend/src/Oznamovac.php::data()): id, vytvorene, ziadost (telefonat | pdf_suhlas), meno, telefon, email,
-- typ, vymera, stav, adresa, psc, obec, cena_od, cena_do, vysledok, dovod, predstava_ceny, dom_popis.
-- Pravidlo: do CRM ide len lead, ktorý má telefón (žiadosť o telefonát) alebo súhlas s kontaktovaním (PDF so súhlasom). Nacenime to už kontroluje,
-- tu sa to overuje ešte raz.
create or replace function process_inbound_event(p_event uuid) returns uuid
  language plpgsql security definer set search_path = public as
$$
declare
  e inbound_events; pl jsonb; lead text; v_id uuid; c_id uuid; br uuid;
  phone text; mail text; obec text; area numeric; lo numeric; hi numeric;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  select * into e from inbound_events where id = p_event for update;
  if not found then raise exception 'Udalosť neexistuje'; end if;
  if e.status = 'processed' then
    select id into v_id from valuations where inbound_event_id = e.id;
    return v_id;
  end if;

  begin
    pl := e.payload;
    if jsonb_typeof(pl) is distinct from 'object' then raise exception 'Telo udalosti nie je objekt'; end if;
    if coalesce(pl ->> 'id', '') !~ '^\d{1,12}$' then raise exception 'Chýba platné id leadu'; end if;
    lead := pl ->> 'id';
    if e.event_id <> 'nacenime-lead-' || lead then raise exception 'ID udalosti nesedí s telom'; end if;

    phone := nullif(btrim(coalesce(pl ->> 'telefon', '')), '');
    mail := nullif(lower(btrim(coalesce(pl ->> 'email', ''))), '');
    if phone is null and mail is null then raise exception 'Lead nemá kontakt'; end if;
    if phone is null and coalesce(pl ->> 'ziadost', '') <> 'pdf_suhlas' then
      raise exception 'Lead bez telefónu a bez súhlasu s kontaktovaním';
    end if;

    area := nullif(btrim(coalesce(pl ->> 'vymera', '')), '')::numeric;
    lo := nullif(btrim(coalesce(pl ->> 'cena_od', '')), '')::numeric;
    hi := nullif(btrim(coalesce(pl ->> 'cena_do', '')), '')::numeric;
    if area is not null and (area <= 0 or area >= 1000000) then raise exception 'Neplatná výmera'; end if;
    if (lo is not null and lo < 0) or (hi is not null and hi < 0) then raise exception 'Neplatná cena'; end if;
    obec := nullif(btrim(coalesce(pl ->> 'obec', '')), '');

    -- idempotencia aj pre prípad, že ocenenie už existuje (napr. ručne zaznamenané)
    select id into v_id from valuations where source = 'nacenime' and source_id = lead;
    if v_id is null then
      insert into clients (full_name, phone, email, address, source, source_id)
      values (coalesce(nullif(btrim(coalesce(pl ->> 'meno', '')), ''), 'Bez mena'), phone, mail,
              nullif(concat_ws(', ', nullif(btrim(coalesce(pl ->> 'adresa', '')), ''),
                               nullif(concat_ws(' ', nullif(btrim(coalesce(pl ->> 'psc', '')), ''), obec), '')), ''),
              'nacenime', lead)
      on conflict (source, source_id) do update set updated_at = now()
      returning id into c_id;

      br := case when obec is null then null else branch_for_municipality(obec) end;

      insert into valuations (client_id, branch_id, status, source, source_id, inbound_event_id, property_type, city_slug,
                              area_m2, estimate_low, estimate_high, payload)
      values (c_id, br, 'nepridelene', 'nacenime', lead, e.id, nullif(btrim(coalesce(pl ->> 'typ', '')), ''),
              case when obec is null then null else norm_text(obec) end, area, lo, hi,
              -- kontakt (meno, telefón, e-mail) je v clients, do payloadu sa nekopíruje
              jsonb_strip_nulls(jsonb_build_object(
                'adresa', nullif(btrim(coalesce(pl ->> 'adresa', '')), ''), 'psc', pl -> 'psc', 'obec', obec,
                'stav', pl -> 'stav', 'dovod', pl -> 'dovod', 'dom_popis', pl -> 'dom_popis',
                'predstava_ceny', pl -> 'predstava_ceny', 'ziadost', pl -> 'ziadost', 'vysledok', pl -> 'vysledok',
                'vytvorene_v_nacenime', pl -> 'vytvorene')))
      returning id into v_id;

      -- nepodarené automatické pridelenie nesmie zahodiť lead: ocenenie ostane v Nepridelených
      begin
        perform auto_assign_valuation(v_id);
      exception when others then
        null;
      end;
    end if;

    update inbound_events set status = 'processed', processed_at = now(), error = null where id = e.id;
    perform audit('inbound.processed', 'valuations', v_id::text, jsonb_build_object('event', e.event_id));
    return v_id;
  exception when others then
    update inbound_events set status = 'error', error = left(sqlerrm, 300) where id = e.id;
    return null;
  end;
end $$;

-- ───────── Prijatie udalosti z route (podpis už overený) ─────────
create or replace function ingest_nacenime_event(p_event_id text, p_payload jsonb) returns jsonb
  language plpgsql security definer set search_path = public as
$$
declare eid uuid; st text; v uuid;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  if coalesce(p_event_id, '') !~ '^nacenime-lead-\d{1,12}$' then raise exception 'Neplatné ID udalosti'; end if;

  insert into inbound_events (source, event_id, signature_ok, payload)
  values ('nacenime', p_event_id, true, p_payload)
  on conflict (source, event_id) do nothing
  returning id into eid;

  if eid is null then
    -- opakované doručenie: hotová udalosť sa nespracúva znova, nedokončená alebo chybná sa skúsi znova
    select id, status into eid, st from inbound_events where source = 'nacenime' and event_id = p_event_id;
    if st = 'processed' then return jsonb_build_object('status', 'duplicate'); end if;
    v := process_inbound_event(eid);
    select status into st from inbound_events where id = eid;
    return jsonb_build_object('status', st, 'duplicate', true, 'valuation_id', v);
  end if;

  v := process_inbound_event(eid);
  select status into st from inbound_events where id = eid;
  return jsonb_build_object('status', st, 'valuation_id', v);
end $$;

-- Opätovné spracovanie chybných udalostí (po oprave príčiny, napr. doplnení číselníka). Vráti počet úspešne spracovaných.
create or replace function retry_inbound_errors(p_limit int default 100) returns int
  language plpgsql security definer set search_path = public as
$$
declare r record; n int := 0;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  for r in select id from inbound_events where status = 'error' order by received_at limit greatest(p_limit, 0) loop
    perform process_inbound_event(r.id);
    if (select status from inbound_events where id = r.id) = 'processed' then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- GDPR: surová udalosť obsahuje meno, telefón a e-mail. Po spracovaní sa po N dňoch (predvolene 30) vymaže telo a ostane len id.
-- Údaje klienta sú v clients/valuations a riadia sa archívom a anonymizáciou. Chybné udalosti sa nemažú, kým sa nevyriešia.
create or replace function scrub_inbound_events(p_days int default 30) returns int
  language plpgsql security definer set search_path = public as
$$
declare n int;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  update inbound_events set payload = jsonb_build_object('id', payload -> 'id', 'scrubbed', true)
   where status = 'processed' and processed_at < now() - make_interval(days => greatest(p_days, 1))
     and coalesce((payload ->> 'scrubbed')::boolean, false) = false;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function process_inbound_event(uuid), ingest_nacenime_event(text, jsonb), retry_inbound_errors(int), scrub_inbound_events(int)
  from public, anon, authenticated;
