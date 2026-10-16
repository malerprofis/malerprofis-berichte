-- Malerprofis Uderstadt — Projektdaten und Chat je Baustelle
-- Ausführen im Supabase SQL Editor, nachdem 0018_office_site_absence_code.sql lief.

-- ---------------------------------------------------------------------------
-- Bisher gingen Zeitvorgaben, Pläne und Fotos per WhatsApp oder Mail an die
-- Maler. Jetzt hängen sie an der Baustelle in der App, zusammen mit einem
-- Chat je Baustelle.
--
-- Sichtbarkeit ist bewusst flach: Jeder Maler sieht alle Baustellen, deren
-- Dateien und Chats — nicht nur die, auf denen er eingeplant ist. Das spart
-- dem Büro das Freischalten je Baustelle, und in den Unterlagen steht nichts
-- Vertrauliches (Entscheidung Tim, 16.10.2026).
--
-- Ausgenommen ist nur das Anzeigekonto (`tv`): Der Fernseher hängt offen im
-- Büro, Chats gehören nicht auf ihn.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Wer gehört zur Mannschaft?
--
-- Aktive Maler und Büro-Konten. security definer aus demselben Grund wie
-- is_admin() in 0001: Die Abfrage darf nicht selbst wieder durch RLS laufen.
-- ---------------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where id = auth.uid() and role in ('admin', 'worker') and active
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Hinweise des Büros je Baustelle
--
-- Freitext für das, was nicht in eine PDF gehört: „Schlüssel beim Hausmeister",
-- „Treppenhaus bis Freitag fertig". Die veranschlagten Gesamtstunden stehen
-- schon in total_hours (0017).
-- ---------------------------------------------------------------------------

alter table public.sites
  add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- 3. Dateien je Baustelle
--
-- Eine Zeile je Datei im Bucket `projekte`. Die Zeile trägt, was die Liste
-- braucht (Name, Größe, Art), damit die App dafür nicht den Bucket abfragen
-- muss.
--
-- Hochladen und Löschen darf nur das Büro: Die Unterlagen kommen aus dem Büro,
-- und eine Zeitvorgabe soll nicht versehentlich von der Baustelle aus
-- verschwinden. Rückfragen und Fotos von der Baustelle gehen in den Chat.
-- ---------------------------------------------------------------------------

create table if not exists public.site_files (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites(id) on delete cascade,
  kind         text not null check (kind in ('document', 'photo')),
  -- Der Dateiname, wie das Büro ihn hochgeladen hat, z. B. „Zeitvorgabe KW 43.pdf".
  name         text not null check (length(trim(name)) > 0),
  -- Pfad im Bucket: <site_id>/<uuid>.<endung>
  path         text not null unique,
  size_bytes   integer not null check (size_bytes > 0),
  uploaded_by  uuid,
  created_at   timestamptz not null default now()
);

create index if not exists site_files_site_idx on public.site_files (site_id, created_at);

alter table public.site_files enable row level security;

drop policy if exists site_files_select on public.site_files;
create policy site_files_select on public.site_files
  for select to authenticated using (public.is_staff());

drop policy if exists site_files_write on public.site_files;
create policy site_files_write on public.site_files
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Chat je Baustelle
--
-- Schreiben darf jeder aus der Mannschaft, und zwar nur unter eigenem Namen.
-- Löschen darf der Verfasser seine eigene Nachricht, das Büro jede. Ändern
-- darf niemand — eine Absprache soll nachträglich nicht anders dastehen.
-- ---------------------------------------------------------------------------

create table if not exists public.site_messages (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites(id) on delete cascade,
  employee_id  uuid not null default auth.uid() references public.employees(id) on delete cascade,
  body         text not null check (length(trim(body)) between 1 and 4000),
  created_at   timestamptz not null default now()
);

create index if not exists site_messages_site_idx on public.site_messages (site_id, created_at);

alter table public.site_messages enable row level security;

drop policy if exists site_messages_select on public.site_messages;
create policy site_messages_select on public.site_messages
  for select to authenticated using (public.is_staff());

drop policy if exists site_messages_insert on public.site_messages;
create policy site_messages_insert on public.site_messages
  for insert to authenticated with check (public.is_staff() and employee_id = auth.uid());

drop policy if exists site_messages_delete on public.site_messages;
create policy site_messages_delete on public.site_messages
  for delete to authenticated using (employee_id = auth.uid() or public.is_admin());

-- Neue Nachrichten erscheinen ohne Neuladen. Welche Zeilen ein Gerät dabei
-- bekommt, entscheidet weiterhin site_messages_select — der Fernseher also keine.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_messages'
  ) then
    alter publication supabase_realtime add table public.site_messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Ablage
--
-- Privater Bucket, Auslieferung nur über signierte URLs. Die Obergrenze je
-- Datei und die erlaubten Arten setzt Supabase selbst durch, auch wenn jemand
-- an der App vorbei hochlädt. Fotos verkleinert die App vorher auf etwa
-- 0,3–0,5 MB; die 20 MB sind für umfangreiche PDFs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'projekte',
  'projekte',
  false,
  20971520,
  array['application/pdf', 'image/jpeg']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists projekte_select on storage.objects;
create policy projekte_select on storage.objects
  for select to authenticated
  using (bucket_id = 'projekte' and public.is_staff());

drop policy if exists projekte_insert on storage.objects;
create policy projekte_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projekte' and public.is_admin());

drop policy if exists projekte_delete on storage.objects;
create policy projekte_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'projekte' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Speicher im Blick
--
-- Der kostenlose Supabase-Plan hat 1 GB Dateispeicher. Diese Sicht zeigt dem
-- Büro, welche Baustellen wie viel davon belegen, damit es abgeschlossene
-- Baustellen gezielt aufräumen kann. security_invoker wie in 0017: Die Sicht
-- führt kein eigenes Recht ein.
-- ---------------------------------------------------------------------------

create or replace view public.site_file_usage
with (security_invoker = true) as
  select
    f.site_id,
    count(*)::integer          as file_count,
    sum(f.size_bytes)::bigint  as total_bytes
  from public.site_files f
  group by f.site_id;

grant select on public.site_file_usage to authenticated;
