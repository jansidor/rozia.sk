-- Testy k migrácii 0005 (archív a obnovenie náboru, anonymizácia, vrátený klient, pridelenie, návrh dokumentov, číselník obcí).
-- Spúšťa sa PO 0005. Všetko beží v transakcii a vráti sa (ROLLBACK). Úspech = výsledok "VŠETKY TESTY 0005 PRESLI".
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
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test'), ('00000000-0000-0000-0000-0000000000b1', 'b1@test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test'), ('00000000-0000-0000-0000-0000000000b4', 'b4@test'),
  ('00000000-0000-0000-0000-0000000000b5', 'b5@test'), ('00000000-0000-0000-0000-0000000000f1', 'f1@test');
insert into branches (id, name, city, is_fallback) values ('00000000-0000-0000-0000-00000000c001', 'T3-Ružomberok', 'Ružomberok', true);
insert into branches (id, name, city, fallback_branch_id) values
  ('00000000-0000-0000-0000-00000000c002', 'T3-Dolný Kubín', 'Dolný Kubín', '00000000-0000-0000-0000-00000000c001');
insert into staff (id, branch_id, role, full_name, email, availability, away_until) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test', 'available', null),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test', 'available', null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 2', 'b2@test', 'available', null),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-00000000c002', 'broker', 'Maklér 4 (DK)', 'b4@test', 'available', null),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 5 (preč)', 'b5@test', 'away', current_date + 5),
  ('00000000-0000-0000-0000-0000000000f1', null, 'finance', 'Financie', 'f1@test', 'available', null);

-- číselník: vlastné obce testu (nezávisle od seedu pobočiek)
insert into municipalities (name, district) values ('Testovo', 'T3-Okres-A'), ('Skúšobná Lehota', 'T3-Okres-B'), ('Duplikovo', 'T3-Okres-A'), ('Duplikovo', 'T3-Okres-B');
insert into branch_districts (branch_id, district) values
  ('00000000-0000-0000-0000-00000000c001', 'T3-Okres-A'), ('00000000-0000-0000-0000-00000000c002', 'T3-Okres-B');

-- klienti
insert into clients (id, owner_id, branch_id, full_name, phone, email, address) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Stary Klient', '0905 111 111', 'old@x.sk', 'Hlavná 5'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Druhy Klient', '0905 222 222', 'k2@x.sk', null),
  ('00000000-0000-0000-0000-00000000d003', null, null, 'Novy Klient', '+421 905 111 111', 'new@x.sk', null),
  ('00000000-0000-0000-0000-00000000d004', null, null, 'Cudzi Klient', '0911 000 000', 'cudzi@x.sk', null);

-- ocenenia
insert into valuations (id, branch_id, assigned_to, status, client_id, property_type, city_slug, area_m2, estimate_low, estimate_high, payload) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b1', 'pridelene',
   '00000000-0000-0000-0000-00000000d001', 'Byt', 'martin', 60, 100000, 120000, '{"adresa":"Hlavná 5"}'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b1', 'pridelene',
   '00000000-0000-0000-0000-00000000d002', 'Byt', 'martin', 50, 90000, 100000, '{"adresa":"Ulica 1"}'),
  -- nové ocenenie vráteného klienta (podobná nehnuteľnosť), pridelené maklérovi 2
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b2', 'pridelene',
   '00000000-0000-0000-0000-00000000d003', 'byt', 'martin', 62, 105000, 125000, '{"adresa":"Hlavna 5"}'),
  -- nové ocenenie od klienta s iným telefónom/e-mailom (nesúvisí)
  ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b2', 'pridelene',
   '00000000-0000-0000-0000-00000000d004', 'Byt', 'martin', 62, 105000, 125000, '{}');
-- nepridelené (pre pridelenie)
insert into valuations (id, branch_id, status, property_type, city_slug) values
  ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-00000000c002', 'nepridelene', 'Byt', 'dolny-kubin'),
  ('00000000-0000-0000-0000-00000000f202', '00000000-0000-0000-0000-00000000c002', 'nepridelene', 'Byt', 'dolny-kubin'),
  ('00000000-0000-0000-0000-00000000f203', '00000000-0000-0000-0000-00000000c002', 'nepridelene', 'Byt', 'dolny-kubin'),
  ('00000000-0000-0000-0000-00000000f204', '00000000-0000-0000-0000-00000000c002', 'nepridelene', 'Byt', 'dolny-kubin'),
  ('00000000-0000-0000-0000-00000000f205', null, 'nepridelene', 'Byt', null),
  ('00000000-0000-0000-0000-00000000f206', '00000000-0000-0000-0000-00000000c001', 'nepridelene', 'Byt', 'ruzomberok');

-- nábory
insert into mandates (id, client_id, valuation_id, broker_id, branch_id, title, property_type, area_m2, asking_price, address, status, archived_at, archive_reason) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000f001',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Byt Hlavná', 'Byt', 60, 110000, 'Hlavná 5', 'aktivny', null, null),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000f002',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Byt Ulica', 'Byt', 50, 95000, 'Ulica 1', 'aktivny', null, null);
insert into mandates (id, client_id, broker_id, branch_id, title, property_type, transaction, status, archived_at, archive_reason, address) values
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-00000000c001', 'Starý nábor klienta 2', 'Dom', 'predaj', 'nedohodnuty', now() - interval '30 months', 'cena', 'Stará 9'),
  ('00000000-0000-0000-0000-00000000e004', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-00000000c001', 'Čerstvo archivovaný', 'Byt', 'predaj', 'nedohodnuty', now() - interval '3 months', 'cena', 'Nová 3');
insert into mandate_notes (mandate_id, author, body) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b1', 'poznámka'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000000b1', 'stará poznámka s osobnými údajmi');
insert into client_documents (id, client_id, mandate_id, template_code, template_version, storage_path, status) values
  ('00000000-0000-0000-0000-0000000d0c01', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000e001', 'zmluva', 1, 'x/navrh.docx', 'navrh'),
  ('00000000-0000-0000-0000-0000000d0c02', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000e001', 'zmluva', 1, 'x/hotovy.docx', 'skontrolovany'),
  ('00000000-0000-0000-0000-0000000d0c03', '00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000e003', 'zmluva', 1, 'x/stary.docx', 'skontrolovany');

do $$
declare
  a1 constant uuid := '00000000-0000-0000-0000-0000000000a1'; b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
  b2 constant uuid := '00000000-0000-0000-0000-0000000000b2'; b4 constant uuid := '00000000-0000-0000-0000-0000000000b4';
  b5 constant uuid := '00000000-0000-0000-0000-0000000000b5'; f1 constant uuid := '00000000-0000-0000-0000-0000000000f1';
  d1 constant uuid := '00000000-0000-0000-0000-00000000d001'; d2 constant uuid := '00000000-0000-0000-0000-00000000d002';
  d3 constant uuid := '00000000-0000-0000-0000-00000000d003'; d4 constant uuid := '00000000-0000-0000-0000-00000000d004';
  m1 constant uuid := '00000000-0000-0000-0000-00000000e001'; m2 constant uuid := '00000000-0000-0000-0000-00000000e002';
  m3 constant uuid := '00000000-0000-0000-0000-00000000e003'; m4 constant uuid := '00000000-0000-0000-0000-00000000e004';
  v1 constant uuid := '00000000-0000-0000-0000-00000000f001'; vn constant uuid := '00000000-0000-0000-0000-00000000f101';
  vx constant uuid := '00000000-0000-0000-0000-00000000f102';
  u1 constant uuid := '00000000-0000-0000-0000-00000000f201'; u2 constant uuid := '00000000-0000-0000-0000-00000000f202';
  u3 constant uuid := '00000000-0000-0000-0000-00000000f203'; u4 constant uuid := '00000000-0000-0000-0000-00000000f204';
  u5 constant uuid := '00000000-0000-0000-0000-00000000f205'; u6 constant uuid := '00000000-0000-0000-0000-00000000f206';
  n int; txt text; failed boolean; r record; res jsonb; num numeric; tgt uuid;
begin
  -- N. práva: interné funkcie nie sú volateľné zvonka
  assert not has_function_privilege('authenticated', 'anonymize_archived(int)', 'execute'), 'N1 anonymizáciu spúšťa len server';
  assert not has_function_privilege('authenticated', 'auto_assign_valuation(uuid)', 'execute'), 'N2 automatické pridelenie len server';
  assert not has_function_privilege('authenticated', 'pick_broker(uuid)', 'execute'), 'N3 pomocné funkcie sú interné';
  assert not has_function_privilege('authenticated', 'property_similarity(jsonb,jsonb)', 'execute'), 'N4 pomocné funkcie sú interné';
  assert not has_function_privilege('anon', 'close_mandate_unagreed(uuid,text)', 'execute'), 'N5 anon nevolá funkcie CRM';
  assert not has_function_privilege('anon', 'branch_for_municipality(text,text)', 'execute'), 'N6 anon nevolá funkcie CRM';
  assert has_function_privilege('service_role', 'anonymize_archived(int)', 'execute'), 'N7 server smie anonymizovať';

  -- S. nastavenia
  perform pg_temp.login(b1);
  select count(*) into n from app_settings; assert n >= 3, 'S1 maklér číta nastavenia';
  update app_settings set value = '"round_robin"' where key = 'assignment_mode'; get diagnostics n = row_count;
  assert n = 0, 'S2 maklér nemení nastavenia';
  perform pg_temp.login(f1);
  select count(*) into n from storage_cleanup; assert n = 0, 'S3 front súborov na zmazanie nečíta nikto okrem servera';
  perform pg_temp.login(a1);
  select count(*) into n from storage_cleanup; assert n = 0, 'S4 ani admin';

  -- O. číselník obcí
  perform pg_temp.logout();
  select count(*) into n from municipalities where district in ('Ružomberok', 'Martin', 'Dolný Kubín'); assert n >= 90, 'O1 číselník obsahuje obce okresov';
  select count(*) into n from municipalities where name = 'Vrútky' and district = 'Martin'; assert n = 1, 'O2 Vrútky patria do okresu Martin';
  perform pg_temp.login(b1);
  assert branch_for_municipality('Testovo') = '00000000-0000-0000-0000-00000000c001', 'O3 obec → pobočka';
  assert branch_for_municipality('skusobna lehota') = '00000000-0000-0000-0000-00000000c002', 'O4 diakritika a veľkosť písmen nevadia';
  assert branch_for_municipality('Neexistuje') is null, 'O5 neznáma obec = null';
  assert branch_for_municipality('Duplikovo') is null, 'O6 obec v dvoch pobočkách je nejednoznačná = null';
  assert branch_for_municipality('Duplikovo', 'T3-Okres-B') = '00000000-0000-0000-0000-00000000c002', 'O7 s okresom je jednoznačná';

  -- P. pridelenie (fáza 1, ručne admin)
  perform pg_temp.login(b1);
  failed := false;
  begin perform assign_valuation(u1, b4); exception when others then failed := true; end;
  assert failed, 'P1 maklér neprideľuje';
  perform pg_temp.login(a1);
  perform assign_valuation(u1, b4, 'test');
  select count(*) into n from valuations where id = u1 and assigned_to = b4 and status = 'pridelene'; assert n = 1, 'P2 admin pridelil ocenenie';
  select count(*) into n from handoffs where valuation_id = u1 and to_staff = b4; assert n = 1, 'P3 pridelenie je v histórii';
  select count(*) into n from audit_log where action = 'valuation.assign'; assert n = 1, 'P4 pridelenie je v audite';
  failed := false;
  begin perform assign_valuation(u2, b5); exception when others then failed := true; end;
  assert failed, 'P5 neprítomnému sa neprideľuje';
  failed := false;
  begin perform assign_valuation(u2, f1); exception when others then failed := true; end;
  assert failed, 'P6 financiám sa neprideľuje';
  perform pg_temp.login(f1);
  failed := false;
  begin perform assign_valuation(u2, b1); exception when others then failed := true; end;
  assert failed, 'P7 financie neprideľujú';

  -- R. automatické striedanie (fáza 2)
  perform pg_temp.logout();
  update valuations set assigned_at = now() - interval '2 days' where id = v1;           -- b1 dostal ocenenie pred 2 dňami
  perform pg_temp.login(null, 'service_role');
  assert auto_assign_valuation(u2) is null, 'R1 v režime manual sa nepridelí nič';
  perform pg_temp.logout();
  update app_settings set value = '"round_robin"' where key = 'assignment_mode';
  perform pg_temp.login(b1);
  failed := false;
  begin perform auto_assign_valuation(u2); exception when others then failed := true; end;
  assert failed, 'R2 maklér nespustí automatické pridelenie';
  perform pg_temp.login(null, 'service_role');
  tgt := auto_assign_valuation(u2);
  assert tgt = b4, format('R3 pobočka DK má jediného dostupného makléra, dostal %s', tgt);
  perform pg_temp.logout();
  update staff set availability = 'away', away_until = current_date + 3 where id = b4;     -- b4 preč, DK nemá nikoho
  perform pg_temp.login(null, 'service_role');
  tgt := auto_assign_valuation(u3);
  assert tgt = b2, format('R4 záloha Ružomberok: najstaršie pridelenie má b2 (nikdy nedostal), dostal %s', tgt);
  tgt := auto_assign_valuation(u4);
  assert tgt = b1, format('R5 potom striedanie: b1 má staršie pridelenie než b2, dostal %s', tgt);
  assert auto_assign_valuation(u5) is null, 'R6 ocenenie bez pobočky ostane nepridelené';
  assert auto_assign_valuation(u3) is null, 'R7 už pridelené sa nepridelí znova';
  perform pg_temp.logout();
  update staff set availability = 'away', away_until = current_date - 1 where id = b5;     -- neprítomnosť b5 už skončila
  update valuations set assigned_at = now() where assigned_to in (b1, b2);
  perform pg_temp.login(null, 'service_role');
  tgt := auto_assign_valuation(u6);
  assert tgt = b5, format('R8 maklér s uplynutou neprítomnosťou je opäť dostupný a nikdy nedostal, dostal %s', tgt);
  perform pg_temp.logout();
  update app_settings set value = '"manual"' where key = 'assignment_mode';
  select count(*) into n from audit_log where action = 'valuation.auto_assign'; assert n = 4, format('R9 audit automatických pridelení: %s, čakané 4', n);

  -- A. archív a obnovenie náboru
  perform pg_temp.login(b2);
  failed := false;
  begin perform close_mandate_unagreed(m1, 'cena'); exception when others then failed := true; end;
  assert failed, 'A1 cudzí nábor sa uzavrieť nedá';
  perform pg_temp.login(f1);
  failed := false;
  begin perform close_mandate_unagreed(m1, 'cena'); exception when others then failed := true; end;
  assert failed, 'A2 financie nábor neuzatvárajú';
  perform pg_temp.login(b1);
  failed := false;
  begin perform close_mandate_unagreed(m1, '  '); exception when others then failed := true; end;
  assert failed, 'A3 bez dôvodu sa nábor neuzavrie';
  perform close_mandate_unagreed(m1, 'klient predáva sám');
  select status into txt from mandates where id = m1; assert txt = 'nedohodnuty', 'A4 nábor je nedohodnutý';
  select count(*) into n from mandates where id = m1 and archived_at is not null and archive_reason = 'klient predáva sám'; assert n = 1, 'A5 dátum a dôvod sú uložené';
  select count(*) into n from client_documents where mandate_id = m1; assert n = 1, 'A6 rozpracovaný dokument sa zmazal, hotový ostal';
  select status into txt from valuations where id = v1; assert txt = 'archiv', 'A7 ocenenie je archivované';
  select count(*) into n from clients where id = d1 and full_name = 'Stary Klient' and phone = '0905 111 111'; assert n = 1, 'A8 kontakt klienta ostal na dosah';
  failed := false;
  begin perform close_mandate_unagreed(m1, 'znova'); exception when others then failed := true; end;
  assert failed, 'A9 nedohodnutý nábor sa neuzatvára druhýkrát';
  perform pg_temp.logout();
  select count(*) into n from storage_cleanup where path = 'x/navrh.docx'; assert n = 1, 'A10 súbor rozpracovaného dokumentu je vo fronte na zmazanie';
  perform pg_temp.login(b2);
  failed := false;
  begin perform restore_mandate(m1); exception when others then failed := true; end;
  assert failed, 'A11 cudzí nábor sa obnoviť nedá';
  perform pg_temp.login(b1);
  perform restore_mandate(m1);
  select status into txt from mandates where id = m1; assert txt = 'aktivny', 'A12 nábor je obnovený';
  select status into txt from valuations where id = v1; assert txt = 'pridelene', 'A13 ocenenie je späť pridelené';
  failed := false;
  begin perform restore_mandate(m1); exception when others then failed := true; end;
  assert failed, 'A14 aktívny nábor sa neobnovuje';
  perform pg_temp.login(a1);
  select count(*) into n from audit_log where action in ('mandate.unagreed', 'mandate.restored'); assert n = 2, 'A15 archivovanie a obnova sú v audite';

  -- G. anonymizácia po retencii
  perform pg_temp.login(b1);
  failed := false;
  begin perform anonymize_archived(); exception when others then failed := true; end;
  assert failed, 'G1 maklér nespustí anonymizáciu';
  perform pg_temp.login(null, 'service_role');
  n := anonymize_archived();
  assert n = 1, format('G2 anonymizoval sa len nábor starší ako 24 mesiacov (čakané 1, bolo %s)', n);
  perform pg_temp.logout();
  select count(*) into n from mandates where id = m3 and anonymized_at is not null and address is null and title = 'Anonymizovaný nábor'; assert n = 1, 'G3 nábor je anonymizovaný';
  select count(*) into n from mandates where id = m4 and anonymized_at is null and address = 'Nová 3'; assert n = 1, 'G4 čerstvo archivovaný nábor ostal';
  select count(*) into n from mandate_notes where mandate_id = m3; assert n = 0, 'G5 poznámky anonymizovaného náboru sú zmazané';
  select count(*) into n from client_documents where mandate_id = m3; assert n = 0, 'G6 dokumenty anonymizovaného náboru sú zmazané';
  select count(*) into n from storage_cleanup where path = 'x/stary.docx'; assert n = 1, 'G7 súbor je vo fronte na zmazanie';
  select count(*) into n from clients where id = d2 and anonymized_at is null and phone = '0905 222 222'; assert n = 1, 'G8 klient s iným aktívnym nábor-om ostal nedotknutý';
  select count(*) into n from mandate_notes where mandate_id = m1; assert n = 1, 'G9 poznámky aktívneho náboru ostali';
  -- klient bez iného náboru sa anonymizuje
  update mandates set status = 'nedohodnuty', archived_at = now() - interval '25 months' where id = m2;
  update mandates set anonymized_at = now() where id = m3;
  perform pg_temp.login(null, 'service_role');
  n := anonymize_archived(24);
  perform pg_temp.logout();
  select count(*) into n from clients where id = d2 and anonymized_at is not null and phone is null and email is null and full_name = 'Anonymizovaný klient';
  assert n = 1, 'G10 klient bez iného náboru je anonymizovaný';
  perform pg_temp.login(a1);
  failed := false;
  begin perform restore_mandate(m2); exception when others then failed := true; end;
  assert failed, 'G11 anonymizovaný nábor sa obnoviť nedá';

  -- V. vrátený klient
  perform pg_temp.logout();
  update mandates set status = 'nedohodnuty', archived_at = now() - interval '2 months', archive_reason = 'cena' where id = m1;
  update valuations set status = 'archiv' where id = v1;
  perform pg_temp.login(b1);
  failed := false;
  begin perform * from returning_client_check(vn); exception when others then failed := true; end;
  assert failed, 'V1 maklér, ktorému ocenenie nepatrí, nevidí kandidátov';
  perform pg_temp.login(b2);
  select * into r from returning_client_check(vn) where client_id = d1;
  assert found, 'V2 vrátený klient sa našiel podľa telefónu (rôzny zápis čísla)';
  assert r.is_match and r.score = 1, format('V3 podobná nehnuteľnosť, skóre %s', r.score);
  assert r.mandate_id = m1 and r.mandate_status = 'nedohodnuty' and r.previous_owner = 'Maklér 1', 'V4 súhrn predošlého náboru';
  assert r.changes ? 'area_m2' and r.changes ? 'price' and not (r.changes ? 'city_slug'), format('V5 zmeny: %s', r.changes);
  assert (r.changes -> 'area_m2' ->> 'old')::numeric = 60 and (r.changes -> 'area_m2' ->> 'new')::numeric = 62, 'V6 zmena výmery old → new';
  select count(*) into n from returning_client_check(vn) where client_id = d4; assert n = 0, 'V7 cudzí klient sa nenájde';
  select * into r from returning_client_check(vx); assert not found, 'V8 klient bez zhody nemá kandidátov';
  -- nepodobná nehnuteľnosť (iný typ, obec, výmera) sa nezhoduje
  perform pg_temp.logout();
  update valuations set property_type = 'Dom', city_slug = 'ruzomberok', area_m2 = 140, payload = '{"adresa":"Iná 7"}' where id = vn;
  perform pg_temp.login(b2);
  select * into r from returning_client_check(vn) where client_id = d1;
  assert r.score < 0.8 and not r.is_match, format('V9 iná nehnuteľnosť sa nezhoduje (skóre %s)', r.score);
  perform pg_temp.logout();
  update valuations set property_type = 'byt', city_slug = 'martin', area_m2 = 62, payload = '{"adresa":"Hlavna 5"}' where id = vn;
  perform pg_temp.login(b2);
  failed := false;
  begin perform link_returning_client(vn, d4); exception when others then failed := true; end;
  assert failed, 'V10 nemožno prepojiť s klientom, ktorý nemá rovnaký kontakt';
  failed := false;
  begin perform link_returning_client(vn, d1, m2); exception when others then failed := true; end;
  assert failed, 'V11 obnovený nábor musí patriť tomu istému klientovi (m2 patrí inému)';
  perform pg_temp.logout();
  update mandates set anonymized_at = now() where id = m4;
  perform pg_temp.login(b2);
  failed := false;
  begin perform link_returning_client(vn, d1, m4); exception when others then failed := true; end;
  assert failed, 'V12 anonymizovaný nábor sa neobnoví';
  perform pg_temp.logout();
  update mandates set anonymized_at = null where id = m4;
  perform pg_temp.login(b2);
  res := link_returning_client(vn, d1, m1);
  assert (res ->> 'restored_mandate')::uuid = m1 and res -> 'changes' ? 'area_m2', format('V13 výsledok prepojenia: %s', res);
  perform pg_temp.logout();
  select count(*) into n from mandates where id = m1 and status = 'aktivny' and broker_id = b2 and valuation_id = vn and area_m2 = 62 and archived_at is null; assert n = 1, 'V14 nábor je obnovený, patrí makléra 2 a má nové údaje';
  select count(*) into n from clients where id = d1 and owner_id = b2; assert n = 1, 'V15 klient prešiel na makléra 2';
  select count(*) into n from valuations where id = vn and client_id = d1; assert n = 1, 'V16 ocenenie je prepojené so starým klientom';
  select count(*) into n from clients where id = d3; assert n = 0, 'V17 prázdny nový záznam klienta sa zrušil';
  select count(*) into n from audit_log where action = 'client.returning_linked'; assert n = 1, 'V18 prepojenie je v audite';

  -- D. návrh dokumentov
  insert into mandates (id, client_id, broker_id, branch_id, title, property_type, transaction)
  values ('00000000-0000-0000-0000-00000000e0a1', d4, b1, '00000000-0000-0000-0000-00000000c001', 'Byt predaj', 'Byt', 'predaj'),
         ('00000000-0000-0000-0000-00000000e0a2', d4, b1, '00000000-0000-0000-0000-00000000c001', 'Dom predaj', 'Dom', 'predaj');
  insert into document_templates (code, version, title, format, storage_path, checksum_sha256) values
    ('zmluva-o-sprostredkovani-predaja', 1, 'Zmluva o sprostredkovaní predaja', 'docx', 's/z1.docx', 'c1'),
    ('zmluva-o-sprostredkovani-predaja', 2, 'Zmluva o sprostredkovaní predaja (nová)', 'docx', 's/z2.docx', 'c2');
  insert into document_rules (template_code, requirement, when_cond, position) values
    ('pravidlo-pole', 'odporucana', '{"property_type":["domy","chaty"]}', 20),
    ('pravidlo-neznamy-kluc', 'povinna', '{"vlastnictvo":"spoluvlastnictvo"}', 1);
  perform pg_temp.login(b1);
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a1'); assert n = 4, format('D1 byt predaj: zmluva a 3 prepisy, vrátilo %s', n);
  select template_code into txt from suggest_documents('00000000-0000-0000-0000-00000000e0a1') order by requirement = 'povinna' desc, sort_pos limit 1;
  assert txt = 'zmluva-o-sprostredkovani-predaja', 'D2 zmluva o sprostredkovaní je prvá a povinná';
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a1') where template_code like 'prepis-%' and requirement = 'odporucana' and template_missing; assert n = 3, 'D3 prepisy sú odporúčané a šablóna zatiaľ chýba';
  select title into txt from suggest_documents('00000000-0000-0000-0000-00000000e0a1') where template_code = 'zmluva-o-sprostredkovani-predaja';
  assert txt = 'Zmluva o sprostredkovaní predaja (nová)', 'D4 použije sa najnovšia verzia šablóny';
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a1') where template_code = 'zmluva-o-sprostredkovani-predaja' and not template_missing; assert n = 1, 'D5 šablóna existuje';
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a2'); assert n = 2, format('D6 dom predaj: zmluva a pravidlo s poľom, vrátilo %s', n);
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a2') where template_code = 'pravidlo-neznamy-kluc'; assert n = 0, 'D7 pravidlo s neznámym kľúčom sa nepoužije';
  select count(*) into n from suggest_documents('00000000-0000-0000-0000-00000000e0a2') where template_code like 'prepis-%'; assert n = 0, 'D8 prepisy patria len k bytu';
  perform pg_temp.login(b2);
  failed := false;
  begin perform * from suggest_documents('00000000-0000-0000-0000-00000000e0a1'); exception when others then failed := true; end;
  assert failed, 'D9 cudzí maklér nevidí návrh dokumentov';
  perform pg_temp.login(f1);
  failed := false;
  begin perform * from suggest_documents('00000000-0000-0000-0000-00000000e0a1'); exception when others then failed := true; end;
  assert failed, 'D10 financie nevidia návrh dokumentov';

  -- Z. podobnosť (čisté funkcie)
  perform pg_temp.logout();
  res := property_similarity('{"city_slug":"martin","property_type":"byty","area_m2":60}', '{"city_slug":"martin","property_type":"byty","area_m2":80}');
  assert (res ->> 'score')::numeric = round(0.45 / 0.65, 3), format('Z1 výmera mimo tolerancie znižuje skóre: %s', res);
  res := property_similarity('{"city_slug":"martin"}', '{"property_type":"byty"}');
  assert (res ->> 'score')::numeric = 0, 'Z2 bez spoločných polí je skóre 0';
  assert norm_property_type('Apartmán') = 'apartmany' and norm_property_type('Pozemok') = 'pozemky', 'Z3 normalizácia typov';
  assert norm_phone('+421 905 111 111') = norm_phone('0905111111'), 'Z4 normalizácia telefónu';

  raise notice 'VŠETKY TESTY 0005 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0005 PRESLI' as vysledok;
