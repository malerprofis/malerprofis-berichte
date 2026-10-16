import { format, parseISO } from 'date-fns';
import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createPdf,
  drawLetterhead,
  drawMeta,
  drawTitle,
  finishPages,
  loadPdfFonts,
  pdfDesign,
  tableOptions,
  tableTop,
  type PdfDesign,
  type PdfLogo,
} from './pdf/design.ts';
import { loadPdfLogo } from './pdf/logo.ts';
import { chatExportFileName } from './projects.ts';
import type { Site, SiteMessage } from './database.types.ts';

/**
 * Der Chatverlauf einer Baustelle als PDF. Entsteht beim Archivieren, bevor
 * Chat und Dateien gelöscht werden — danach ist das PDF das Einzige, was von
 * den Absprachen bleibt. Deshalb stehen auch die Namen der gelöschten Dateien
 * darin.
 *
 * Wie die übrigen PDFs ohne Zugriff auf Datenbank oder Oberfläche.
 */

export interface ChatPdfData {
  site: Pick<Site, 'number' | 'address' | 'customer'>;
  messages: SiteMessage[];
  /** Mitarbeiter-Id → Name. Fehlt einer, steht „Ehemaliger Mitarbeiter". */
  names: Record<string, string>;
  /** Namen der Dateien, die mit dem Archivieren gelöscht werden. */
  fileNames: string[];
  exportedAt: Date;
}

export function renderChatPdf(data: ChatPdfData, logo: PdfLogo, d: PdfDesign = pdfDesign): jsPDF {
  const doc = createPdf(d);
  drawLetterhead(doc, logo, d);
  const metaTop = drawTitle(doc, 'Chatverlauf', d);

  const metaEnd = drawMeta(
    doc,
    [
      ['Baustelle', `${data.site.number} · ${data.site.address}`],
      ...(data.site.customer ? ([['Kunde', data.site.customer]] as [string, string][]) : []),
      ['Exportiert am', format(data.exportedAt, 'dd.MM.yyyy, HH:mm')],
      ['Nachrichten', String(data.messages.length)],
      ['Gelöschte Dateien', data.fileNames.length > 0 ? data.fileNames.join(', ') : 'keine'],
    ],
    metaTop,
    d,
  );

  autoTable(doc, {
    ...tableOptions(d),
    startY: tableTop(metaEnd, d),
    head: [['Zeit', 'Von', 'Nachricht']],
    body:
      data.messages.length > 0
        ? data.messages.map((m) => [
            format(parseISO(m.created_at), 'dd.MM.yyyy HH:mm'),
            data.names[m.employee_id] ?? 'Ehemaliger Mitarbeiter',
            m.body,
          ])
        : [[{ content: 'Keine Nachrichten.', colSpan: 3 }]],
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 38 },
    },
  });

  finishPages(doc, d);
  return doc;
}

/** Baut das PDF und stößt den Download an. Gibt den Dateinamen zurück. */
export async function downloadChatPdf(data: ChatPdfData): Promise<string> {
  await loadPdfFonts(pdfDesign);
  const blob = renderChatPdf(data, await loadPdfLogo()).output('blob');
  const name = chatExportFileName(data.site.number, data.exportedAt);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // Kurz warten: Manche Browser lesen die Adresse erst nach dem Klick.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}
