import { supabase } from './supabase.ts';
import { shrinkPhoto } from './abnahme.ts';
import { fileKind, MAX_FILE_BYTES, siteFilePath, storedFileName } from './projects.ts';
import type { SafetyFile, Site, SiteFile, SiteMessage } from './database.types.ts';

/**
 * Datenzugriff für den Bereich „Projekte": Dateien und Chat je Baustelle
 * (0019_site_files_and_chat.sql). Wer was darf, entscheidet die Datenbank —
 * hier steht nur, wie die App mit ihr spricht.
 */

const BUCKET = 'projekte';

const MISSING_MIGRATION =
  'Projektdaten und Chat sind in der Datenbank noch nicht angelegt. Bitte einmalig ' +
  'supabase/migrations/0019_site_files_and_chat.sql im Supabase-SQL-Editor ausführen.';

function isMissing(error: { code?: string; message: string }, table: string): boolean {
  return error.code === '42P01' || error.code === 'PGRST205' || error.message.includes(table);
}

function fail(was: string, error: { code?: string; message: string }, table: string): never {
  if (isMissing(error, table)) throw new Error(MISSING_MIGRATION);
  throw new Error(`${was}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Dateien
// ---------------------------------------------------------------------------

export async function fetchSiteFiles(siteId: string): Promise<SiteFile[]> {
  const { data, error } = await supabase
    .from('site_files')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });
  if (error) fail('Dateien konnten nicht geladen werden', error, 'site_files');
  return (data ?? []) as SiteFile[];
}

/** Anzahl und Größe der Dateien je Baustelle, für Liste und Speicheranzeige. */
export async function fetchFileUsage(): Promise<Map<string, { count: number; bytes: number }>> {
  const { data, error } = await supabase
    .from('site_file_usage')
    .select('site_id, file_count, total_bytes');
  // Fehlt die Migration, zeigt die Liste eben keine Zähler; die Meldung kommt
  // beim Öffnen einer Baustelle.
  if (error) return new Map();
  return new Map(
    (data ?? []).map((row) => [
      String(row.site_id),
      { count: Number(row.file_count), bytes: Number(row.total_bytes) },
    ] as const),
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/**
 * Lädt eine Datei an eine Baustelle hoch. Fotos werden vorher auf 1600 Pixel
 * und JPEG verkleinert — dieselbe Regel wie bei Abnahme und Auslagen. Aus
 * einem 4-MB-Handyfoto werden so etwa 0,3–0,5 MB, und der Dateispeicher des
 * kostenlosen Plans reicht für weit über hundert Baustellen.
 *
 * Erst die Datei, dann die Zeile: Bricht der Upload ab, zeigt keine Zeile auf
 * eine fehlende Datei.
 */
export async function uploadSiteFile(siteId: string, file: File, uploadedBy: string): Promise<SiteFile> {
  const kind = fileKind(file);
  if (!kind) {
    throw new Error(`„${file.name}" ist weder PDF noch Foto.`);
  }

  let blob: Blob = file;
  if (kind === 'photo') {
    const small = await shrinkPhoto(await readAsDataUrl(file));
    // shrinkPhoto gibt bei einem Fehler das Original zurück. Ein Format, das
    // der Browser nicht in JPEG umrechnen kann (z. B. HEIC am PC), lehnt der
    // Bucket ohnehin ab — besser gleich eine klare Meldung.
    if (!small.startsWith('data:image/jpeg')) {
      throw new Error(`„${file.name}" konnte nicht umgewandelt werden. Bitte als JPG hochladen.`);
    }
    blob = await dataUrlToBlob(small);
  }

  if (blob.size > MAX_FILE_BYTES) {
    throw new Error(`„${file.name}" ist größer als 20 MB.`);
  }

  const id = crypto.randomUUID();
  const path = siteFilePath(siteId, kind, id);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: kind === 'document' ? 'application/pdf' : 'image/jpeg' });
  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message)) throw new Error(MISSING_MIGRATION);
    throw new Error(`„${file.name}" konnte nicht übertragen werden: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from('site_files')
    .insert({
      id,
      site_id: siteId,
      kind,
      name: storedFileName(file.name, kind),
      path,
      size_bytes: blob.size,
      uploaded_by: uploadedBy,
    })
    .select('*')
    .single();
  if (error) {
    // Die Datei liegt schon oben, die Zeile fehlt — wieder wegräumen, damit
    // kein unsichtbarer Speicher belegt bleibt.
    await supabase.storage.from(BUCKET).remove([path]);
    fail(`„${file.name}" konnte nicht gespeichert werden`, error, 'site_files');
  }
  return data as SiteFile;
}

/** Erst die Zeile, dann die Datei. Bleibt eine Datei übrig, ist sie nur verwaist. */
export async function deleteSiteFiles(files: SiteFile[]): Promise<void> {
  if (files.length === 0) return;
  const { error } = await supabase
    .from('site_files')
    .delete()
    .in('id', files.map((f) => f.id));
  if (error) fail('Datei konnte nicht gelöscht werden', error, 'site_files');
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove(files.map((f) => f.path));
  if (storageError) console.error('Dateien konnten nicht entfernt werden:', storageError.message);
}

/** Signierte Adressen, Pfad → URL. Eine Stunde reicht zum Ansehen. */
export async function siteFileUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error || !data) {
    throw new Error(`Dateien konnten nicht geladen werden: ${error?.message ?? 'unbekannter Fehler'}`);
  }
  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Hinweise des Büros
// ---------------------------------------------------------------------------

export async function updateSiteNotes(siteId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('sites')
    .update({ notes: notes.trim() || null })
    .eq('id', siteId);
  if (error) {
    if (error.message.includes('notes')) throw new Error(MISSING_MIGRATION);
    throw new Error(`Hinweise konnten nicht gespeichert werden: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** Wie viele Nachrichten beim Öffnen geladen werden — die neuesten. */
const MESSAGE_PAGE = 200;

export async function fetchSiteMessages(siteId: string): Promise<SiteMessage[]> {
  const { data, error } = await supabase
    .from('site_messages')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE);
  if (error) fail('Nachrichten konnten nicht geladen werden', error, 'site_messages');
  return ((data ?? []) as SiteMessage[]).reverse();
}

export async function sendSiteMessage(siteId: string, employeeId: string, body: string): Promise<SiteMessage> {
  const { data, error } = await supabase
    .from('site_messages')
    .insert({ site_id: siteId, employee_id: employeeId, body })
    .select('*')
    .single();
  if (error) fail('Nachricht konnte nicht gesendet werden', error, 'site_messages');
  return data as SiteMessage;
}

export async function deleteSiteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('site_messages').delete().eq('id', id);
  if (error) fail('Nachricht konnte nicht gelöscht werden', error, 'site_messages');
}

/**
 * Hört auf neue und gelöschte Nachrichten einer Baustelle. Gibt die Funktion
 * zum Abmelden zurück — ohne sie bliebe je geöffneter Baustelle eine
 * Verbindung offen.
 */
export function subscribeSiteMessages(
  siteId: string,
  handlers: { onInsert: (m: SiteMessage) => void; onDelete: (id: string) => void },
): () => void {
  const channel = supabase
    .channel(`site-chat-${siteId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'site_messages', filter: `site_id=eq.${siteId}` },
      (payload) => handlers.onInsert(payload.new as SiteMessage),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'site_messages' },
      (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) handlers.onDelete(id);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Ungelesene Nachrichten (0022)
// ---------------------------------------------------------------------------

/**
 * Ungelesene fremde Nachrichten je Baustelle. Baustellen ohne Ungelesenes
 * fehlen in der Antwort.
 *
 * Fehlt Migration 0022 noch, kommt eine leere Liste statt eines Fehlers: Der
 * Chat selbst funktioniert auch ohne Zähler, und eine rote Meldung auf jeder
 * Seite wäre schlimmer als ein fehlender Hinweis.
 */
export async function fetchUnreadCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('unread_site_messages');
  if (error) {
    console.warn('Ungelesene Nachrichten nicht abrufbar (Migration 0022 ausgeführt?):', error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as { site_id: string; unread: number }[]).map((row) => [row.site_id, row.unread]),
  );
}

/** Merkt sich, dass der Chat dieser Baustelle bis jetzt gelesen ist. */
export async function markSiteRead(siteId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_site_read', { p_site_id: siteId });
  if (error) console.warn('Lesestand nicht gespeichert:', error.message);
}

/**
 * Hört auf neue und gelöschte Nachrichten aller Baustellen — für die Zähler
 * in der Liste und am Reiter. Den Fernseher erreicht nichts davon, das regelt
 * site_messages_select.
 */
export function subscribeAllSiteMessages(handlers: {
  onInsert: (m: SiteMessage) => void;
  onDelete: () => void;
}): () => void {
  const channel = supabase
    .channel('site-chat-unread')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_messages' }, (payload) =>
      handlers.onInsert(payload.new as SiteMessage),
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'site_messages' }, () =>
      handlers.onDelete(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Baustellen anlegen und pflegen (früher unter Verwaltung)
// ---------------------------------------------------------------------------

export interface SiteInput {
  number: string;
  address: string;
  customer: string | null;
  /** null = nicht hinterlegt. */
  totalHours: number | null;
}

function siteColumns(input: SiteInput) {
  return {
    number: input.number.trim(),
    address: input.address.trim(),
    customer: input.customer?.trim() || null,
    total_hours: input.totalHours,
  };
}

function siteError(was: string, error: { code?: string; message: string }): Error {
  // 23505: Die Nummer ist schon vergeben (unique auf sites.number).
  if (error.code === '23505') return new Error('Diese Baustellennummer gibt es schon.');
  return new Error(`${was}: ${error.message}`);
}

/** Legt eine Baustelle an und gibt sie zurück, damit die App sie gleich öffnen kann. */
export async function createSite(input: SiteInput): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .insert(siteColumns(input))
    .select('*')
    .single();
  if (error) throw siteError('Baustelle konnte nicht angelegt werden', error);
  return data as Site;
}

export async function updateSite(id: string, input: SiteInput): Promise<void> {
  const { error } = await supabase.from('sites').update(siteColumns(input)).eq('id', id);
  if (error) throw siteError('Baustelle konnte nicht gespeichert werden', error);
}

/**
 * Archivieren statt löschen: An einer Baustelle hängen Berichtszeilen
 * vergangener Wochen, die erhalten bleiben müssen.
 */
export async function setSiteActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('sites').update({ active }).eq('id', id);
  if (error) throw siteError('Baustelle konnte nicht geändert werden', error);
}

// ---------------------------------------------------------------------------
// Ordner „Arbeitssicherheit" (0020)
// ---------------------------------------------------------------------------

const MISSING_SAFETY =
  'Der Ordner „Arbeitssicherheit" ist in der Datenbank noch nicht angelegt. Bitte einmalig ' +
  'supabase/migrations/0020_safety_files.sql im Supabase-SQL-Editor ausführen.';

function safetyFail(was: string, error: { code?: string; message: string }): never {
  if (isMissing(error, 'safety_files')) throw new Error(MISSING_SAFETY);
  throw new Error(`${was}: ${error.message}`);
}

/** Sicherheitsunterlagen sind nur PDFs. */
function checkSafetyPdf(file: File): void {
  if (fileKind(file) !== 'document') {
    throw new Error(`„${file.name}" ist keine PDF.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`„${file.name}" ist größer als 20 MB.`);
  }
}

async function putSafetyPdf(file: File): Promise<string> {
  const path = `arbeitssicherheit/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'application/pdf' });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error(MISSING_MIGRATION);
    throw new Error(`„${file.name}" konnte nicht übertragen werden: ${error.message}`);
  }
  return path;
}

/**
 * Die Sicherheitsunterlagen in ihrer Reihenfolge. Fehlt die Migration, ist der
 * Ordner im Projekt einfach leer — keine rote Meldung auf jeder Baustelle.
 */
export async function fetchSafetyFiles(options: { quiet?: boolean } = {}): Promise<SafetyFile[]> {
  const { data, error } = await supabase
    .from('safety_files')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    if (options.quiet && isMissing(error, 'safety_files')) return [];
    safetyFail('Sicherheitsunterlagen konnten nicht geladen werden', error);
  }
  return (data ?? []) as SafetyFile[];
}

export async function uploadSafetyFile(
  file: File,
  position: number,
  uploadedBy: string,
  folder: string | null = null,
): Promise<void> {
  checkSafetyPdf(file);
  const path = await putSafetyPdf(file);
  const { error } = await supabase.from('safety_files').insert({
    name: file.name,
    path,
    size_bytes: file.size,
    position,
    uploaded_by: uploadedBy,
    // Nur mitschicken, wenn es einen Ordner gibt: So klappt das Hochladen auch,
    // solange 0021 noch nicht eingespielt ist.
    ...(folder && { folder }),
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    safetyFail(`„${file.name}" konnte nicht gespeichert werden`, error);
  }
}

/**
 * Tauscht eine Sicherheitsunterlage gegen eine neue Fassung. Die Zeile und ihr
 * Platz im Ordner bleiben; erst wenn sie auf die neue Datei zeigt, wird die
 * alte gelöscht.
 */
export async function replaceSafetyFile(old: SafetyFile, file: File, uploadedBy: string): Promise<void> {
  checkSafetyPdf(file);
  const path = await putSafetyPdf(file);
  const { error } = await supabase
    .from('safety_files')
    .update({
      name: file.name,
      path,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', old.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    safetyFail(`„${file.name}" konnte nicht gespeichert werden`, error);
  }
  await supabase.storage.from(BUCKET).remove([old.path]);
}

export async function deleteSafetyFile(file: SafetyFile): Promise<void> {
  const { error } = await supabase.from('safety_files').delete().eq('id', file.id);
  if (error) safetyFail('Datei konnte nicht gelöscht werden', error);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.path]);
  if (storageError) console.error('Datei konnte nicht entfernt werden:', storageError.message);
}

/** Verschiebt eine Sicherheitsunterlage in einen anderen Unterordner (null = keiner). */
export async function moveSafetyFile(id: string, folder: string | null): Promise<void> {
  const { error } = await supabase.from('safety_files').update({ folder }).eq('id', id);
  if (error) {
    if (error.message.includes('folder')) {
      throw new Error(
        'Unterordner sind in der Datenbank noch nicht angelegt. Bitte einmalig ' +
          'supabase/migrations/0021_safety_folders_and_archive.sql im Supabase-SQL-Editor ausführen.',
      );
    }
    safetyFail('Datei konnte nicht verschoben werden', error);
  }
}

/** Benennt einen Unterordner um — alle Dateien darin wandern mit. */
export async function renameSafetyFolder(from: string, to: string): Promise<void> {
  const { error } = await supabase.from('safety_files').update({ folder: to }).eq('folder', from);
  if (error) safetyFail('Ordner konnte nicht umbenannt werden', error);
}

// ---------------------------------------------------------------------------
// Archivieren mit Aufräumen
// ---------------------------------------------------------------------------

/** Alle Nachrichten einer Baustelle, älteste zuerst — für den Export. */
export async function fetchAllSiteMessages(siteId: string): Promise<SiteMessage[]> {
  const PAGE = 1000;
  const all: SiteMessage[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('site_messages')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail('Nachrichten konnten nicht geladen werden', error, 'site_messages');
    all.push(...((data ?? []) as SiteMessage[]));
    if (!data || data.length < PAGE) return all;
  }
}

/**
 * Räumt eine Baustelle beim Archivieren leer: erst die Dateien, dann der Chat,
 * zuletzt das Archiv-Kennzeichen. Bricht ein Schritt ab, bleibt die Baustelle
 * aktiv, und das Büro kann es noch einmal versuchen — der Export liegt dann
 * schon auf dem Gerät.
 */
export async function archiveAndPurgeSite(siteId: string): Promise<void> {
  await deleteSiteFiles(await fetchSiteFiles(siteId));
  const { error } = await supabase.from('site_messages').delete().eq('site_id', siteId);
  if (error) fail('Chat konnte nicht gelöscht werden', error, 'site_messages');
  await setSiteActive(siteId, false);
}
