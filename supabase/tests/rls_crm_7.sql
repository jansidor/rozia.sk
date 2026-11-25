-- Testy k migrácii 0009 (opravy z nezávislej kontroly). Spúšťa sa PO 0009. Beží v transakcii a vráti sa (ROLLBACK).
-- Úspech = výsledok "VŠETKY TESTY 0009 PRESLI". Dáta sú vymyslené.
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
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test');
insert into branches (id, name, city) values ('00000000-0000-0000-0000-00000000c001', 'T7-Ružomberok', 'Ružomberok');
insert into staff (id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 2', 'b2@test');

-- Klient X patrí maklérovi 1: aktívny nábor + vyplnený dokument. Klient Y má archivovaný nábor maklér 1. Klient Z je predaný maklér 1.
insert into clients (id, owner_id, branch_id, full_name, phone, email) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient X', '0905 111 111', 'x@x.sk'),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient Y', '0905 333 333', 'y@x.sk'),
  ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient Z', '0905 444 444', 'z@x.sk');
insert into mandates (id, client_id, broker_id, branch_id, title, status, archived_at, archive_reason) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Nábor X', 'aktivny', null, null),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Nábor Y', 'nedohodnuty', now(), 'cena'),
  ('00000000-0000-0000-0000-00000000e004', '00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Nábor Z', 'predany', null, null);
insert into client_documents (client_id, mandate_id, template_code, template_version, storage_path)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000e001', 'zmluva', 1, 'x/doc.docx');

-- Nové nepridelené ocenenie z nacenime (klient bez vlastníka, pobočka Ružomberok) s telefónom klienta X
insert into clients (id, full_name, phone, email, source, source_id) values
  ('00000000-0000-0000-0000-00000000d002', 'Nový lead', '0905 111 111', 'y@y.sk', 'nacenime', 't7-1'),
  ('00000000-0000-0000-0000-00000000d005', 'Nový lead Y', '+421 905 333 333', 'q@y.sk', 'nacenime', 't7-2'),
  ('00000000-0000-0000-0000-00000000d006', 'Nový lead Z', '0905444444', 'r@y.sk', 'nacenime', 't7-3');
insert into valuations (id, client_id, branch_id, status, source, source_id, property_type) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000c001', 'nepridelene', 'nacenime', 't7-1', 'Byt'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000d005', '00000000-0000-0000-0000-00000000c001', 'pridelene', 'nacenime', 't7-2', 'Byt'),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000d006', '00000000-0000-0000-0000-00000000c001', 'pridelene', 'nacenime', 't7-3', 'Byt');
update valuations set assigned_to = '00000000-0000-0000-0000-0000000000b2', assigned_at = now() where id in
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f003');

do $$
declare
  a1 constant uuid := '00000000-0000-0000-0000-0000000000a1';
  b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
  b2 constant uuid := '00000000-0000-0000-0000-0000000000b2';
  cx constant uuid := '00000000-0000-0000-0000-00000000d001';
  cnew constant uuid := '00000000-0000-0000-0000-00000000d002';
  cy constant uuid := '00000000-0000-0000-0000-00000000d003';
  cz constant uuid := '00000000-0000-0000-0000-00000000d004';
  v_claim constant uuid := '00000000-0000-0000-0000-00000000f001';
  v_y constant uuid := '00000000-0000-0000-0000-00000000f002';
  v_z constant uuid := '00000000-0000-0000-0000-00000000f003';
  mx constant uuid := '00000000-0000-0000-0000-00000000e001';
  my constant uuid := '00000000-0000-0000-0000-00000000e003';
  n int; failed boolean; txt text;
begin
  -- C. Prevzatie z Nepridelených: maklér po „Vziať si“ vidí kontakt klienta
  perform pg_temp.login(b2);
  perform claim_unassigned(v_claim);
  select count(*) into n from clients where id = cnew; assert n = 1, 'C1 maklér po prevzatí vidí klienta ocenenia';
  perform pg_temp.login(b1);
  select count(*) into n from clients where id = cnew; assert n = 0, 'C2 iný maklér klienta cudzieho ocenenia nevidí';

  -- L. Vrátený klient: klient s aktívnym alebo predaným nábor iného makléra sa nepreberá
  perform pg_temp.login(b2);
  failed := false;
  begin perform link_returning_client(v_claim, cx, null); exception when others then failed := true; txt := sqlerrm; end;
  assert failed and txt = 'Klient má aktívny alebo predaný nábor iného makléra', format('L1 aktívny nábor iného makléra sa nepreberie (%s)', txt);
  select count(*) into n from clients where id = cx; assert n = 0, 'L2 maklér 2 klienta X nezískal';
  perform pg_temp.login(b1);
  select count(*) into n from clients where id = cx; assert n = 1, 'L3 maklér 1 klienta X stále vidí';
  select count(*) into n from client_documents where client_id = cx; assert n = 1, 'L4 maklér 1 stále vidí dokumenty svojho náboru';
  perform pg_temp.login(b2);
  failed := false;
  begin perform link_returning_client(v_z, cz, null); exception when others then failed := true; txt := sqlerrm; end;
  assert failed and txt = 'Klient má aktívny alebo predaný nábor iného makléra', format('L5 predaný nábor iného makléra sa nepreberie (%s)', txt);
  -- archivovaný (nedohodnutý) nábor sa ďalej obnoviť dá (pôvodné správanie)
  perform link_returning_client(v_y, cy, my);
  select count(*) into n from mandates where id = my and status = 'aktivny' and broker_id = b2; assert n = 1, 'L6 archivovaný nábor sa obnoví na nového makléra';

  -- G. Ocenenie: maklér priamo nemení client_id (len stav)
  perform pg_temp.login(b2);
  failed := false;
  begin update valuations set client_id = cx where id = v_claim; exception when others then failed := true; end;
  assert failed, 'G1 maklér nepodvrhne client_id ocenenia';
  update valuations set status = 'archiv' where id = v_claim; get diagnostics n = row_count; assert n = 1, 'G2 maklér smie meniť stav ocenenia';

  -- M. Nábory: priamo len údaje náboru; bez zmeny životného cyklu, vkladania a mazania
  perform pg_temp.login(b1);
  update mandates set title = 'Nový názov', asking_price = 123456, commission_pct = 2.5 where id = mx; get diagnostics n = row_count;
  assert n = 1, 'M1 maklér smie meniť údaje náboru';
  failed := false;
  begin update mandates set status = 'predany' where id = mx; exception when others then failed := true; end;
  assert failed, 'M2 maklér nezmení stav náboru priamo';
  failed := false;
  begin update mandates set anonymized_at = now(), archive_reason = 'x' where id = mx; exception when others then failed := true; end;
  assert failed, 'M3 maklér nenastaví archív ani anonymizáciu priamo';
  failed := false;
  begin update mandates set client_id = cnew where id = mx; exception when others then failed := true; end;
  assert failed, 'M4 maklér nezmení klienta náboru priamo';
  failed := false;
  begin update mandates set broker_id = b2 where id = mx; exception when others then failed := true; end;
  assert failed, 'M5 maklér nepresunie nábor inému priamym zápisom';
  failed := false;
  begin insert into mandates (client_id, broker_id, title) values (cx, b1, 'ručne'); exception when others then failed := true; end;
  assert failed, 'M6 maklér nevloží nábor priamo';
  failed := false;
  begin delete from mandates where id = mx; get diagnostics n = row_count; if n = 0 then failed := true; end if; exception when others then failed := true; end;
  assert failed, 'M7 maklér nezmaže nábor priamo';
  -- funkcie fungujú ďalej (majú práva vlastníka)
  perform close_mandate_unagreed(mx, 'cena');
  perform restore_mandate(mx);
  perform handoff_mandate(mx, b2, 'test');
  perform pg_temp.login(a1);
  select count(*) into n from mandates where id = mx and broker_id = b2 and status = 'aktivny'; assert n = 1, 'M8 uzavretie, obnova aj odovzdanie cez funkcie fungujú';
  update mandates set status = 'predany' where id = mx; get diagnostics n = row_count; assert n = 1, 'M9 admin smie meniť všetko';

  raise notice 'VŠETKY TESTY 0009 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0009 PRESLI' as vysledok;
