-- Malerprofis Uderstadt — Unterordner für Arbeitssicherheit
-- Ausführen im Supabase SQL Editor, nachdem 0020_safety_files.sql lief.

-- ---------------------------------------------------------------------------
-- Die Sicherheitsunterlagen lassen sich in Ordner aufteilen, z. B.
-- „Betriebsanweisungen", „Gefährdungsbeurteilungen", „Unterweisungen".
--
-- Ein Ordner ist nur ein Name an der Datei, keine eigene Tabelle: Ein Ordner
-- ohne Dateien braucht niemand, und Umbenennen ist ein einziges Update über
-- alle Dateien mit diesem Namen. null heißt: liegt direkt im Ordner
-- „Arbeitssicherheit".
-- ---------------------------------------------------------------------------

alter table public.safety_files
  add column if not exists folder text;

alter table public.safety_files
  drop constraint if exists safety_files_folder_not_blank;

alter table public.safety_files
  add constraint safety_files_folder_not_blank
  check (folder is null or length(trim(folder)) > 0);

-- ---------------------------------------------------------------------------
-- Beim Archivieren einer Baustelle exportiert die App den Chat als PDF und
-- löscht danach Dateien und Nachrichten. Das Löschen der Nachrichten darf das
-- Büro schon seit 0019 (site_messages_delete), das der Dateien ebenso
-- (site_files_write, projekte_delete). Hier ist dafür nichts weiter nötig.
-- ---------------------------------------------------------------------------
