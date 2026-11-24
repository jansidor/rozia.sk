-- Len STAGING: pobočky a testovacie účty (Authentication → Users) s rolami. Idempotentné, dá sa spustiť opakovane.
-- Nepoužívať v produkcii. Predpoklad: účty admin@/makler@/financie@test.rozia.sk existujú (Auto Confirm User).

insert into branches (name, city, is_fallback) values
  ('Ružomberok', 'Ružomberok', true),
  ('Liptovský Mikuláš', 'Liptovský Mikuláš', false),
  ('Dolný Kubín', 'Dolný Kubín', false),
  ('Martin', 'Martin', false)
on conflict (name) do nothing;

-- Záložná pobočka: nepridelené ocenenia z Dolného Kubína a Martina sa ponúknu Ružomberku.
update branches set fallback_branch_id = (select id from branches where name = 'Ružomberok')
 where name in ('Dolný Kubín', 'Martin');

insert into staff (id, branch_id, role, full_name, email)
select u.id, (select id from branches where name = 'Ružomberok'), v.role, v.full_name, u.email
  from auth.users u
  join (values
    ('admin@test.rozia.sk',    'admin',   'Testovací admin'),
    ('makler@test.rozia.sk',   'broker',  'Testovací maklér'),
    ('financie@test.rozia.sk', 'finance', 'Testovacie financie')
  ) as v(email, role, full_name) on v.email = u.email
on conflict (id) do update
  set role = excluded.role, full_name = excluded.full_name, branch_id = excluded.branch_id, active = true;

-- Kontrola: musia vyjsť 3 riadky.
select s.email, s.role, b.name as pobocka from staff s left join branches b on b.id = s.branch_id order by s.role;
