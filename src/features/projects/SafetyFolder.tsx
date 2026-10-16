import { useEffect, useState } from 'react';
import { ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import { fetchSafetyFiles, siteFileUrls } from '../../lib/project-data.ts';
import { formatBytes } from '../../lib/projects.ts';
import type { SafetyFile } from '../../lib/database.types.ts';

/**
 * Der Ordner „Arbeitssicherheit" ganz oben in den Unterlagen jeder Baustelle.
 * Die Dateien sind für alle Baustellen dieselben und werden unter Verwaltung
 * gepflegt (0020_safety_files.sql).
 */
export default function SafetyFolder() {
  const [files, setFiles] = useState<SafetyFile[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await fetchSafetyFiles({ quiet: true });
        const signed = await siteFileUrls(loaded.map((f) => f.path));
        if (cancelled) return;
        setFiles(loaded);
        setUrls(signed);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const Icon = open ? FolderOpen : Folder;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
        aria-expanded={open}
      >
        <Icon size={20} className="text-amber-600 shrink-0" />
        <span className="flex-1 text-sm font-bold">Arbeitssicherheit</span>
        {files && <span className="text-xs text-[#141414]/50">{files.length}</span>}
        <ChevronDown size={16} className={`text-[#141414]/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {error && <p className="text-sm text-red-700">{error}</p>}
          {files?.length === 0 && (
            <p className="text-sm text-[#141414]/50 px-1">Das Büro hat noch keine Unterlagen hinterlegt.</p>
          )}
          {files?.map((file) => (
            <a
              key={file.id}
              href={urls[file.path]}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-gray-50"
            >
              <FileText size={18} className="text-amber-600 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{file.name}</span>
                <span className="block text-xs text-[#141414]/40">{formatBytes(file.size_bytes)}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
