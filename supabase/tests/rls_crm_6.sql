-- Testy k migrácii 0008 (vytvorenie náboru z ocenenia). Spúšťa sa PO 0008. Beží v transakcii a vráti sa (ROLLBACK).
-- Úspech = výsledok "VŠETKY TESTY 0008 PRESLI".
begin;

create function pg_temp.login(p_uid uuid, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test'), ('00000000-0000-0000-0000-0000000000b1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test'), ('00000000-0000-0000-0000-0000000000f1', 'f1@test');
insert into branches (id, name, city) values ('00000000-0000-0000-0000-00000000c001', 'T6-Ružomberok', 'Ružomberok');
insert into staff (id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 2', 'b2@test'),
  ('00000000-0000-0000-0000-0000000000f1', null, 'finance', 'Financie', 'f1@test');
insert into clients (id, full_name, phone, source, source_id) values
  ('00000000-0000-0000-0000-00000000d001', 'Klient 1', '0905 111 111', 'nacenime', 'x1'),
  ('00000000-0000-0000-0000-00000000d002', 'Klient 2', '0905 222 222', 'nacenime', 'x2');
insert into valuations (id, client_id, assigned_to, branch_id, status, property_type, city_slug, area_m2, estimate_low, estimate_high, payload) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001',
   'pridelene', 'Byt', 'ruzomberok', 62, 105000, 125000, '{"adresa":"Hlavná 5","obec":"Ružomberok","predstava_ceny":115000}'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b1', null,
   'pridelene', 'Dom', null, 140, null, null, '{"predstava_ceny":"asi 200 tisíc"}'),
  ('00000000-0000-0000-0000-00000000f003', null, '00000000-0000-0000-0000-0000000000b1', null, 'pridelene', 'Byt', null, null, null, null, '{}'),
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000d002', null, null, 'nepridelene', 'Byt', null, null, null, null, '{}');

do $$
declare
  a1 constant uuid := '00000000-0000-0000-0000-0000000000a1'; b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
  b2 constant uuid := '00000000-0000-0000-0000-0000000000b2'; f1 constant uuid := '00000000-0000-0000-0000-0000000000f1';
  v1 constant uuid := '00000000-0000-0000-0000-00000000f001'; v2 constant uuid := '00000000-0000-0000-0000-00000000f002';
  v3 constant uuid := '00000000-0000-0000-0000-00000000f003'; v4 constant uuid := '00000000-0000-0000-0000-00000000f004';
  m uuid; r mandates; n int; failed boolean;
begin
  assert not has_function_privilege('anon', 'create_mandate_from_valuation(uuid)', 'execute'), 'M1 anon nevolá vytvorenie náboru';

  -- predvyplnenie z ocenenia
  perform pg_temp.login(b1);
  m := create_mandate_from_valuation(v1);
  select * into r from mandates where id = m;
  assert r.client_id = '00000000-0000-0000-0000-00000000d001' and r.valuation_id = v1 and r.broker_id = b1, 'M2a klient, ocenenie a maklér';
  assert r.title = 'Byt, Hlavná 5', format('M2b názov náboru: %s', r.title);
  assert r.address = 'Hlavná 5, Ružomberok' and r.area_m2 = 62 and r.asking_price = 115000, 'M2c adresa, výmera a predstava ceny';
  assert r.property_type = 'byty' and r.transaction = 'predaj' and r.status = 'aktivny', 'M2d typ je normalizovaný, predaj, aktívny';
  assert r.branch_id = '00000000-0000-0000-0000-00000000c001' and r.financing_status = 'nove', 'M2e pobočka makléra a nové financovanie';
  select count(*) into n from clients where id = '00000000-0000-0000-0000-00000000d001' and owner_id = b1; assert n = 1, 'M2f klient patrí maklérovi';

  -- druhýkrát nie (aj poistka: jedinečný index)
  failed := false;
  begin perform create_mandate_from_valuation(v1); exception when others then failed := true; end;
  assert failed, 'M3a druhý nábor k tomu istému oceneniu sa nevytvorí';
  perform pg_temp.logout();
  failed := false;
  begin
    insert into mandates (client_id, valuation_id, broker_id, title) values ('00000000-0000-0000-0000-00000000d001', v1, b1, 'duplicita');
  exception when unique_violation then failed := true; end;
  assert failed, 'M3b databáza nepustí dva aktívne nábory k jednému oceneniu';

  -- neplatná predstava ceny sa preskočí, chýbajúce údaje nie sú chyba, názov má náhradu
  perform pg_temp.login(b1);
  m := create_mandate_from_valuation(v2);
  select * into r from mandates where id = m;
  assert r.asking_price is null and r.title = 'Dom' and r.address is null and r.area_m2 = 140 and r.branch_id = '00000000-0000-0000-0000-00000000c001', 'M4 neplatná cena, chýbajúca adresa';
  failed := false;
  begin perform create_mandate_from_valuation(v3); exception when others then failed := true; end;
  assert failed, 'M5 ocenenie bez klienta nemá nábor';

  -- cudzie, nepridelené, iné role
  failed := false;
  begin perform create_mandate_from_valuation(v4); exception when others then failed := true; end;
  assert failed, 'M6 nepridelené ocenenie nemá nábor';
  perform pg_temp.login(b2);
  failed := false;
  begin perform create_mandate_from_valuation(v1); exception when others then failed := true; end;
  assert failed, 'M7 cudzie ocenenie sa nedá';
  perform pg_temp.login(a1);
  failed := false;
  begin perform create_mandate_from_valuation(v1); exception when others then failed := true; end;
  assert failed, 'M8 admin nábor nezakladá';
  perform pg_temp.login(f1);
  failed := false;
  begin perform create_mandate_from_valuation(v1); exception when others then failed := true; end;
  assert failed, 'M9 financie nábor nezakladajú';

  -- po archivovaní sa dá založiť nový nábor k tomu istému oceneniu
  perform pg_temp.login(b1);
  perform close_mandate_unagreed((select id from mandates where valuation_id = v1 limit 1), 'cena');
  update valuations set status = 'pridelene' where id = v1;
  m := create_mandate_from_valuation(v1);
  assert m is not null, 'M10 po archivovaní sa dá založiť nový nábor';
  perform pg_temp.login(a1);
  select count(*) into n from audit_log where action = 'mandate.created'; assert n = 3, format('M11 vytvorenia sú v audite (%s, čakané 3)', n);

  raise notice 'VŠETKY TESTY 0008 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0008 PRESLI' as vysledok;
