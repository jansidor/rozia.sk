-- Testy k migrácii 0006 (príjem leadov z nacenime: ingest, idempotencia, chyby, opakovanie, automatické pridelenie, čistenie).
-- Spúšťa sa PO 0006. Všetko beží v transakcii a vráti sa (ROLLBACK). Úspech = výsledok "VŠETKY TESTY 0006 PRESLI".
begin;

create function pg_temp.login(p_uid uuid, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ── dáta ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test'), ('00000000-0000-0000-0000-0000000000b1', 'b1@test');
insert into branches (id, name, city) values ('00000000-0000-0000-0000-00000000c001', 'T4-Ružomberok', 'Ružomberok');
insert into staff (id, branch_id, role, full_name, email, availability) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test', 'available'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test', 'available');
insert into municipalities (name, district) values ('Testovo', 'T4-Okres-A');
insert into branch_districts (branch_id, district) values ('00000000-0000-0000-0000-00000000c001', 'T4-Okres-A');

do $$
declare
  a1 constant uuid := '00000000-0000-0000-0000-0000000000a1'; b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
  br constant uuid := '00000000-0000-0000-0000-00000000c001';
  base jsonb := '{"zdroj":"nacenime.sk","id":9001,"vytvorene":"2026-11-24T10:00:00+00:00","ziadost":"telefonat","meno":"Jana Nováková",
                  "telefon":"0905 111 111","email":"jana@x.sk","typ":"Byt","vymera":62,"stav":"Kompletná rekonštrukcia","adresa":"Hlavná 5",
                  "psc":"034 01","obec":"Testovo","cena_od":105000,"cena_do":125000,"vysledok":"ok","dovod":"Predaj","predstava_ceny":115000,"dom_popis":null}';
  res jsonb; n int; txt text; v uuid; failed boolean; ev inbound_events; val valuations; cl clients;
begin
  -- I1. práva: len server
  assert not has_function_privilege('authenticated', 'ingest_nacenime_event(text,jsonb)', 'execute'), 'I1a authenticated nevolá ingest';
  assert not has_function_privilege('anon', 'ingest_nacenime_event(text,jsonb)', 'execute'), 'I1b anon nevolá ingest';
  assert not has_function_privilege('authenticated', 'process_inbound_event(uuid)', 'execute'), 'I1c authenticated nevolá spracovanie';
  assert not has_function_privilege('authenticated', 'retry_inbound_errors(int)', 'execute'), 'I1d authenticated nevolá opakovanie';
  assert not has_function_privilege('authenticated', 'scrub_inbound_events(int)', 'execute'), 'I1e authenticated nevolá čistenie';
  assert has_function_privilege('service_role', 'ingest_nacenime_event(text,jsonb)', 'execute'), 'I1f server smie volať ingest';
  perform pg_temp.login(b1);
  failed := false;
  begin perform ingest_nacenime_event('nacenime-lead-9001', base); exception when others then failed := true; end;
  assert failed, 'I1g prihlásený maklér nevie vložiť lead';
  perform pg_temp.login(null, 'anon');
  failed := false;
  begin perform ingest_nacenime_event('nacenime-lead-9001', base); exception when others then failed := true; end;
  assert failed, 'I1h anonym nevie vložiť lead';

  -- I2. platný lead
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9001', base);
  perform pg_temp.logout();
  assert res ->> 'status' = 'processed' and res ->> 'valuation_id' is not null, format('I2a stav %s', res);
  v := (res ->> 'valuation_id')::uuid;
  select * into val from valuations where id = v;
  assert val.source = 'nacenime' and val.source_id = '9001' and val.status = 'nepridelene', 'I2b ocenenie je nepridelené';
  assert val.branch_id = br, 'I2c pobočka podľa obce';
  assert val.city_slug = 'testovo' and val.area_m2 = 62 and val.estimate_low = 105000 and val.estimate_high = 125000, 'I2d údaje ocenenia';
  assert val.property_type = 'Byt' and val.payload ->> 'adresa' = 'Hlavná 5', 'I2e adresa je v payloade pod kľúčom adresa';
  assert not (val.payload ? 'telefon') and not (val.payload ? 'email') and not (val.payload ? 'meno'), 'I2f kontakt sa nekopíruje do payloadu';
  select * into cl from clients where id = val.client_id;
  assert cl.full_name = 'Jana Nováková' and cl.phone = '0905 111 111' and cl.email = 'jana@x.sk', 'I2g klient má kontakt';
  assert cl.address = 'Hlavná 5, 034 01 Testovo' and cl.source = 'nacenime' and cl.source_id = '9001', 'I2h adresa a zdroj klienta';
  select * into ev from inbound_events where event_id = 'nacenime-lead-9001';
  assert ev.status = 'processed' and ev.processed_at is not null and ev.error is null and ev.signature_ok, 'I2i udalosť je spracovaná';
  select count(*) into n from audit_log where action = 'inbound.processed'; assert n = 1, 'I2j spracovanie je v audite';

  -- I3. opakované doručenie nič nezdvojí
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9001', base);
  perform pg_temp.logout();
  assert res ->> 'status' = 'duplicate', format('I3a opakované doručenie: %s', res);
  select count(*) into n from valuations where source_id = '9001'; assert n = 1, 'I3b jedno ocenenie';
  select count(*) into n from clients where source_id = '9001'; assert n = 1, 'I3c jeden klient';
  select count(*) into n from inbound_events where event_id = 'nacenime-lead-9001'; assert n = 1, 'I3d jedna udalosť';

  -- I4. chybné udalosti sa uložia so stavom error a nič nevytvoria
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9002', jsonb_set(base, '{id}', '9003'));
  perform pg_temp.logout();
  assert res ->> 'status' = 'error', format('I4a ID udalosti nesedí s telom: %s', res);
  select * into ev from inbound_events where event_id = 'nacenime-lead-9002';
  assert ev.status = 'error' and ev.error is not null and length(ev.error) > 0 and ev.payload ->> 'id' = '9003', 'I4b udalosť je uložená s chybou a telom';
  select count(*) into n from valuations where source_id in ('9002', '9003'); assert n = 0, 'I4c nič sa nevytvorilo';
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9004', jsonb_set(jsonb_set(base, '{id}', '9004'), '{telefon}', 'null'));
  assert res ->> 'status' = 'error', 'I4d telefonát bez telefónu je chyba';
  res := ingest_nacenime_event('nacenime-lead-9005', ((base - 'telefon' - 'email') || '{"id":9005}'));
  assert res ->> 'status' = 'error', 'I4e lead bez kontaktu je chyba';
  res := ingest_nacenime_event('nacenime-lead-9006', jsonb_set(base, '{id}', '9006') || '{"vymera":"abc"}');
  assert res ->> 'status' = 'error', 'I4f neplatná výmera je chyba';
  res := ingest_nacenime_event('nacenime-lead-9007', jsonb_set(base, '{id}', '9007') || '{"vymera":-5}');
  assert res ->> 'status' = 'error', 'I4g záporná výmera je chyba';
  failed := false;
  begin perform ingest_nacenime_event('abc', base); exception when others then failed := true; end;
  assert failed, 'I4h neplatný tvar ID udalosti sa odmietne';
  failed := false;
  begin perform ingest_nacenime_event('nacenime-lead-1; drop table clients', base); exception when others then failed := true; end;
  assert failed, 'I4i podvrhnuté ID udalosti sa odmietne';
  -- opakované doručenie chybnej udalosti ostáva chybou (telo sa nemení)
  res := ingest_nacenime_event('nacenime-lead-9002', base);
  assert res ->> 'status' = 'error' and (res ->> 'duplicate')::boolean, format('I4j chybná udalosť sa pri opakovaní nespracuje inak: %s', res);

  -- I5. súhlas bez telefónu (PDF so súhlasom) je platný; neznáma alebo chýbajúca obec = bez pobočky
  res := ingest_nacenime_event('nacenime-lead-9010', ((base - 'telefon') || '{"id":9010,"ziadost":"pdf_suhlas","meno":null}'));
  assert res ->> 'status' = 'processed', format('I5a PDF so súhlasom, len e-mail: %s', res);
  res := ingest_nacenime_event('nacenime-lead-9011', jsonb_set(base, '{id}', '9011') || '{"obec":"Neznáma Lehota"}');
  assert res ->> 'status' = 'processed', 'I5b neznáma obec nie je chyba';
  res := ingest_nacenime_event('nacenime-lead-9012', (base - 'obec') || '{"id":9012}');
  assert res ->> 'status' = 'processed', 'I5c bez obce nie je chyba';
  perform pg_temp.logout();
  select full_name into txt from clients where source_id = '9010'; assert txt = 'Bez mena', 'I5d klient bez mena';
  select count(*) into n from valuations where source_id in ('9011', '9012') and branch_id is null and status = 'nepridelene'; assert n = 2, 'I5e ocenenia bez pobočky ostanú v Nepridelených';

  -- I6. opakovanie chybných udalostí po oprave príčiny
  update inbound_events set payload = jsonb_set(payload, '{id}', '9002') where event_id = 'nacenime-lead-9002';
  perform pg_temp.login(null, 'service_role');
  n := retry_inbound_errors();
  perform pg_temp.logout();
  assert n = 1, format('I6a opakovanie spracovalo %s udalostí (čakané 1: 9002; ostatné chyby ostávajú)', n);
  select status into txt from inbound_events where event_id = 'nacenime-lead-9002'; assert txt = 'processed', 'I6b opravená udalosť je spracovaná';
  select count(*) into n from valuations where source_id = '9002'; assert n = 1, 'I6c vzniklo ocenenie';
  select count(*) into n from inbound_events where status = 'error'; assert n = 4, format('I6d ostatné chybné udalosti ostali (%s, čakané 4)', n);

  -- I7. automatické pridelenie pri príjme (len keď je zapnuté striedanie)
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9020', jsonb_set(base, '{id}', '9020') || '{"telefon":"+421 905 111 111"}');
  perform pg_temp.logout();
  select status into txt from valuations where source_id = '9020'; assert txt = 'nepridelene', 'I7a v režime manual ostane ocenenie nepridelené';
  update app_settings set value = '"round_robin"' where key = 'assignment_mode';
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9021', jsonb_set(base, '{id}', '9021') || '{"telefon":"0907 777 777","email":"iny@x.sk"}');
  perform pg_temp.logout();
  select * into val from valuations where source_id = '9021';
  assert val.status = 'pridelene' and val.assigned_to = b1, 'I7b v režime round_robin sa ocenenie pridelí makléroví pobočky';
  select owner_id into txt from clients where id = val.client_id; assert txt = b1::text, 'I7c klient patrí pridelenému maklérovi';
  perform pg_temp.login(null, 'service_role');
  res := ingest_nacenime_event('nacenime-lead-9022', (base - 'obec') || '{"id":9022,"telefon":"0908 888 888","email":"tretí@x.sk"}');
  perform pg_temp.logout();
  select status into txt from valuations where source_id = '9022'; assert txt = 'nepridelene', 'I7d bez pobočky sa nepridelí ani pri striedaní';
  update app_settings set value = '"manual"' where key = 'assignment_mode';

  -- I8. vrátený klient: druhý lead s rovnakým telefónom sa nájde (integrácia s returning_client_check)
  select id into v from valuations where source_id = '9020';
  perform pg_temp.login(a1);
  perform assign_valuation(v, b1);
  perform pg_temp.login(b1);
  select count(*) into n from returning_client_check(v);
  assert n >= 1, format('I8 klient z leadu 9001 sa nájde podľa telefónu (rôzny zápis čísla), nájdených %s', n);

  -- I9. čistenie surových udalostí (GDPR)
  perform pg_temp.logout();
  update inbound_events set processed_at = now() - interval '40 days' where event_id in ('nacenime-lead-9001', 'nacenime-lead-9010');
  perform pg_temp.login(null, 'service_role');
  n := scrub_inbound_events(30);
  perform pg_temp.logout();
  assert n = 2, format('I9a vyčistili sa %s udalostí (čakané 2)', n);
  select * into ev from inbound_events where event_id = 'nacenime-lead-9001';
  assert ev.payload = '{"id": 9001, "scrubbed": true}'::jsonb, format('I9b telo je vyčistené: %s', ev.payload);
  select * into ev from inbound_events where event_id = 'nacenime-lead-9020';
  assert ev.payload ? 'telefon', 'I9c čerstvá udalosť ostala';
  select * into ev from inbound_events where event_id = 'nacenime-lead-9004';
  assert ev.status = 'error' and ev.payload ? 'telefon', 'I9d chybná udalosť sa nečistí';
  perform pg_temp.login(null, 'service_role');
  n := scrub_inbound_events(30);
  perform pg_temp.logout();
  assert n = 0, 'I9e opakované čistenie už nič nemení';

  raise notice 'VŠETKY TESTY 0006 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0006 PRESLI' as vysledok;
