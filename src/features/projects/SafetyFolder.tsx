import { useEffect, useState } from 'react';
import { ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import { fetchSafetyFiles, siteFileUrls } from '../../lib/project-data.ts';
import { formatBytes, groupSafetyFiles } from '../../lib/projects.ts';
import type { SafetyFile } from '../../lib/database.types.ts';

function FileLink({ file, url }: { file: SafetyFile; url: string | undefined }) {
  return (
    <a
      href={url}
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
  );
}

/** Ein- und ausklappbare Zeile mit Ordnersymbol. */
function FolderRow({
  name,
  count,
  open,
  onToggle,
  strong = false,
}: {
  name: string;
  count: number | null;
  open: boolean;
  onToggle: () => void;
  strong?: boolean;
}) {
  const Icon = open ? FolderOpen : Folder;
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
      aria-expanded={open}
    >
      <Icon size={strong ? 20 : 18} className="text-amber-600 shrink-0" />
      <span className={`flex-1 text-sm ${strong ? 'font-bold' : 'font-medium'}`}>{name}</span>
      {count !== null && <span className="text-xs text-[#141414]/50">{count}</span>}
      <ChevronDown size={16} className={`text-[#141414]/40 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

/**
 * Der Ordner „Arbeitssicherheit" ganz oben in den Unterlagen jeder Baustelle,
 * mit seinen Unterordnern. Die Dateien sind für alle Baustellen dieselben und
 * werden unter Verwaltung gepflegt (0020, 0021).
 */
export default function SafetyFolder() {
  const [files, setFiles] = useState<SafetyFile[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
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

  const toggleFolder = (name: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const groups = groupSafetyFiles(files ?? []);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <FolderRow
        name="Arbeitssicherheit"
        count={files ? files.length : null}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        strong
      />

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {error && <p className="text-sm text-red-700">{error}</p>}
          {files?.length === 0 && (
            <p className="text-sm text-[#141414]/50 px-1">Das Büro hat noch keine Unterlagen hinterlegt.</p>
          )}

          {groups.folders.map((folder) => (
            <div key={folder.name} className="bg-white/70 rounded-xl border border-amber-100">
              <FolderRow
                name={folder.name}
                count={folder.files.length}
                open={openFolders.has(folder.name)}
                onToggle={() => toggleFolder(folder.name)}
              />
              {openFolders.has(folder.name) && (
                <div className="px-2 pb-2 space-y-2">
                  {folder.files.map((file) => (
                    <FileLink key={file.id} file={file} url={urls[file.path]} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {groups.loose.map((file) => (
            <FileLink key={file.id} file={file} url={urls[file.path]} />
          ))}
        </div>
      )}
    </div>
  );
}
