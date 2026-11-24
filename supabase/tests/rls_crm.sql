-- Testy oprávnení CRM jadra (RLS, role, financie, audit). Bezpečné na staging: všetko beží v transakcii a na konci sa vráti (ROLLBACK).
-- Spustenie: celý súbor vložiť do Supabase SQL Editora (alebo `psql -f`). Úspech = správa "VŠETKY TESTY PRESLI" a žiadna chyba.
-- Používa vlastných testovacích používateľov (fixné UUID), nezávisle od účtov v Authentication.
begin;

create function pg_temp.login(p_uid uuid, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end $$;

create function pg_temp.logout() returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claims', '', true); end $$;

-- ── príprava dát (ako vlastník, mimo RLS) ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test'), ('00000000-0000-0000-0000-0000000000b1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test'), ('00000000-0000-0000-0000-0000000000b3', 'b3@test'),
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test'), ('00000000-0000-0000-0000-0000000000e1', 'e1@test');
insert into branches (id, name, city, is_fallback) values
  ('00000000-0000-0000-0000-00000000c001', 'T-Ružomberok', 'Ružomberok', true);
insert into branches (id, name, city, fallback_branch_id) values
  ('00000000-0000-0000-0000-00000000c002', 'T-Dolný Kubín', 'Dolný Kubín', '00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000c003', 'T-Martin', 'Martin', null);
insert into staff (id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 2', 'b2@test'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000c003', 'broker', 'Maklér 3 (Martin)', 'b3@test'),
  ('00000000-0000-0000-0000-0000000000f1', null, 'finance', 'Financie', 'f1@test');
-- e1 je prihlásený používateľ BEZ záznamu v staff (nesmie nič)
insert into clients (id, owner_id, branch_id, full_name, phone, email) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient 1', '0905 111 111', 'k1@x.sk'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'Klient 2', '0905 222 222', 'k2@x.sk');
insert into mandates (id, client_id, broker_id, branch_id, title) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Nábor 1'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'Nábor 2');
insert into mandate_notes (mandate_id, author, body) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b1', 'poznámka makléra');
insert into client_documents (client_id, mandate_id, template_code, template_version, storage_path) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000e001', 'zmluva', 1, 'x/1.docx'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000e002', 'zmluva', 1, 'x/2.docx');
insert into valuations (id, branch_id, status) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001', 'nepridelene'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000c001', 'nepridelene'),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000c002', 'nepridelene'), -- Dolný Kubín (záloha: Ružomberok)
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000c003', 'nepridelene'); -- Martin (bez zálohy)
insert into valuations (id, branch_id, status, assigned_to) values
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-00000000c001', 'pridelene', '00000000-0000-0000-0000-0000000000b2');

do $$
declare
  b1 constant uuid := '00000000-0000-0000-0000-0000000000b1'; b2 constant uuid := '00000000-0000-0000-0000-0000000000b2';
  b3 constant uuid := '00000000-0000-0000-0000-0000000000b3'; a1 constant uuid := '00000000-0000-0000-0000-0000000000a1';
  f1 constant uuid := '00000000-0000-0000-0000-0000000000f1'; e1 constant uuid := '00000000-0000-0000-0000-0000000000e1';
  m1 constant uuid := '00000000-0000-0000-0000-00000000e001'; m2 constant uuid := '00000000-0000-0000-0000-00000000e002';
  c1 constant uuid := '00000000-0000-0000-0000-00000000d001';
  n int; failed boolean; txt text;
  procedure_dummy int;
begin
  -- A. maklér vidí len svoje
  perform pg_temp.login(b1);
  select count(*) into n from clients; assert n = 1, format('A1 maklér 1 vidí %s klientov, má 1', n);
  select count(*) into n from mandates; assert n = 1, format('A2 maklér 1 vidí %s náborov, má 1', n);
  select count(*) into n from mandate_notes; assert n = 1, 'A3 maklér vidí svoju poznámku';
  select count(*) into n from client_documents; assert n = 1, format('A4 maklér vidí %s dokumentov, má 1', n);
  -- vidí nepridelené vo svojej pobočke a pobočke so zálohou na neho (Dolný Kubín), nie Martin a nie cudzie pridelené
  select count(*) into n from valuations; assert n = 3, format('A5 maklér Ružomberok vidí %s ocenení (čakané 3: f001, f002, f003)', n);
  update mandates set title = 'hack' where id = m2; get diagnostics n = row_count; assert n = 0, 'A6 maklér nezmení cudzí nábor';
  update mandates set title = 'moje' where id = m1; get diagnostics n = row_count; assert n = 1, 'A7 maklér zmení svoj nábor';
  failed := false;
  begin update mandates set financing_status = 'vyriesene' where id = m1; exception when others then failed := true; end;
  assert failed, 'A8 maklér nesmie meniť financovanie priamo';
  failed := false;
  begin perform set_financing_status(m1, 'riesi_sa'); exception when others then failed := true; end;
  assert failed, 'A9 maklér nesmie volať set_financing_status';
  failed := false;
  begin insert into document_templates (code, version, title, format, storage_path, checksum_sha256) values ('x', 1, 'x', 'docx', 'p', 'c'); exception when others then failed := true; end;
  assert failed, 'A10 maklér nesmie zapisovať šablóny';
  failed := false;
  begin insert into audit_log (action, entity) values ('fake', 'x'); exception when others then failed := true; end;
  assert failed, 'A11 maklér nesmie písať do auditu';
  select count(*) into n from audit_log; assert n = 0, 'A12 maklér nečíta audit';
  select count(*) into n from inbound_events; assert n = 0, 'A13 maklér nečíta prijaté udalosti';

  -- B. prevzatie z Nepridelených: limit 1× za 24 h
  perform claim_unassigned('00000000-0000-0000-0000-00000000f001');
  failed := false;
  begin perform claim_unassigned('00000000-0000-0000-0000-00000000f002'); exception when others then failed := true; end;
  assert failed, 'B1 druhé prevzatie v 24 h musí zlyhať';
  perform pg_temp.login(b2);
  failed := false;
  begin perform claim_unassigned('00000000-0000-0000-0000-00000000f001'); exception when others then failed := true; end;
  assert failed, 'B2 už pridelené ocenenie sa nedá prevziať';
  failed := false;
  begin perform claim_unassigned('00000000-0000-0000-0000-00000000f004'); exception when others then failed := true; end;
  assert failed, 'B3 maklér z Ružomberka si nevezme ocenenie z Martina (bez zálohy)';
  perform claim_unassigned('00000000-0000-0000-0000-00000000f003'); -- Dolný Kubín má zálohu v Ružomberku
  select count(*) into n from mandates; assert n = 1, 'B4 maklér 2 vidí len svoj nábor';
  perform pg_temp.login(b3);
  select count(*) into n from valuations; assert n = 1, format('B5 maklér Martin vidí %s ocenení (čakané 1: f004)', n);

  -- C. Financie
  perform pg_temp.login(f1);
  select count(*) into n from mandates; assert n = 2, 'C1 financie vidia všetky nábory';
  select count(*) into n from clients; assert n = 0, 'C2 financie nečítajú klientov priamo';
  select count(*) into n from mandate_notes; assert n = 0, 'C3 financie nevidia poznámky makléra';
  select count(*) into n from client_documents; assert n = 0, 'C4 financie nevidia dokumenty klienta';
  select count(*) into n from valuations; assert n = 0, 'C4b financie nevidia ocenenia';
  update mandates set title = 'hack' where id = m1; get diagnostics n = row_count; assert n = 0, 'C5 financie nemenia nábor';
  failed := false;
  begin insert into mandates (client_id, broker_id, title) values (c1, b1, 'x'); exception when others then failed := true; end;
  assert failed, 'C6 financie nevytvoria nábor';
  failed := false;
  begin insert into mandate_notes (mandate_id, author, body) values (m1, f1, 'x'); exception when others then failed := true; end;
  assert failed, 'C7 financie nepíšu poznámky makléra';
  select count(*) into n from finance_view_client(c1); assert n = 1, 'C8 financie vidia kontakt klienta cez funkciu';
  perform set_financing_status(m1, 'priprava');
  perform set_financing_status(m1, 'riesi_sa');
  failed := false;
  begin perform set_financing_status(m1, 'neriesi_sa'); exception when others then failed := true; end;
  assert failed, 'C9 „Nerieši sa“ bez dôvodu musí zlyhať';
  perform set_financing_status(m1, 'neriesi_sa', 'klient nechce');
  select count(*) into n from financing_status_history where mandate_id = m1; assert n = 3, format('C10 história má %s zmien, čakané 3', n);
  insert into financing_notes (mandate_id, author, body) values (m1, f1, 'rieši sa v banke');
  failed := false;
  begin insert into financing_notes (mandate_id, author, body) values (m1, f1, 'x'), (m1, b1, 'cudzí autor'); exception when others then failed := true; end;
  assert failed, 'C11 nemožno písať poznámku pod cudzím menom';

  -- D. maklér vidí financovanie svojho náboru, nie cudzieho
  perform pg_temp.login(b1);
  select count(*) into n from financing_notes; assert n = 1, 'D1 maklér vidí financovanie vlastného náboru';
  select count(*) into n from financing_status_history; assert n = 3, 'D2 maklér vidí históriu svojho náboru';
  select financing_status into txt from mandates where id = m1; assert txt = 'neriesi_sa', 'D3 stav financovania je viditeľný makléri';
  perform pg_temp.login(b2);
  select count(*) into n from financing_notes; assert n = 0, 'D4 maklér 2 nevidí financovanie cudzieho náboru';
  failed := false;
  begin insert into financing_notes (mandate_id, author, body) values (m2, b2, 'x'); exception when others then failed := true; end;
  assert failed, 'D5 maklér nepíše poznámky financovania';

  -- E. prihlásený bez záznamu v staff nesmie nič (null-safe kontrola rolí)
  perform pg_temp.login(e1);
  select count(*) into n from mandates; assert n = 0, 'E1 neznámy používateľ nevidí nábory';
  failed := false;
  begin perform set_financing_status(m1, 'vyriesene'); exception when others then failed := true; end;
  assert failed, 'E2 neznámy používateľ nesmie meniť financovanie';
  failed := false;
  begin perform finance_view_client(c1); exception when others then failed := true; end;
  assert failed, 'E3 neznámy používateľ nesmie čítať kontakt klienta';
  failed := false;
  begin perform claim_unassigned('00000000-0000-0000-0000-00000000f002'); exception when others then failed := true; end;
  assert failed, 'E4 neznámy používateľ si nevezme ocenenie';

  -- F. admin
  perform pg_temp.login(a1);
  select count(*) into n from clients; assert n = 2, 'F1 admin vidí všetkých klientov';
  select count(*) into n from mandates; assert n = 2, 'F2 admin vidí všetky nábory';
  select count(*) into n from valuations; assert n = 5, 'F3 admin vidí všetky ocenenia';
  select count(*) into n from audit_log where action = 'client.read_by_finance' and entity_id = c1::text;
  assert n >= 1, 'F4 prístup Financií ku klientovi je v audite';
  select count(*) into n from audit_log where action = 'valuation.claim'; assert n = 2, format('F5 audit prevzatí: %s, čakané 2 (b1: f001, b2: f003)', n);

  -- G. anonym (verejný kľúč) nevidí nič z CRM
  perform pg_temp.login(null, 'anon');
  select count(*) into n from clients; assert n = 0, 'G1 anonym nevidí klientov';
  select count(*) into n from mandates; assert n = 0, 'G2 anonym nevidí nábory';
  select count(*) into n from valuations; assert n = 0, 'G3 anonym nevidí ocenenia';
  select count(*) into n from document_templates; assert n = 0, 'G4 anonym nevidí šablóny';
  select count(*) into n from staff; assert n = 0, 'G5 anonym nevidí zamestnancov';
  select count(*) into n from leads; assert n = 0, 'G6 anonym nečíta leady';
  failed := false;
  begin perform set_financing_status(m1, 'vyriesene'); exception when others then failed := true; end;
  assert failed, 'G7 anonym nesmie volať funkcie CRM';
  failed := false;
  begin perform 1 from comparables limit 1; exception when others then failed := true; end;
  assert failed, 'G8 pohľad comparables nie je verejný (Supabase: Security Definer View)';

  -- H. servisný kľúč (server) číta comparables
  perform pg_temp.login(null, 'service_role');
  perform 1 from comparables limit 1;

  perform pg_temp.logout();
  raise notice 'VŠETKY TESTY PRESLI';
end $$;

rollback;
