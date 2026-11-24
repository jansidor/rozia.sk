-- ŠABLÓNA na založenie skutočných zamestnancov (produkcia aj staging). NEUKLADAJ do repa vyplnenú s reálnymi menami a e-mailami.
-- Postup: 1) v Supabase Authentication → Users → Add user vytvor účet (e-mail a heslo; „Auto Confirm User“),
--         2) skopíruj tento súbor mimo repa, vyplň riadky nižšie a spusti v SQL Editore.
-- Role: 'broker' (maklér), 'admin', 'finance' (financie). Pobočky musia existovať (supabase/seed/branches.sql).
-- E-mail v zozname musí byť rovnaký ako v Authentication. Idempotentné: opakované spustenie aktualizuje rolu, pobočku a meno.
insert into staff (id, branch_id, role, full_name, email)
select u.id, (select id from branches where name = v.branch), v.role, v.full_name, u.email
  from auth.users u
  join (values
    -- ('e-mail@firma.sk',  'broker',  'Meno Priezvisko', 'Ružomberok'),
    -- ('e-mail@firma.sk',  'admin',   'Meno Priezvisko', 'Ružomberok'),
    -- ('e-mail@firma.sk',  'finance', 'Meno Priezvisko', null)
    ('placeholder@example.invalid', 'broker', 'Odstráňte tento riadok', 'Ružomberok')
  ) as v(email, role, full_name, branch) on lower(v.email) = lower(u.email)
on conflict (id) do update
  set role = excluded.role, full_name = excluded.full_name, branch_id = excluded.branch_id, email = excluded.email, active = true;

-- Kontrola: každý riadok z vyššie uvedeného zoznamu sa musí objaviť (ak chýba, účet v Authentication ešte neexistuje).
select s.email, s.role, b.name as pobocka, s.active from staff s left join branches b on b.id = s.branch_id order by s.role, s.email;

-- Neprítomnosť / neaktívny účet:
--   update staff set availability = 'away', away_until = '2026-12-31' where email = '...';   -- dovolenka alebo PN
--   update staff set active = false where email = '...';                                      -- odchod z firmy (účet sa tým zablokuje v CRM)
