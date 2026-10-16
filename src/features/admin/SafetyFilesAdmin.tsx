import { useCallback, useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Folder, FolderPlus, Loader2, Pencil, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  deleteSafetyFile,
  fetchSafetyFiles,
  moveSafetyFile,
  renameSafetyFolder,
  replaceSafetyFile,
  siteFileUrls,
  uploadSafetyFile,
} from '../../lib/project-data.ts';
import { cleanFolder, formatBytes, groupSafetyFiles } from '../../lib/projects.ts';
import type { SafetyFile } from '../../lib/database.types.ts';

/** Wert im Verschieben-Feld für „direkt in Arbeitssicherheit". */
const NO_FOLDER = '';

/**
 * Verwaltung des Ordners „Arbeitssicherheit". Was hier liegt, erscheint in
 * jedem Projekt ganz oben (0020, 0021).
 *
 * Unterordner sind nur ein Name an der Datei: „Neuer Ordner" legt ihn hier an,
 * gespeichert ist er, sobald die erste Datei darin liegt. „Ersetzen" tauscht
 * eine Datei gegen die neue Fassung, ohne dass sie ihren Platz verliert.
 */
export default function SafetyFilesAdmin({ currentUserId }: { currentUserId: string }) {
  const [files, setFiles] = useState<SafetyFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  /** Frisch angelegte Ordner, in denen noch keine Datei liegt. */
  const [newFolders, setNewFolders] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const uploadFolder = useRef<string | null>(null);
  const replacing = useRef<SafetyFile | null>(null);

  const load = useCallback(async () => {
    try {
      const loaded = await fetchSafetyFiles();
      setFiles(loaded);
      setUrls(await siteFileUrls(loaded.map((f) => f.path)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
    await load();
  };

  const groups = groupSafetyFiles(files, newFolders);
  const folderNames = groups.folders.map((f) => f.name);

  const pickUpload = (folder: string | null) => {
    uploadFolder.current = folder;
    addInput.current?.click();
  };

  const add = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (chosen.length === 0) return;
    const folder = uploadFolder.current;
    const start = files.reduce((max, f) => Math.max(max, f.position), 0) + 1;
    await act('Lade hoch …', async () => {
      for (const [i, file] of chosen.entries()) {
        await uploadSafetyFile(file, start + i, currentUserId, folder);
      }
    });
  };

  const replace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const target = replacing.current;
    replacing.current = null;
    if (!file || !target) return;
    await act('Ersetze …', () => replaceSafetyFile(target, file, currentUserId));
  };

  const createFolder = () => {
    const name = cleanFolder(window.prompt('Name des neuen Ordners:'));
    if (!name) return;
    if (folderNames.includes(name)) {
      setError(`Den Ordner „${name}“ gibt es schon.`);
      return;
    }
    setNewFolders((prev) => [...prev, name]);
  };

  const renameFolder = async (from: string) => {
    const to = cleanFolder(window.prompt('Neuer Name des Ordners:', from));
    if (!to || to === from) return;
    setNewFolders((prev) => prev.map((n) => (n === from ? to : n)));
    if (files.some((f) => f.folder === from)) {
      await act('Benenne um …', () => renameSafetyFolder(from, to));
    }
  };

  const fileRow = (file: SafetyFile) => (
    <div
      key={file.id}
      className="p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 border-b border-[#141414]/5 last:border-none"
    >
      <FileText size={18} className="text-amber-600 shrink-0" />
      <a href={urls[file.path]} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:underline">
        <span className="block text-sm font-semibold truncate">{file.name}</span>
        <span className="block text-xs text-[#141414]/40">
          Stand {format(parseISO(file.updated_at), 'd. MMM yyyy', { locale: de })} ·{' '}
          {formatBytes(file.size_bytes)}
        </span>
      </a>
      <select
        value={cleanFolder(file.folder) ?? NO_FOLDER}
        onChange={(e) => {
          const folder = cleanFolder(e.target.value);
          act('Verschiebe …', () => moveSafetyFile(file.id, folder));
        }}
        disabled={busy !== null}
        aria-label={`${file.name} verschieben`}
        title="In anderen Ordner verschieben"
        className="text-xs bg-gray-100 rounded-xl px-2 py-2 max-w-40 disabled:opacity-50"
      >
        <option value={NO_FOLDER}>Kein Unterordner</option>
        {folderNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          replacing.current = file;
          replaceInput.current?.click();
        }}
        disabled={busy !== null}
        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#141414] bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50"
        title="Neue Fassung hochladen"
      >
        <RefreshCw size={14} />
        Ersetzen
      </button>
      <button
        onClick={() => {
          if (window.confirm(`„${file.name}“ aus allen Projekten entfernen?`)) {
            act('Lösche …', () => deleteSafetyFile(file));
          }
        }}
        disabled={busy !== null}
        className="p-2 text-gray-400 hover:text-red-600 rounded-xl cursor-pointer disabled:opacity-50"
        aria-label={`${file.name} löschen`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const uploadButton = (folder: string | null, label: string) => (
    <button
      onClick={() => pickUpload(folder)}
      disabled={busy !== null}
      className="flex items-center gap-1.5 text-xs font-bold text-brand-accent1 hover:bg-brand-accent1/10 px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50"
    >
      <Upload size={14} />
      {label}
    </button>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck size={20} className="text-amber-600" />
          Arbeitssicherheit
        </h3>
        <div className="flex gap-2">
          <button
            onClick={createFolder}
            disabled={busy !== null}
            className="flex items-center gap-1.5 bg-white border border-[#141414]/10 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <FolderPlus size={14} />
            Neuer Ordner
          </button>
          <button
            onClick={() => pickUpload(null)}
            disabled={busy !== null}
            className="flex items-center gap-1.5 bg-brand-accent1 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            PDF hinzufügen
          </button>
        </div>
        <input ref={addInput} type="file" accept="application/pdf" multiple onChange={add} className="hidden" />
        <input ref={replaceInput} type="file" accept="application/pdf" onChange={replace} className="hidden" />
      </div>

      <p className="text-sm text-[#141414]/50 -mt-2">
        Diese Unterlagen erscheinen in jedem Projekt ganz oben im Ordner „Arbeitssicherheit“.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50/60 border border-red-100 rounded-xl p-3">{error}</p>
      )}
      {busy && (
        <p className="flex items-center gap-2 text-sm text-brand-accent1">
          <Loader2 size={14} className="animate-spin" />
          {busy}
        </p>
      )}

      {groups.folders.map((folder) => (
        <div key={folder.name} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#141414]/5">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/60 border-b border-amber-100">
            <Folder size={18} className="text-amber-600" />
            <span className="flex-1 text-sm font-bold truncate">{folder.name}</span>
            <button
              onClick={() => renameFolder(folder.name)}
              disabled={busy !== null}
              className="p-2 text-gray-400 hover:text-brand-accent1 rounded-xl cursor-pointer disabled:opacity-50"
              aria-label={`Ordner ${folder.name} umbenennen`}
              title="Umbenennen"
            >
              <Pencil size={14} />
            </button>
            {uploadButton(folder.name, 'PDF hierher')}
          </div>
          {folder.files.map(fileRow)}
          {folder.files.length === 0 && (
            <p className="p-4 text-sm text-[#141414]/40">
              Noch leer. Ein Ordner ohne Datei wird nicht gespeichert.
            </p>
          )}
        </div>
      ))}

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#141414]/5">
        {groups.folders.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#141414]/5">
            <span className="flex-1 text-xs font-semibold text-[#141414]/40 uppercase tracking-wider">
              Ohne Unterordner
            </span>
            {uploadButton(null, 'PDF hierher')}
          </div>
        )}
        {groups.loose.map(fileRow)}
        {groups.loose.length === 0 && (
          <div className="p-6 text-center text-[#141414]/30 text-sm">
            {files.length === 0 ? 'Noch keine Unterlagen.' : 'Alle Dateien liegen in Unterordnern.'}
          </div>
        )}
      </div>
    </section>
  );
}
