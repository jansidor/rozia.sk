-- Testy k migrácii 0004 (práva funkcií, ochrana stĺpcov ocenení, Nepridelené, kontakt Financií, odovzdanie kolegovi).
-- Spúšťa sa PO 0004 a po rls_crm.sql. Všetko beží v transakcii a vráti sa (ROLLBACK). Úspech = výsledok "VŠETKY TESTY 0004 PRESLI".
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
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test'), ('00000000-0000-0000-0000-0000000000e1', 'e1@test'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test');
insert into branches (id, name, city, is_fallback) values ('00000000-0000-0000-0000-00000000c001', 'T-Ružomberok', 'Ružomberok', true);
insert into branches (id, name, city, fallback_branch_id) values
  ('00000000-0000-0000-0000-00000000c002', 'T-Dolný Kubín', 'Dolný Kubín', '00000000-0000-0000-0000-00000000c001');
insert into staff (id, branch_id, role, full_name, email, availability) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001', 'admin', 'Admin', 'a1@test', 'available'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 1', 'b1@test', 'available'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér 2', 'b2@test', 'available'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-00000000c002', 'broker', 'Maklér 4 (DK)', 'b4@test', 'available'),
  ('00000000-0000-0000-0000-0000000000f1', null, 'finance', 'Financie', 'f1@test', 'available'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c001', 'broker', 'Maklér neprítomný', 'c1@test', 'away');
insert into clients (id, owner_id, branch_id, full_name, phone, email) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient 1', '0905 111 111', 'k1@x.sk'),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Klient bez náboru', '0905 333 333', 'k3@x.sk');
insert into valuations (id, branch_id, assigned_to, status, client_id, estimate_low, estimate_high, payload) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b1', 'pridelene',
   '00000000-0000-0000-0000-00000000d001', 100000, 120000, '{"zdroj":"nacenime"}');
insert into valuations (id, branch_id, status) values
  ('00000000-0000-0000-0000-00000000f002', null, 'nepridelene'),                                             -- bez pobočky
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000c002', 'nepridelene');           -- Dolný Kubín (záloha RK)
insert into mandates (id, client_id, valuation_id, broker_id, branch_id, title) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000f001',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000c001', 'Nábor 1');
insert into client_documents (client_id, mandate_id, template_code, template_version, storage_path) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000e001', 'zmluva', 1, 'x/1.docx');

do $$
declare
  a1 constant uuid := '00000000-0000-0000-0000-0000000000a1'; b1 constant uuid := '00000000-0000-0000-0000-0000000000b1';
  b2 constant uuid := '00000000-0000-0000-0000-0000000000b2'; b4 constant uuid := '00000000-0000-0000-0000-0000000000b4';
  f1 constant uuid := '00000000-0000-0000-0000-0000000000f1'; e1 constant uuid := '00000000-0000-0000-0000-0000000000e1';
  c1 constant uuid := '00000000-0000-0000-0000-0000000000c1';
  cl1 constant uuid := '00000000-0000-0000-0000-00000000d001'; cl3 constant uuid := '00000000-0000-0000-0000-00000000d003';
  m1 constant uuid := '00000000-0000-0000-0000-00000000e001';
  v1 constant uuid := '00000000-0000-0000-0000-00000000f001'; v2 constant uuid := '00000000-0000-0000-0000-00000000f002';
  v3 constant uuid := '00000000-0000-0000-0000-00000000f003';
  n int; failed boolean; txt text; num numeric;
begin
  -- N. práva na funkcie (Supabase dáva predvolene priame EXECUTE; tu ho simuluje bootstrap_local.sql)
  assert not has_function_privilege('anon', 'audit(text,text,text,jsonb)', 'execute'), 'N1 anon nesmie volať audit()';
  assert not has_function_privilege('authenticated', 'audit(text,text,text,jsonb)', 'execute'), 'N2 authenticated nesmie volať audit()';
  assert not has_function_privilege('authenticated', 'guard_financing_columns()', 'execute'), 'N3 trigger funkcia nie je volateľná zvonka';
  assert not has_function_privilege('authenticated', 'guard_valuation_columns()', 'execute'), 'N3b trigger funkcia nie je volateľná zvonka';
  assert not has_function_privilege('anon', 'set_financing_status(uuid,text,text)', 'execute'), 'N4 anon nevolá set_financing_status';
  assert not has_function_privilege('anon', 'claim_unassigned(uuid)', 'execute'), 'N5 anon nevolá claim_unassigned';
  assert not has_function_privilege('anon', 'app_role()', 'execute'), 'N5b anon nevolá app_role';
  assert not has_function_privilege('anon', 'handoff_mandate(uuid,uuid,text)', 'execute'), 'N5c anon nevolá odovzdanie';
  assert not has_function_privilege('authenticated', 'handoff_target_ok(uuid)', 'execute'), 'N5d pomocná funkcia je interná';
  assert has_function_privilege('authenticated', 'app_role()', 'execute'), 'N6 authenticated potrebuje app_role() pre politiky';
  assert has_function_privilege('authenticated', 'claim_unassigned(uuid)', 'execute'), 'N7 authenticated smie volať claim_unassigned';
  assert has_function_privilege('service_role', 'audit(text,text,text,jsonb)', 'execute'), 'N8 service role smie audit()';
  -- N9: stráž pre budúce funkcie: žiadna vlastná funkcia v schéme public nie je volateľná anonymom a prihlásený smie len povolené
  select string_agg(p.proname, ', ') into txt from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)   -- trigger funkcie sa zvonka volať nedajú (napr. rls_auto_enable od Supabase)
     and has_function_privilege('anon', p.oid, 'execute');
  assert txt is null, format('N9 anon smie volať: %s', txt);
  select string_agg(p.proname, ', ') into txt from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
     and has_function_privilege('authenticated', p.oid, 'execute')
     and p.proname not in ('app_role', 'app_is_admin', 'app_is_finance', 'app_branch', 'set_financing_status',
                           'finance_view_client', 'claim_unassigned', 'set_my_availability', 'handoff_mandate',
                           'handoff_valuation', 'list_colleagues', 'close_mandate_unagreed', 'restore_mandate',
                           'returning_client_check', 'link_returning_client', 'assign_valuation', 'suggest_documents',
                           'branch_for_municipality');
  assert txt is null, format('N9b prihlásený smie volať aj: %s (ak je to zámer, pridaj do zoznamu v teste)', txt);
  -- anon naozaj nezapíše do auditu
  perform pg_temp.login(null, 'anon');
  failed := false;
  begin perform audit('fake.anon', 'x', '1'); exception when others then failed := true; end;
  assert failed, 'N10 anon nesmie zapisovať do auditu cez rpc';
  perform pg_temp.login(b1);
  failed := false;
  begin perform audit('fake.broker', 'x', '1'); exception when others then failed := true; end;
  assert failed, 'N11 maklér nesmie zapisovať do auditu cez rpc';
  perform pg_temp.logout();
  select count(*) into n from audit_log where action like 'fake.%'; assert n = 0, 'N12 v audite nie sú falošné záznamy';

  -- V. ocenenia: maklér mení len stav a klienta
  perform pg_temp.login(b1);
  failed := false;
  begin update valuations set estimate_low = 1 where id = v1; exception when others then failed := true; end;
  assert failed, 'V1 maklér nezmení odhad';
  failed := false;
  begin update valuations set payload = '{}' where id = v1; exception when others then failed := true; end;
  assert failed, 'V2 maklér nezmení zdrojové údaje';
  failed := false;
  begin update valuations set branch_id = null where id = v1; exception when others then failed := true; end;
  assert failed, 'V3 maklér nezmení pobočku';
  failed := false;
  begin update valuations set assigned_to = b2 where id = v1; exception when others then failed := true; end;
  assert failed, 'V4 maklér nepridelí ocenenie inému priamym zápisom';
  failed := false;
  begin update valuations set status = 'nepridelene' where id = v1; exception when others then failed := true; end;
  assert failed, 'V5 maklér nevráti ocenenie do Nepridelených priamym zápisom';
  update valuations set status = 'archiv' where id = v1; get diagnostics n = row_count; assert n = 1, 'V6 maklér smie archivovať svoje ocenenie';
  select estimate_low into num from valuations where id = v1; assert num = 100000, 'V7 odhad ostal nezmenený';
  perform pg_temp.login(a1);
  update valuations set estimate_low = 90000, branch_id = '00000000-0000-0000-0000-00000000c002' where id = v1;
  select estimate_low into num from valuations where id = v1; assert num = 90000, 'V8 admin smie meniť všetko';

  -- P. Nepridelené: ocenenie bez pobočky vidia a berú všetci makléri, záloha pobočky platí
  perform pg_temp.login(b1);
  select count(*) into n from valuations where status = 'nepridelene'; assert n = 2, format('P1 maklér RK vidí %s nepridelených (čakané 2: bez pobočky + DK so zálohou)', n);
  perform pg_temp.login(b4);
  select count(*) into n from valuations where status = 'nepridelene'; assert n = 2, format('P2 maklér DK vidí %s nepridelených (čakané 2: bez pobočky + vlastná)', n);
  perform pg_temp.login(f1);
  select count(*) into n from valuations; assert n = 0, 'P3 financie nevidia ocenenia';
  perform pg_temp.login(b2);
  perform claim_unassigned(v2);
  select assigned_to into txt from valuations where id = v2; assert txt = b2::text, 'P4 maklér prevzal ocenenie bez pobočky';
  failed := false;
  begin perform claim_unassigned(v3); exception when others then failed := true; end;
  assert failed, 'P5 limit 1× za 24 h platí aj pri ocenení bez pobočky';
  perform pg_temp.login(e1);
  select count(*) into n from valuations; assert n = 0, 'P6 používateľ bez záznamu v staff nevidí ocenenia';

  -- F. Financie: kontakt len klienta s náborom
  perform pg_temp.login(f1);
  select count(*) into n from finance_view_client(cl1); assert n = 1, 'F1 financie vidia kontakt klienta s náborom';
  failed := false;
  begin perform finance_view_client(cl3); exception when others then failed := true; end;
  assert failed, 'F2 financie nevidia kontakt klienta bez náboru';
  perform pg_temp.login(a1);
  select count(*) into n from audit_log where action = 'client.read_by_finance' and entity_id = cl1::text; assert n = 1, 'F3 prístup je v audite';

  -- H. odovzdanie kolegovi
  perform pg_temp.login(b2);
  failed := false;
  begin perform handoff_mandate(m1, b4); exception when others then failed := true; end;
  assert failed, 'H1 maklér nemôže odovzdať cudzí nábor';
  perform pg_temp.login(b1);
  failed := false;
  begin perform handoff_mandate(m1, b1); exception when others then failed := true; end;
  assert failed, 'H2 nie je možné odovzdať sebe';
  failed := false;
  begin perform handoff_mandate(m1, f1); exception when others then failed := true; end;
  assert failed, 'H3 cieľom nemôžu byť financie';
  failed := false;
  begin perform handoff_mandate(m1, c1); exception when others then failed := true; end;
  assert failed, 'H4 cieľom nemôže byť neprítomný maklér';
  failed := false;
  begin perform handoff_mandate(m1, e1); exception when others then failed := true; end;
  assert failed, 'H5 cieľom nemôže byť neexistujúci zamestnanec';
  select count(*) into n from list_colleagues(); assert n = 3, format('H6 maklér vidí %s kolegov (čakané 3: b2, b4, neprítomný)', n);
  select count(*) into n from list_colleagues() where availability = 'away'; assert n = 1, 'H7 zoznam ukazuje dostupnosť';
  perform handoff_mandate(m1, b4, 'dovolenka');                    -- do inej pobočky (Dolný Kubín)
  select count(*) into n from mandates; assert n = 0, 'H8 pôvodný maklér nábor už nevidí';
  select count(*) into n from clients where id = cl1; assert n = 0, 'H9 ani jeho klienta';
  select count(*) into n from client_documents; assert n = 0, 'H10 ani dokumenty klienta';
  perform pg_temp.login(b4);
  select count(*) into n from mandates where id = m1; assert n = 1, 'H11 nový maklér nábor vidí';
  select count(*) into n from clients where id = cl1; assert n = 1, 'H12 aj klienta';
  select count(*) into n from client_documents; assert n = 1, 'H13 aj dokumenty klienta';
  select branch_id into txt from mandates where id = m1; assert txt = '00000000-0000-0000-0000-00000000c002', 'H14 nábor prešiel pod pobočku nového makléra';
  perform pg_temp.login(a1);
  select count(*) into n from handoffs where mandate_id = m1 and from_staff = b1 and to_staff = b4; assert n = 1, 'H15 odovzdanie je zaznamenané';
  select count(*) into n from audit_log where action = 'mandate.handoff'; assert n = 1, 'H16 odovzdanie je v audite';
  perform handoff_mandate(m1, b2);                                  -- admin odovzdá ľubovoľný nábor
  select broker_id into txt from mandates where id = m1; assert txt = b2::text, 'H17 admin odovzdá ľubovoľný nábor';
  -- odovzdanie samotného ocenenia
  perform pg_temp.login(b2);
  perform handoff_valuation(v2, b1);
  select count(*) into n from valuations where id = v2; assert n = 0, 'H18a pôvodný maklér ocenenie už nevidí';
  perform pg_temp.login(b1);
  select count(*) into n from valuations where id = v2 and assigned_to = b1; assert n = 1, 'H18 ocenenie odovzdané a nový maklér ho vidí';
  perform pg_temp.login(b2);
  failed := false;
  begin perform handoff_valuation(v3, b1); exception when others then failed := true; end;
  assert failed, 'H19 nepridelené ocenenie sa neodovzdáva (berie sa cez Vziať si)';
  perform pg_temp.login(f1);
  failed := false;
  begin perform handoff_mandate(m1, b1); exception when others then failed := true; end;
  assert failed, 'H20 financie neodovzdávajú nábory';
  failed := false;
  begin perform list_colleagues(); exception when others then failed := true; end;
  assert failed, 'H21 financie nečítajú zoznam kolegov';

  -- D. dostupnosť
  perform pg_temp.login(b1);
  perform set_my_availability('away', current_date + 7);
  select availability into txt from staff where id = b1; assert txt = 'away', 'D1 maklér si nastaví neprítomnosť';
  failed := false;
  begin perform set_my_availability('inactive'); exception when others then failed := true; end;
  assert failed, 'D2 maklér si nenastaví „neaktívny“ (to robí admin)';
  perform pg_temp.login(b2);
  select count(*) into n from list_colleagues() where id = b1 and availability = 'away'; assert n = 1, 'D3 kolegovia vidia neprítomnosť';
  perform set_my_availability('away');
  perform pg_temp.login(a1);
  failed := false;
  begin perform handoff_valuation(v2, b2); exception when others then failed := true; end;
  assert failed, 'D4 neprítomnému sa neodovzdáva ani adminom';

  perform pg_temp.logout();
  raise notice 'VŠETKY TESTY 0004 PRESLI';
end $$;

rollback;

select 'VŠETKY TESTY 0004 PRESLI' as vysledok;
