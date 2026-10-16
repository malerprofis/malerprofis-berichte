import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { INVALID_HOURS, parseHours } from '../../lib/projects.ts';
import type { SiteInput } from '../../lib/project-data.ts';
import type { Site } from '../../lib/database.types.ts';

const inputClass =
  'w-full p-3 bg-gray-100 rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent1/20';
const labelClass = 'text-[11px] font-semibold text-[#141414]/40 uppercase tracking-wider block mb-1';

/**
 * Anlegen und Bearbeiten einer Baustelle — nur fürs Büro. Früher stand das
 * unter Verwaltung; jetzt liegt alles zu einer Baustelle an einem Ort.
 *
 * Die Adresse wird als Navigationslink geöffnet. Damit Apple Karten und Google
 * Maps sie sicher finden, fragt das Formular nach Straße, Hausnummer, PLZ und Ort.
 */
export default function SiteForm({
  site,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  site?: Site;
  submitLabel: string;
  onSubmit: (input: SiteInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [number, setNumber] = useState(site?.number ?? '');
  const [address, setAddress] = useState(site?.address ?? '');
  const [customer, setCustomer] = useState(site?.customer ?? '');
  const [hours, setHours] = useState(site?.total_hours != null ? String(site.total_hours).replace('.', ',') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!number.trim() || !address.trim()) {
      setError('Bitte Nummer und Adresse angeben.');
      return;
    }
    const totalHours = parseHours(hours);
    if (totalHours === 'ungültig') {
      setError(INVALID_HOURS);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ number, address, customer: customer || null, totalHours });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#141414]/5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
        <div>
          <label className={labelClass}>Nummer</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="z. B. 214-5"
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Adresse</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Straße Hausnr., PLZ Ort"
            autoComplete="street-address"
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-[11px] text-[#141414]/40 -mt-1">
        Vollständig mit PLZ und Ort eingeben, z. B. „Wandsbeker Chaussee 12, 22089 Hamburg“ —
        dann öffnet ein Tipp auf die Adresse direkt die Navigation.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-3">
        <div>
          <label className={labelClass}>Kunde (optional)</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Std. gesamt</label>
          <input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputMode="decimal"
            placeholder="optional"
            title="Veranschlagte Gesamtstunden. Leer lassen, wenn die Baustelle nicht in der Leiste der Wochenplanung erscheinen soll."
            className={`${inputClass} text-right`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-accent1 text-white p-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 bg-gray-200 p-3 rounded-xl font-bold text-sm cursor-pointer"
        >
          Abbruch
        </button>
      </div>
    </div>
  );
}
