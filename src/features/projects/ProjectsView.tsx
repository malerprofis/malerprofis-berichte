import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Paperclip, Search } from 'lucide-react';
import { fetchFileUsage } from '../../lib/project-data.ts';
import { matchesSearch, projectSites } from '../../lib/projects.ts';
import type { Employee, Site } from '../../lib/database.types.ts';
import ProjectDetail from './ProjectDetail.tsx';

/**
 * Der Reiter „Projekte": alle laufenden Baustellen mit den Unterlagen aus dem
 * Büro und einem Chat je Baustelle.
 *
 * Jeder Maler sieht jede Baustelle — so muss das Büro niemanden einzeln
 * freischalten (0019_site_files_and_chat.sql).
 */
export default function ProjectsView({
  sites,
  employees,
  currentUser,
  onSitesChanged,
}: {
  sites: Site[];
  employees: Employee[];
  currentUser: Employee;
  /** Nach dem Speichern der Hinweise die Baustellen neu laden. */
  onSitesChanged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Map<string, { count: number; bytes: number }>>(new Map());

  useEffect(() => {
    if (openId) return;
    fetchFileUsage().then(setUsage);
  }, [openId]);

  const list = useMemo(
    () => projectSites(sites).filter((s) => matchesSearch(s, query)),
    [sites, query],
  );

  const open = sites.find((s) => s.id === openId);
  if (open) {
    return (
      <ProjectDetail
        site={open}
        employees={employees}
        currentUser={currentUser}
        onBack={() => setOpenId(null)}
        onSiteChanged={onSitesChanged}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Projekte</h2>
        <p className="text-sm text-[#141414]/50 mt-1">
          Zeitvorgaben, Pläne und Fotos aus dem Büro und ein Chat je Baustelle.
        </p>
      </div>

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
            return (
              <li key={site.id}>
                <button
                  onClick={() => setOpenId(site.id)}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#141414]/5 shadow-sm hover:border-brand-accent1/30 text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{site.number}</p>
                    <p className="text-sm text-[#141414]/60 truncate">{site.address}</p>
                    {site.customer && (
                      <p className="text-xs text-[#141414]/40 truncate">{site.customer}</p>
                    )}
                  </div>
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
    </div>
  );
}
