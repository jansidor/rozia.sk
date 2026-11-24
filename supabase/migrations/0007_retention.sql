-- Rozia CRM – 0007: uchovávanie údajov podľa zverejnených zásad ochrany osobných údajov.
-- Zásady sľubujú: lead z nacenime, ktorý neprerástol do spolupráce, najviac 24 mesiacov od zadania; nedohodnutý nábor 24 mesiacov od ukončenia
-- (0005, anonymize_archived); technické kópie prijatých žiadostí 30 dní (0006, scrub_inbound_events); formuláre webu rozia.sk 12 mesiacov;
-- záznamy o prístupe a zmenách 36 mesiacov. Táto migrácia dopĺňa chýbajúce časti a jednu funkciu run_retention(), ktorú denne spúšťa server.
-- Všetky funkcie sú len pre server (service role). Bezpečné spustiť opakovane.

insert into app_settings (key, value) values
  ('lead_retention_months', '24'),
  ('web_lead_retention_months', '12'),
  ('audit_retention_months', '36'),
  ('inbound_scrub_days', '30')
on conflict (key) do nothing;

-- Lead z nacenime, ktorý neprerástol do spolupráce: klient bez živého náboru (nábor, ktorý ešte nie je anonymizovaný, sa riadi archívom),
-- ktorého všetky ocenenia aj záznam sú staršie ako N mesiacov. Klient sa anonymizuje, ocenenie ostane len ako štatistika (bez adresy a poznámok).
create or replace function anonymize_stale_leads(p_months int default null) returns int
  language plpgsql security definer set search_path = public as
$$
declare months int := coalesce(p_months, setting_num('lead_retention_months', 24)::int); c clients; n int := 0;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  for c in
    select k.* from clients k
     where k.source = 'nacenime' and k.anonymized_at is null
       and k.created_at < now() - make_interval(months => months)
       and not exists (select 1 from mandates m where m.client_id = k.id and m.anonymized_at is null)
       and not exists (select 1 from client_documents d where d.client_id = k.id)
       and not exists (select 1 from valuations v where v.client_id = k.id and v.created_at >= now() - make_interval(months => months))
     for update
  loop
    update valuations set payload = '{}', status = 'archiv' where client_id = c.id;
    update clients set full_name = 'Anonymizovaný klient', phone = null, email = null, address = null, birth_date = null,
           anonymized_at = now(), updated_at = now() where id = c.id;
    perform audit('client.anonymized_stale', 'clients', c.id::text, jsonb_build_object('months', months));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Dopyty z formulárov verejného webu rozia.sk (tabuľka leads z 0001): vymažú sa po N mesiacoch (predvolene 12).
create or replace function purge_web_leads(p_months int default null) returns int
  language plpgsql security definer set search_path = public as
$$
declare months int := coalesce(p_months, setting_num('web_lead_retention_months', 12)::int); n int;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  delete from leads where created_at < now() - make_interval(months => greatest(months, 1));
  get diagnostics n = row_count;
  return n;
end $$;

-- Záznamy o prístupe a zmenách (audit): po N mesiacoch (predvolene 36) sa vymažú.
create or replace function purge_audit_log(p_months int default null) returns int
  language plpgsql security definer set search_path = public as
$$
declare months int := coalesce(p_months, setting_num('audit_retention_months', 36)::int); n int;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  delete from audit_log where at < now() - make_interval(months => greatest(months, 1));
  get diagnostics n = row_count;
  return n;
end $$;

-- Denná údržba: spustí všetko vyššie a vráti počty (bez osobných údajov). Volá ju server (Vercel Cron, route /api/cron/retention/).
create or replace function run_retention() returns jsonb
  language plpgsql security definer set search_path = public as
$$
declare r jsonb;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then raise exception 'Len server'; end if;
  r := jsonb_build_object(
    'archived_mandates_anonymized', anonymize_archived(),
    'stale_leads_anonymized', anonymize_stale_leads(),
    'inbound_events_scrubbed', scrub_inbound_events(setting_num('inbound_scrub_days', 30)::int),
    'web_leads_deleted', purge_web_leads(),
    'audit_rows_deleted', purge_audit_log(),
    'files_waiting_for_delete', (select count(*) from storage_cleanup where done_at is null));
  perform audit('retention.run', 'system', null, r);
  return r;
end $$;

revoke all on function anonymize_stale_leads(int), purge_web_leads(int), purge_audit_log(int), run_retention() from public, anon, authenticated;
