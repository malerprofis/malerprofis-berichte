-- Malerprofis Uderstadt — Ungelesene Chat-Nachrichten und Push dazu
-- Ausführen im Supabase SQL Editor, nachdem 0021_safety_folders_and_archive.sql lief.

-- ---------------------------------------------------------------------------
-- Bisher sah man einer Baustelle nicht an, ob im Chat etwas Neues steht —
-- man musste jede einzeln öffnen. Jetzt merkt sich die App je Person und
-- Baustelle, bis wann gelesen wurde, und zählt, was danach kam. Dazu kommt
-- eine Push-Nachricht an alle aus der Mannschaft außer dem Verfasser.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Bis wann jemand den Chat einer Baustelle gelesen hat
--
-- Eine Zeile je Person und Baustelle. Gespeichert wird ein Zeitpunkt, keine
-- Liste gelesener Nachrichten: Das hält die Tabelle klein, und gelöschte
-- Nachrichten hinterlassen keine Waisen.
-- ---------------------------------------------------------------------------

create table if not exists public.site_message_reads (
  employee_id  uuid not null default auth.uid() references public.employees(id) on delete cascade,
  site_id      uuid not null references public.sites(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (employee_id, site_id)
);

alter table public.site_message_reads enable row level security;

-- Jeder sieht und pflegt nur den eigenen Lesestand. Wer was gelesen hat, geht
-- auch das Büro nichts an.
drop policy if exists site_message_reads_rw on public.site_message_reads;
create policy site_message_reads_rw on public.site_message_reads
  for all to authenticated
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid() and public.is_staff());

-- Ohne diesen Startwert stünde beim ersten Öffnen nach dem Update jede
-- Baustelle mit allen alten Nachrichten als ungelesen da. Also gilt alles
-- bis heute als gelesen.
insert into public.site_message_reads (employee_id, site_id, last_read_at)
select e.id, s.id, now()
from public.employees e
cross join public.sites s
where e.role in ('admin', 'worker')
on conflict (employee_id, site_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Als gelesen markieren
--
-- Mit der Uhr der Datenbank statt der des Handys: Geht die Handyuhr nach,
-- blieben sonst eben gelesene Nachrichten als neu stehen.
-- security invoker — es gilt die Regel aus Abschnitt 1.
-- ---------------------------------------------------------------------------

create or replace function public.mark_site_read(p_site_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.site_message_reads (employee_id, site_id, last_read_at)
  values (auth.uid(), p_site_id, now())
  on conflict (employee_id, site_id) do update set last_read_at = excluded.last_read_at;
$$;

grant execute on function public.mark_site_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ungelesene je Baustelle
--
-- Gezählt werden fremde Nachrichten nach dem eigenen Lesestand. Fehlt der
-- Lesestand (Baustelle oder Person neu), zählt alles ab dem Tag, an dem die
-- Person angelegt wurde — wer neu anfängt, soll nicht die Vorgeschichte als
-- ungelesen vorgesetzt bekommen.
--
-- security invoker: Die Nachrichten laufen weiter durch site_messages_select,
-- das Anzeigekonto bekommt also nichts.
-- ---------------------------------------------------------------------------

create or replace function public.unread_site_messages()
returns table (site_id uuid, unread integer)
language sql
security invoker
stable
set search_path = public
as $$
  select m.site_id, count(*)::integer as unread
  from public.site_messages m
  join public.sites s on s.id = m.site_id and s.active
  join public.employees me on me.id = auth.uid()
  left join public.site_message_reads r
    on r.site_id = m.site_id and r.employee_id = auth.uid()
  where m.employee_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, me.created_at)
  group by m.site_id;
$$;

grant execute on function public.unread_site_messages() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Neue Benachrichtigungsart „chat_message"
--
-- Dieselbe Liste steht in src/lib/push.ts und in der Edge Function send-push.
-- ---------------------------------------------------------------------------

alter table public.push_preferences
  drop constraint if exists push_preferences_kind_check;
alter table public.push_preferences
  add constraint push_preferences_kind_check
  check (kind in ('leave_submitted', 'leave_decided', 'plan_changed', 'chat_message'));
