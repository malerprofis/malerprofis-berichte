/**
 * Prüft die Regeln des Bereichs „Projekte". Läuft ohne Supabase und ohne Netz.
 */
import {
  cleanMessage,
  fileKind,
  formatBytes,
  matchesSearch,
  mergeMessage,
  projectSites,
  siteFilePath,
  storedFileName,
} from './projects.ts';
import type { Site } from './database.types.ts';

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? 'OK  ' : 'FEHL'}  ${name}${ok ? '' : `\n        erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)}`}`,
  );
}

function site(number: string, extra: Partial<Site> = {}): Site {
  return { id: number, number, address: `Adresse ${number}`, customer: null, is_absence_code: false, active: true, ...extra };
}

// --- Welche Baustellen erscheinen ------------------------------------------

check(
  'nur aktive echte Baustellen, nach Nummer',
  projectSites([
    site('210-5'),
    site('060-7', { is_absence_code: true }),
    site('99-5'),
    site('300-5', { active: false }),
  ]).map((s) => s.number),
  ['99-5', '210-5'],
);

check('Suche nach Kunde', matchesSearch(site('1', { customer: 'SAGA Hamburg' }), 'saga'), true);
check('Suche nach Adresse', matchesSearch(site('1'), 'adresse'), true);
check('Suche ohne Treffer', matchesSearch(site('1'), 'xyz'), false);
check('leere Suche zeigt alles', matchesSearch(site('1'), '  '), true);

// --- Dateiarten -------------------------------------------------------------

check('PDF', fileKind({ type: 'application/pdf', name: 'a.pdf' }), 'document');
check('PDF ohne Typ', fileKind({ type: '', name: 'Zeitvorgabe.PDF' }), 'document');
check('Kamerafoto', fileKind({ type: 'image/jpeg', name: 'IMG_1.jpg' }), 'photo');
check('iPhone-HEIC ohne Typ', fileKind({ type: '', name: 'IMG_2.HEIC' }), 'photo');
check('Word wird abgelehnt', fileKind({ type: 'application/msword', name: 'a.doc' }), null);

check('Pfad Dokument', siteFilePath('s1', 'document', 'f1'), 's1/f1.pdf');
check('Pfad Foto', siteFilePath('s1', 'photo', 'f1'), 's1/f1.jpg');
check('PNG wird als JPG benannt', storedFileName('Flur.png', 'photo'), 'Flur.jpg');
check('PDF-Name bleibt', storedFileName('Zeitvorgabe KW 43.pdf', 'document'), 'Zeitvorgabe KW 43.pdf');

// --- Größen -----------------------------------------------------------------

check('Bytes', formatBytes(512), '512 B');
check('Kilobyte', formatBytes(1536), '1,5 KB');
check('Megabyte', formatBytes(3_500_000), '3,3 MB');

// --- Chat -------------------------------------------------------------------

check('Leerzeichen werden entfernt', cleanMessage('  Hallo  '), 'Hallo');
check('leere Nachricht', cleanMessage('   '), null);
check('zu lange Nachricht', cleanMessage('x'.repeat(4001)), null);

const a = { id: 'a', created_at: '2026-10-16T10:00:00Z' };
const b = { id: 'b', created_at: '2026-10-16T10:05:00Z' };
check('eigene Nachricht nicht doppelt', mergeMessage([a, b], b).length, 2);
check('verspätete Nachricht sortiert ein', mergeMessage([b], a).map((m) => m.id), ['a', 'b']);

if (failed > 0) {
  console.log(`\n${failed} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Prüfungen bestanden.');
