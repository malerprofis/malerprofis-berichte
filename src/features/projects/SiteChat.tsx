import { useEffect, useRef, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2, Send, Trash2 } from 'lucide-react';
import {
  deleteSiteMessage,
  fetchSiteMessages,
  sendSiteMessage,
  subscribeSiteMessages,
} from '../../lib/project-data.ts';
import { cleanMessage, MAX_MESSAGE_LENGTH, mergeMessage } from '../../lib/projects.ts';
import type { Employee, SiteMessage } from '../../lib/database.types.ts';

function timeLabel(iso: string): string {
  const date = parseISO(iso);
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'd. MMM, HH:mm', { locale: de });
}

/**
 * Chat einer Baustelle. Neue Nachrichten kommen live; schreiben darf jeder
 * aus der Mannschaft, löschen der Verfasser und das Büro (0019).
 */
export default function SiteChat({
  siteId,
  employees,
  currentUser,
}: {
  siteId: string;
  employees: Employee[];
  currentUser: Employee;
}) {
  const isAdmin = currentUser.role === 'admin';
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSiteMessages(siteId)
      .then((loaded) => {
        if (!cancelled) setMessages(loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeSiteMessages(siteId, {
      onInsert: (m) => setMessages((prev) => mergeMessage(prev, m)),
      onDelete: (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [siteId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const nameOf = (id: string) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.first_name} ${e.last_name}` : 'Ehemaliger Mitarbeiter';
  };

  const send = async () => {
    const body = cleanMessage(draft);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendSiteMessage(siteId, currentUser.id, body);
      setMessages((prev) => mergeMessage(prev, sent));
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSending(false);
  };

  const remove = async (message: SiteMessage) => {
    if (!window.confirm('Nachricht löschen?')) return;
    try {
      await deleteSiteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-[#141414]/5 flex flex-col h-[70vh] md:h-[calc(100vh-12rem)]">
      <h3 className="px-5 pt-5 pb-3 text-[11px] font-semibold text-[#141414]/40 uppercase tracking-wider">
        Chat
      </h3>

      <div className="flex-1 overflow-y-auto px-5 space-y-3">
        {loading ? (
          <Loader2 size={20} className="animate-spin text-brand-accent1" />
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#141414]/40">
            Noch keine Nachrichten. Alles, was diese Baustelle betrifft, kann hier rein.
          </p>
        ) : (
          messages.map((m) => {
            const own = m.employee_id === currentUser.id;
            return (
              <div key={m.id} className={'flex ' + (own ? 'justify-end' : 'justify-start')}>
                <div
                  className={
                    'group max-w-[85%] rounded-2xl px-3.5 py-2 ' +
                    (own ? 'bg-brand-accent1 text-white' : 'bg-gray-100 text-[#141414]')
                  }
                >
                  {!own && <p className="text-xs font-bold mb-0.5">{nameOf(m.employee_id)}</p>}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <div
                    className={
                      'flex items-center justify-end gap-2 mt-0.5 text-[10px] ' +
                      (own ? 'text-white/70' : 'text-[#141414]/40')
                    }
                  >
                    {(own || isAdmin) && (
                      <button
                        onClick={() => remove(m)}
                        className="opacity-60 hover:opacity-100 cursor-pointer"
                        aria-label="Nachricht löschen"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    <span>{timeLabel(m.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      {error && <p className="mx-5 mt-2 text-xs text-red-700">{error}</p>}

      <div className="p-3 flex gap-2 items-end border-t border-[#141414]/5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Am Rechner schickt Enter ab, Umschalt+Enter macht eine neue Zeile.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Nachricht"
          className="flex-1 resize-none p-3 bg-gray-100 rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent1/20 max-h-32"
        />
        <button
          onClick={send}
          disabled={sending || !cleanMessage(draft)}
          className="w-11 h-11 flex items-center justify-center bg-brand-accent1 text-white rounded-xl cursor-pointer disabled:opacity-40"
          aria-label="Senden"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </section>
  );
}
