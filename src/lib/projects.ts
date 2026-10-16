import type { Site, SiteFile } from './database.types.ts';

/**
 * Fachliche Regeln des Bereichs „Projekte" — bewusst ohne Datenbankzugriff,
 * damit sie sich ohne laufende Umgebung prüfen lassen (projects.test.ts).
 */

/** Größte Datei, die der Bucket annimmt (0019, file_size_limit). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Dateispeicher des kostenlosen Supabase-Plans. */
export const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;

/** Längste Chat-Nachricht, wie in der Datenbank geprüft (0019). */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Baustellen, die im Bereich „Projekte" erscheinen: aktive echte Baustellen,
 * also ohne Urlaub, Krank, Feiertag und Büroarbeit. Sortiert nach Nummer wie
 * überall in der App.
 */
export function projectSites(sites: Site[]): Site[] {
  return sites
    .filter((s) => s.active && !s.is_absence_code)
    .sort((a, b) => a.number.localeCompare(b.number, 'de', { numeric: true }));
}

/** Suche über Nummer, Adresse und Kunde, ohne Groß-/Kleinschreibung. */
export function matchesSearch(site: Site, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [site.number, site.address, site.customer ?? '']
    .some((field) => field.toLowerCase().includes(q));
}

/**
 * Was für eine Datei ist das? PDFs bleiben, wie sie sind; Bilder werden vor
 * dem Hochladen verkleinert und als JPEG abgelegt. Alles andere lehnt die App
 * ab, bevor der Bucket es tut.
 */
export function fileKind(file: { type: string; name: string }): SiteFile['kind'] | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'document';
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) return 'photo';
  return null;
}

/**
 * Pfad im Bucket. Erstes Segment ist die Baustelle — so lassen sich alle
 * Dateien einer Baustelle beim Aufräumen in einem Zug finden.
 */
export function siteFilePath(siteId: string, kind: SiteFile['kind'], id: string): string {
  return `${siteId}/${id}.${kind === 'document' ? 'pdf' : 'jpg'}`;
}

/** Fotos werden als JPEG abgelegt; der Name soll das auch sagen. */
export function storedFileName(originalName: string, kind: SiteFile['kind']): string {
  const trimmed = originalName.trim() || (kind === 'document' ? 'Dokument' : 'Foto');
  if (kind === 'document') return trimmed;
  return trimmed.replace(/\.(png|webp|heic|heif|jpeg)$/i, '.jpg');
}

/** 1536 → „1,5 KB", 3_500_000 → „3,3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

/** Leere oder zu lange Nachrichten gehen gar nicht erst raus. */
export function cleanMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return null;
  return trimmed;
}

/**
 * Fügt eine Nachricht, die per Live-Aktualisierung kommt, in die Liste ein.
 * Die eigene Nachricht steht schon da, weil sie nach dem Senden direkt
 * angehängt wird — sie darf nicht doppelt erscheinen.
 */
export function mergeMessage<T extends { id: string; created_at: string }>(list: T[], next: T): T[] {
  if (list.some((m) => m.id === next.id)) return list;
  return [...list, next].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
