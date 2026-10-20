import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, Loader2, MessageCircle, Paperclip, Plus, Search } from 'lucide-react';
import { fetchArchivedSites } from '../../lib/data.ts';
import { createSite, fetchFileUsage, setSiteActive } from '../../lib/project-data.ts';
import { matchesSearch, projectSites } from '../../lib/projects.ts';
import type { Employee, Site } from '../../lib/database.types.ts';
import ProjectDetail from './ProjectDetail.tsx';
import SiteForm from './SiteForm.tsx';

/**
 * Der Reiter „Projekte": alle laufenden Baustellen mit den Unterlagen aus dem
 * Büro und einem Chat je Baustelle. Das Büro legt Baustellen hier auch an,
 * bearbeitet und archiviert sie — früher stand das unter Verwaltung.
 *
 * Jeder Maler sieht jede Baustelle — so muss das Büro niemanden einzeln
 * freischalten (0019_site_files_and_chat.sql).
 *
 * Welche Baustelle offen ist, hält App.tsx: So kann die Wochenplanung mit
 * einem Tipp auf einen Einsatz direkt hierher springen.
 */
export default function ProjectsView({
  sites,
  employees,
  currentUser,
  openSiteId,
  onOpenSite,
  onSitesChanged,
  unreadCounts,
}: {
  sites: Site[];
  employees: Employee[];
  currentUser: Employee;
  openSiteId: string | null;
  onOpenSite: (siteId: string | null) => void;
  /** Baustellen neu laden, nachdem das Büro etwas geändert hat. */
  onSitesChanged: () => Promise<void>;
  /** Ungelesene Chat-Nachrichten je Baustelle (0022). */
  unreadCounts: Map<string, number>;
}) {
  const isAdmin = currentUser.role === 'admin';
  const [query, setQuery] = useState('');
  const [usage, setUsage] = useState<Map<string, { count: number; bytes: number }>>(new Map());
  const [creating, setCreating] = useState(false);
  /** null = noch nie geladen. Das Archiv holt sich erst, wer danach fragt. */
  const [archived, setArchived] = useState<Site[] | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (openSiteId) return;
    fetchFileUsage().then(setUsage);
  }, [openSiteId]);

  const list = useMemo(
    () => projectSites(sites).filter((s) => matchesSearch(s, query)),
    [sites, query],
  );

  const toggleArchive = async () => {
    if (showArchive) {
      setShowArchive(false);
      return;
    }
    setShowArchive(true);
    if (archived !== null) return;
    setBusy(true);
    setError(null);
    try {
      setArchived((await fetchArchivedSites()).filter((s) => !s.is_absence_code));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const restore = async (site: Site) => {
    setBusy(true);
    setError(null);
    try {
      await setSiteActive(site.id, true);
      setArchived((prev) => prev?.filter((s) => s.id !== site.id) ?? null);
      await onSitesChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const open = sites.find((s) => s.id === openSiteId);
  if (open) {
    return (
      <ProjectDetail
        key={open.id}
        site={open}
        employees={employees}
        currentUser={currentUser}
        onBack={() => onOpenSite(null)}
        onSiteChanged={onSitesChanged}
        onArchived={async () => {
          onOpenSite(null);
          // Das Archiv hängt an einer eigenen Abfrage und erfährt sonst nichts.
          setArchived(null);
          setShowArchive(false);
          await onSitesChanged();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projekte</h2>
          <p className="text-sm text-[#141414]/50 mt-1">
            Zeitvorgaben, Pläne und Fotos aus dem Büro und ein Chat je Baustelle.
          </p>
        </div>
        {isAdmin && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="shrink-0 flex items-center gap-1.5 bg-brand-accent1 text-white px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          >
            <Plus size={16} />
            Neue Baustelle
          </button>
        )}
      </div>

      {creating && (
        <SiteForm
          submitLabel="Anlegen"
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const site = await createSite(input);
            await onSitesChanged();
            setCreating(false);
            onOpenSite(site.id);
          }}
        />
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4">{error}</p>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#141414]/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nummer, Adresse oder Kunde"
          className="w-full pl-9 p-3 bg-white rounded-xl border border-[#141414]/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent1/20"
        />
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-[#141414]/50 bg-white rounded-2xl p-4 border border-[#141414]/5">
          {query ? 'Keine Baustelle gefunden.' : 'Es sind noch keine Baustellen angelegt.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((site) => {
            const files = usage.get(site.id)?.count ?? 0;
            const unread = unreadCounts.get(site.id) ?? 0;
            return (
              <li key={site.id}>
                <button
                  onClick={() => onOpenSite(site.id)}
                  className={
                    'w-full flex items-center gap-4 bg-white rounded-2xl p-4 border shadow-sm hover:border-brand-accent1/30 text-left cursor-pointer ' +
                    (unread > 0 ? 'border-red-200' : 'border-[#141414]/5')
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{site.number}</p>
                    <p className="text-sm text-[#141414]/60 truncate">{site.address}</p>
                    {site.customer && (
                      <p className="text-xs text-[#141414]/40 truncate">{site.customer}</p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span
                      className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                      aria-label={`${unread} neue Nachrichten`}
                    >
                      <MessageCircle size={14} />
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                  {files > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#141414]/50">
                      <Paperclip size={14} />
                      {files}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-[#141414]/30" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Das Archiv liegt zugeklappt darunter: Oben soll stehen, was gerade
          läuft. Ohne diesen Weg wäre eine archivierte Baustelle nirgends mehr
          zu sehen und nicht zurückzuholen — fetchSites() lädt nur die aktiven. */}
      {isAdmin && (
        <div className="bg-white rounded-3xl shadow-sm border border-[#141414]/5 overflow-hidden">
          <button
            onClick={toggleArchive}
            className="w-full p-4 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#141414] hover:bg-gray-50 cursor-pointer"
          >
            <Archive size={16} />
            Archiv
            {archived !== null && (
              <span className="text-xs font-normal text-[#141414]/40">({archived.length})</span>
            )}
            {busy && <Loader2 size={14} className="animate-spin text-brand-accent1" />}
            <ChevronDown
              size={16}
              className={`ml-auto transition-transform ${showArchive ? 'rotate-180' : ''}`}
            />
          </button>

          {showArchive && archived && (
            <div className="border-t border-[#141414]/5">
              {archived.map((site) => (
                <div
                  key={site.id}
                  className="p-4 flex items-center justify-between border-b border-[#141414]/5 last:border-none"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-semibold text-sm text-gray-500 truncate">
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-mono mr-2">
                        {site.number}
                      </span>
                      {site.address}
                    </p>
                    {site.customer && <p className="text-xs text-gray-400 mt-0.5">{site.customer}</p>}
                  </div>
                  <button
                    onClick={() => restore(site)}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#141414] bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl disabled:opacity-60 cursor-pointer"
                  >
                    <ArchiveRestore size={14} /> Zurückholen
                  </button>
                </div>
              ))}
              {archived.length === 0 && (
                <div className="p-8 text-center text-[#141414]/30 text-sm">
                  Keine archivierten Baustellen.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
