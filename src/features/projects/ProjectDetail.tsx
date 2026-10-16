import { useCallback, useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowLeft, FileText, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { fetchPlannedHoursPerSite } from '../../lib/data.ts';
import {
  deleteSiteFiles,
  fetchSiteFiles,
  siteFileUrls,
  updateSiteNotes,
  uploadSiteFile,
} from '../../lib/project-data.ts';
import { formatBytes } from '../../lib/projects.ts';
import type { Employee, Site, SiteFile } from '../../lib/database.types.ts';
import SiteChat from './SiteChat.tsx';

type Section = 'unterlagen' | 'chat';

const card = 'bg-white p-5 rounded-3xl shadow-sm border border-[#141414]/5';
const heading = 'text-[11px] font-semibold text-[#141414]/40 uppercase tracking-wider';

/**
 * Eine Baustelle: oben, was das Büro vorgibt (Stunden, Hinweise, Unterlagen),
 * daneben bzw. am Handy im zweiten Reiter der Chat.
 */
export default function ProjectDetail({
  site,
  employees,
  currentUser,
  onBack,
  onSiteChanged,
}: {
  site: Site;
  employees: Employee[];
  currentUser: Employee;
  onBack: () => void;
  onSiteChanged: () => void;
}) {
  const isAdmin = currentUser.role === 'admin';
  const [section, setSection] = useState<Section>('unterlagen');
  const [files, setFiles] = useState<SiteFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [plannedHours, setPlannedHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(site.notes ?? '');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const loaded = await fetchSiteFiles(site.id);
      setFiles(loaded);
      setUrls(await siteFileUrls(loaded.map((f) => f.path)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [site.id]);

  useEffect(() => {
    load();
    fetchPlannedHoursPerSite()
      .then((map) => setPlannedHours(map.get(site.id) ?? 0))
      .catch(() => setPlannedHours(null));
  }, [load, site.id]);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (chosen.length === 0) return;
    setError(null);
    const problems: string[] = [];
    for (const [i, file] of chosen.entries()) {
      setBusy(`Lade ${i + 1} von ${chosen.length} hoch …`);
      try {
        await uploadSiteFile(site.id, file, currentUser.id);
      } catch (e) {
        problems.push(e instanceof Error ? e.message : String(e));
      }
    }
    setBusy(null);
    if (problems.length > 0) setError(problems.join('\n'));
    await load();
  };

  const remove = async (toRemove: SiteFile[], question: string) => {
    if (!window.confirm(question)) return;
    setBusy('Lösche …');
    setError(null);
    try {
      await deleteSiteFiles(toRemove);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
    await load();
  };

  const saveNotes = async () => {
    setBusy('Speichere …');
    setError(null);
    try {
      await updateSiteNotes(site.id, notesDraft);
      setEditingNotes(false);
      onSiteChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  const documents = files.filter((f) => f.kind === 'document');
  const photos = files.filter((f) => f.kind === 'photo');
  const totalBytes = files.reduce((sum, f) => sum + f.size_bytes, 0);

  const unterlagen = (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={heading}>Vorgaben</h3>
          {isAdmin && !editingNotes && (
            <button
              onClick={() => {
                setNotesDraft(site.notes ?? '');
                setEditingNotes(true);
              }}
              className="text-[#141414]/40 hover:text-brand-accent1 cursor-pointer"
              aria-label="Hinweise bearbeiten"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
        {site.total_hours != null && (
          <p className="text-sm">
            <span className="font-bold">{site.total_hours.toLocaleString('de-DE')} Std.</span>{' '}
            veranschlagt
            {plannedHours != null && (
              <span className="text-[#141414]/50">
                {' '}· {plannedHours.toLocaleString('de-DE')} Std. verplant
              </span>
            )}
          </p>
        )}
        {editingNotes ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
              placeholder="z. B. Schlüssel beim Hausmeister, Treppenhaus bis Freitag fertig"
              className="w-full p-3 bg-gray-100 rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent1/20"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                disabled={busy !== null}
                className="flex-1 bg-brand-accent2 text-white p-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                onClick={() => setEditingNotes(false)}
                className="flex-1 bg-gray-200 p-2.5 rounded-xl font-bold text-sm cursor-pointer"
              >
                Abbruch
              </button>
            </div>
          </div>
        ) : site.notes ? (
          <p className="text-sm whitespace-pre-wrap mt-1">{site.notes}</p>
        ) : (
          site.total_hours == null && (
            <p className="text-sm text-[#141414]/40">Keine Vorgaben hinterlegt.</p>
          )
        )}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={heading}>Unterlagen</h3>
          {isAdmin && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={upload}
                className="hidden"
              />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={busy !== null}
                className="flex items-center gap-1.5 bg-brand-accent1 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} />
                Hochladen
              </button>
            </>
          )}
        </div>

        {busy && (
          <p className="flex items-center gap-2 text-sm text-brand-accent1 mb-3">
            <Loader2 size={14} className="animate-spin" />
            {busy}
          </p>
        )}

        {loading ? (
          <Loader2 size={20} className="animate-spin text-brand-accent1" />
        ) : files.length === 0 ? (
          <p className="text-sm text-[#141414]/40">
            {isAdmin
              ? 'Noch nichts hochgeladen. PDFs bleiben unverändert, Fotos werden automatisch verkleinert.'
              : 'Das Büro hat noch keine Unterlagen hochgeladen.'}
          </p>
        ) : (
          <div className="space-y-4">
            {documents.length > 0 && (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3">
                    <a
                      href={urls[doc.path]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-0 flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                    >
                      <FileText size={20} className="text-brand-accent1 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{doc.name}</span>
                        <span className="block text-xs text-[#141414]/40">
                          {format(parseISO(doc.created_at), 'd. MMM yyyy', { locale: de })} ·{' '}
                          {formatBytes(doc.size_bytes)}
                        </span>
                      </span>
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => remove([doc], `„${doc.name}" löschen?`)}
                        className="text-[#141414]/30 hover:text-red-600 cursor-pointer"
                        aria-label={`${doc.name} löschen`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square">
                    <a href={urls[photo.path]} target="_blank" rel="noreferrer">
                      <img
                        src={urls[photo.path]}
                        alt={photo.name}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-xl bg-gray-100"
                      />
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => remove([photo], 'Dieses Foto löschen?')}
                        className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-white/90 rounded-lg text-[#141414]/50 hover:text-red-600 cursor-pointer"
                        aria-label="Foto löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center justify-between pt-2 border-t border-[#141414]/5 text-xs text-[#141414]/40">
                <span>
                  {files.length} Dateien · {formatBytes(totalBytes)}
                </span>
                <button
                  onClick={() =>
                    remove(
                      files,
                      `Alle ${files.length} Dateien dieser Baustelle löschen? Das lässt sich nicht rückgängig machen.`,
                    )
                  }
                  className="hover:text-red-600 cursor-pointer"
                >
                  Alle löschen
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#141414]/10 cursor-pointer shrink-0"
          aria-label="Zurück zur Liste"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">{site.number}</h2>
          <p className="text-sm text-[#141414]/60">{site.address}</p>
          {site.customer && <p className="text-xs text-[#141414]/40">{site.customer}</p>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4 whitespace-pre-line">
          {error}
        </p>
      )}

      {/* Am Handy zwei Reiter, am großen Bildschirm nebeneinander. */}
      <div className="flex md:hidden bg-white rounded-xl p-1 border border-[#141414]/10">
        {(['unterlagen', 'chat'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={
              'flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer ' +
              (section === s ? 'bg-brand-accent1/10 text-brand-accent1' : 'text-[#141414]/50')
            }
          >
            {s === 'unterlagen' ? 'Unterlagen' : 'Chat'}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        <div className={section === 'unterlagen' ? '' : 'hidden md:block'}>{unterlagen}</div>
        <div className={section === 'chat' ? '' : 'hidden md:block'}>
          <SiteChat siteId={site.id} employees={employees} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}
