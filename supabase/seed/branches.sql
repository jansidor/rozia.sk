-- Pobočky a ich okresy. Bezpečné aj na produkcii (idempotentné, nemaže nič). Názvy pobočiek sa dajú neskôr zmeniť v aplikácii.
-- Záložná pobočka: nepridelené ocenenia z Dolného Kubína a Martina ponúkne Ružomberku.
insert into branches (name, city, is_fallback) values
  ('Ružomberok', 'Ružomberok', true),
  ('Liptovský Mikuláš', 'Liptovský Mikuláš', false),
  ('Dolný Kubín', 'Dolný Kubín', false),
  ('Martin', 'Martin', false)
on conflict (name) do nothing;

update branches set fallback_branch_id = (select id from branches where name = 'Ružomberok')
 where name in ('Dolný Kubín', 'Martin') and fallback_branch_id is null;

insert into branch_districts (branch_id, district)
select b.id, d.district
  from (values
    ('Ružomberok', 'Ružomberok'),
    ('Liptovský Mikuláš', 'Liptovský Mikuláš'),
    ('Dolný Kubín', 'Dolný Kubín'), ('Dolný Kubín', 'Tvrdošín'), ('Dolný Kubín', 'Námestovo'),
    ('Martin', 'Martin'), ('Martin', 'Turčianske Teplice')
  ) as d(branch, district)
  join branches b on b.name = d.branch
on conflict do nothing;

select b.name as pobocka, string_agg(bd.district, ', ' order by bd.district) as okresy
  from branches b left join branch_districts bd on bd.branch_id = b.id group by b.name order by b.name;
