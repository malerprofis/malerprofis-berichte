-- Malerprofis Uderstadt — Reihenfolge der Maler
-- Ausführen im Supabase SQL Editor, nachdem 0022_chat_unread_and_push.sql lief.

-- ---------------------------------------------------------------------------
-- Das Büro legt in der Benutzerverwaltung fest, in welcher Reihenfolge die
-- Maler stehen; Wochenplanung und Fernseher übernehmen sie. null heißt: noch
-- nie verschoben, steht hinter den sortierten, alphabetisch nach Nachname.
-- Schreiben darf nur das Büro, das regelt schon employees_write aus 0001.
-- ---------------------------------------------------------------------------

alter table public.employees
  add column if not exists sort_order integer;
