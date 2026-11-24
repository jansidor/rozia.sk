-- Testy k migrácii 0007 (uchovávanie údajov: neaktívne leady, formuláre webu, audit, denná údržba).
-- Spúšťa sa PO 0007. Všetko beží v transakcii a vráti sa (ROLLBACK). Úspech = výsledok "VŠETKY TESTY 0007 PRESLI".
begin;

create function pg_temp.login(p_uid uuid, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'b1@test');
insert into branches (id, name, city) values ('00000000-0000-0000-0000-00000000c001', 'T5-Ružomberok', 'Ružomberok');
insert into staff (id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test');

-- klienti z nacenime: starý bez náboru (zanikne), starý so živým nábor-om (ostane), čerstvý (ostane), iný zdroj (ostane), starý s čerstvým ocenením (ostane)
insert into clients (id, full_name, phone, email, address, source, source_id, created_at) values
  ('00000000-0000-0000-0000-00000000d001', 'Stary Lead', '0905 111 111', 'a@x.sk', 'Hlavná 1', 'nacenime', 'l1', now() - interval '25 months'),
  ('00000000-0000-0000-0000-00000000d002', 'Stary so Naborom', '0905 222 222', 'b@x.sk', 'Hlavná 2', 'nacenime', 'l2', now() - interval '25 months'),
  ('00000000-0000-0000-0000-00000000d003', 'Cerstvy Lead', '0905 333 333', 'c@x.sk', 'Hlavná 3', 'nacenime', 'l3', now() - interval '2 months'),
  ('00000000-0000-0000-0000-00000000d004', 'Rucny Zaznam', '0905 444 444', 'd@x.sk', 'Hlavná 4', 'manual', 'm4', now() - interval '40 months'),
  ('00000000-0000-0000-0000-00000000d005', 'Stary s Novym Ocenenim', '0905 555 555', 'e@x.sk', 'Hlavná 5', 'nacenime', 'l5', now() - interval '25 months');
insert into valuations (id, client_id, status, source, source_id, payload, created_at) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000d001', 'nepridelene', 'nacenime', 'l1', '{"adresa":"Hlavná 1"}', now() - interval '25 months'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000d002', 'pridelene', 'nacenime', 'l2', '{"adresa":"Hlavná 2"}', now() - interval '25 months'),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000d003', 'nepridelene', 'nacenime', 'l3', '{"adresa":"Hlavná 3"}', now() - interval '2 months'),
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-00000000d005', 'pridelene', 'nacenime', 'l5', '{"adresa":"Hlavná 5"}', now() - interval '1 month');
insert into mandates (id, client_id, broker_id, title, status) values
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b1', 'Živý nábor', 'aktivny');

insert into leads (kind, name, phone, gdpr_consent, gdpr_consent_text, created_at) values
  ('kontakt', 'Stary dopyt', '0905 000 001', true, 'x', now() - interval '13 months'),
  ('kontakt', 'Cerstvy dopyt', '0905 000 002', true, 'x', now() - interval '2 months');

insert into audit_log (at, actor, action, entity) values
  (now() - interval '37 months', null, 'test.stary', 'x'),
  (now() - interval '2 months', null, 'test.cerstvy', 'x');

do $$
declare n int; r jsonb; failed boolean; txt text;
  b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
begin
  -- práva: len server
  assert not has_function_privilege('authenticated', 'run_retention()', 'execute'), 'R1a authenticated nespustí údržbu';
  assert not has_function_privilege('anon', 'run_retention()', 'execute'), 'R1b anon nespustí údržbu';
  assert not has_function_privilege('authenticated', 'anonymize_stale_leads(int)', 'execute'), 'R1c';
  assert not has_function_privilege('authenticated', 'purge_web_leads(int)', 'execute'), 'R1d';
  assert not has_function_privilege('authenticated', 'purge_audit_log(int)', 'execute'), 'R1e';
  assert has_function_privilege('service_role', 'run_retention()', 'execute'), 'R1f server smie spustiť údržbu';
  perform pg_temp.login(b1);
  failed := false;
  begin perform run_retention(); exception when others then failed := true; end;
  assert failed, 'R1g maklér nespustí údržbu';
  perform pg_temp.logout();

  -- denná údržba
  perform pg_temp.login(null, 'service_role');
  r := run_retention();
  perform pg_temp.logout();
  assert (r ->> 'stale_leads_anonymized')::int = 1, format('R2a anonymizoval sa jeden starý lead (výsledok %s)', r);
  assert (r ->> 'web_leads_deleted')::int = 1, 'R2b zmazal sa starý dopyt z webu';
  assert (r ->> 'audit_rows_deleted')::int = 1, 'R2c zmazal sa starý záznam auditu';
  assert r ? 'archived_mandates_anonymized' and r ? 'inbound_events_scrubbed' and r ? 'files_waiting_for_delete', 'R2d výsledok má všetky počty';
  assert r::text !~* 'Stary|Jana|@x\.sk|0905', 'R2e výsledok neobsahuje osobné údaje';

  -- klient bez spolupráce je anonymizovaný, ocenenie ostalo len ako štatistika
  select count(*) into n from clients where id = '00000000-0000-0000-0000-00000000d001'
     and full_name = 'Anonymizovaný klient' and phone is null and email is null and address is null and anonymized_at is not null;
  assert n = 1, 'R3a starý lead je anonymizovaný';
  select count(*) into n from valuations where id = '00000000-0000-0000-0000-00000000f001' and payload = '{}' and status = 'archiv';
  assert n = 1, 'R3b ocenenie bez adresy a v archíve';
  -- ostatní ostali nedotknutí
  select count(*) into n from clients where id in ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000d003',
        '00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-00000000d005') and anonymized_at is null and phone is not null;
  assert n = 4, format('R4 nedotknutí: klient so živým nábor-om, čerstvý, ručný záznam, so čerstvým ocenením (%s zo 4)', n);
  select count(*) into n from valuations where id in ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000f005')
     and payload <> '{}'; assert n = 3, 'R4b ocenenia ostatných ostali';
  select count(*) into n from leads; assert n = 1, 'R5a ostal čerstvý dopyt z webu';
  select count(*) into n from audit_log where action = 'test.cerstvy'; assert n = 1, 'R5b čerstvý záznam auditu ostal';
  select count(*) into n from audit_log where action = 'test.stary'; assert n = 0, 'R5c starý záznam auditu je preč';
  select count(*) into n from audit_log where action = 'retention.run'; assert n = 1, 'R5d údržba sa zapísala do auditu';

  -- opakované spustenie nič nemení
  perform pg_temp.login(null, 'service_role');
  r := run_retention();
  perform pg_temp.logout();
  assert (r ->> 'stale_leads_anonymized')::int = 0 and (r ->> 'web_leads_deleted')::int = 0 and (r ->> 'audit_rows_deleted')::int = 0, format('R6 opakovanie nič nemení: %s', r);

  -- nastavenia sa dodržiavajú (kratšia lehota anonymizuje aj čerstvý lead)
  perform pg_temp.login(null, 'service_role');
  n := anonymize_stale_leads(1);
  perform pg_temp.logout();
  assert n = 1, format('R7 pri lehote 1 mesiac sa anonymizuje čerstvý lead z pred 2 mesiacov (%s)', n);
  select count(*) into n from clients where id = '00000000-0000-0000-0000-00000000d002' and anonymized_at is null; assert n = 1, 'R7b klient so živým nábor-om ostáva aj pri krátkej lehote';

  raise notice 'VŠETKY TESTY 0007 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0007 PRESLI' as vysledok;
