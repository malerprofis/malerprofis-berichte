import { useCallback, useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Loader2, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  deleteSafetyFile,
  fetchSafetyFiles,
  replaceSafetyFile,
  siteFileUrls,
  uploadSafetyFile,
} from '../../lib/project-data.ts';
import { formatBytes } from '../../lib/projects.ts';
import type { SafetyFile } from '../../lib/database.types.ts';

/**
 * Verwaltung des Ordners „Arbeitssicherheit". Was hier liegt, erscheint in
 * jedem Projekt ganz oben (0020_safety_files.sql).
 *
 * „Ersetzen" tauscht eine Datei gegen die neue Fassung, ohne dass sie ihren
 * Platz im Ordner verliert — dafür ist der Ordner zentral statt je Baustelle.
 */
export default function SafetyFilesAdmin({ currentUserId }: { currentUserId: string }) {
  const [files, setFiles] = useState<SafetyFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<SafetyFile | null>(null);

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

  const add = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (chosen.length === 0) return;
    const start = files.reduce((max, f) => Math.max(max, f.position), 0) + 1;
    await act('Lade hoch …', async () => {
      for (const [i, file] of chosen.entries()) {
        await uploadSafetyFile(file, start + i, currentUserId);
      }
    });
  };

  const replace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const target = replacing;
    setReplacing(null);
    if (!file || !target) return;
    await act('Ersetze …', () => replaceSafetyFile(target, file, currentUserId));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck size={20} className="text-amber-600" />
          Arbeitssicherheit
        </h3>
        <button
          onClick={() => addInput.current?.click()}
          disabled={busy !== null}
          className="flex items-center gap-1.5 bg-brand-accent1 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          <Upload size={14} />
          PDF hinzufügen
        </button>
        <input ref={addInput} type="file" accept="application/pdf" multiple onChange={add} className="hidden" />
        <input ref={replaceInput} type="file" accept="application/pdf" onChange={replace} className="hidden" />
      </div>

      <p className="text-sm text-[#141414]/50 -mt-2">
        Diese Unterlagen erscheinen in jedem Projekt ganz oben im Ordner „Arbeitssicherheit“.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50/60 border border-red-100 rounded-xl p-3">{error}</p>
      )}

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#141414]/5">
        {busy && (
          <p className="flex items-center gap-2 text-sm text-brand-accent1 p-4 border-b border-[#141414]/5">
            <Loader2 size={14} className="animate-spin" />
            {busy}
          </p>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            className="p-4 flex items-center gap-3 border-b border-[#141414]/5 last:border-none"
          >
            <FileText size={18} className="text-amber-600 shrink-0" />
            <a href={urls[file.path]} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:underline">
              <span className="block text-sm font-semibold truncate">{file.name}</span>
              <span className="block text-xs text-[#141414]/40">
                Stand {format(parseISO(file.updated_at), 'd. MMM yyyy', { locale: de })} ·{' '}
                {formatBytes(file.size_bytes)}
              </span>
            </a>
            <button
              onClick={() => {
                setReplacing(file);
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
        ))}
        {files.length === 0 && !busy && (
          <div className="p-8 text-center text-[#141414]/30 text-sm">Noch keine Unterlagen.</div>
        )}
      </div>
    </section>
  );
}
