-- Malerprofis Uderstadt — Ordner „Arbeitssicherheit"
-- Ausführen im Supabase SQL Editor, nachdem 0019_site_files_and_chat.sql lief.

-- ---------------------------------------------------------------------------
-- Die Sicherheitsunterlagen (Gefährdungsbeurteilung, Betriebsanweisungen,
-- Unterweisungen) gelten für jede Baustelle gleich. Sie hängen deshalb nicht an
-- einer Baustelle, sondern liegen einmal zentral und erscheinen in jedem
-- Projekt ganz oben als Ordner „Arbeitssicherheit".
--
-- Gepflegt werden sie unter Verwaltung. Eine Datei lässt sich dort einzeln
-- ersetzen: Die Zeile bleibt, nur Name, Pfad und Größe wechseln — so steht die
-- neue Fassung sofort in allen Projekten, ohne dass jemand sie je Baustelle
-- austauschen muss.
--
-- Die Dateien liegen im Bucket `projekte` unter `arbeitssicherheit/`. Dessen
-- Zugriffsregeln aus 0019 gelten unverändert: lesen alle aus der Mannschaft,
-- schreiben nur das Büro.
-- ---------------------------------------------------------------------------

create table if not exists public.safety_files (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  path         text not null unique,
  size_bytes   integer not null check (size_bytes > 0),
  -- Reihenfolge im Ordner; neue Dateien kommen ans Ende.
  position     integer not null default 0,
  uploaded_by  uuid,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.safety_files enable row level security;

drop policy if exists safety_files_select on public.safety_files;
create policy safety_files_select on public.safety_files
  for select to authenticated using (public.is_staff());

drop policy if exists safety_files_write on public.safety_files;
create policy safety_files_write on public.safety_files
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
