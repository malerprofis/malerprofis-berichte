import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUnreadCounts, markSiteRead, subscribeAllSiteMessages } from '../../lib/project-data.ts';

/**
 * Ungelesene Chat-Nachrichten je Baustelle, live mitgezählt (0022).
 *
 * `visibleSiteId` ist die Baustelle, deren Chat gerade auf dem Bildschirm
 * steht. Sie zählt nicht hoch, sondern wird beim Öffnen und bei jeder neuen
 * Nachricht als gelesen gemerkt.
 *
 * Am Handy schläft die Live-Verbindung, sobald die App im Hintergrund liegt.
 * Was in der Zeit kam, holt der Abgleich beim Zurückkehren nach.
 */
export function useUnreadChats(currentUserId: string | undefined, visibleSiteId: string | null) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const visible = useRef(visibleSiteId);
  visible.current = visibleSiteId;

  const refresh = useCallback(async () => {
    const next = await fetchUnreadCounts();
    // Die offene Baustelle ist gelesen, auch wenn der Abgleich etwas anderes
    // meint — der Lesestand dazu kann noch unterwegs sein.
    if (visible.current) next.delete(visible.current);
    setCounts(next);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    refresh();

    const unsubscribe = subscribeAllSiteMessages({
      onInsert: (m) => {
        if (m.employee_id === currentUserId) return;
        if (m.site_id === visible.current) {
          markSiteRead(m.site_id);
          return;
        }
        setCounts((prev) => new Map(prev).set(m.site_id, (prev.get(m.site_id) ?? 0) + 1));
      },
      // Welche Nachricht gelöscht wurde, verrät die Live-Meldung nicht
      // zuverlässig genug zum Abziehen. Neu zählen ist billig.
      onDelete: () => refresh(),
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUserId, refresh]);

  useEffect(() => {
    if (!visibleSiteId) return;
    markSiteRead(visibleSiteId);
    setCounts((prev) => {
      if (!prev.has(visibleSiteId)) return prev;
      const next = new Map(prev);
      next.delete(visibleSiteId);
      return next;
    });
  }, [visibleSiteId]);

  let total = 0;
  for (const n of counts.values()) total += n;

  // Die Zahl am App-Symbol, wo das Gerät das kann (installierte App).
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (total > 0) nav.setAppBadge?.(total).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [total]);

  return { counts, total };
}
