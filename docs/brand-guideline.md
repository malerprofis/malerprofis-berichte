# Brand Guideline – Malerprofis Uderstadt

Gilt für die Berichte-App, ihre PDFs und alle weiteren kleinen Apps oder Artefakte, die wie „aus demselben Haus“ aussehen sollen. Quelle: `src/index.css`, `src/App.tsx`, `src/components/LoginScreen.tsx`, `pdf-designer/template.html`, `public/icons/logo.png`.
Eine anschauliche Version mit Farbfeldern und Bausteinen: [`brand-guideline.html`](brand-guideline.html).

## 1. Charakter

**Feines Handwerk, aufgeräumt, werkzeughaft.** Viel Weiß und helles Grau, ein ruhiges Blau als Hauptfarbe, ein frisches Grün als Gegenstück. Große Rundungen, flache Schatten, kräftige Beschriftungen. Gebaut für Handys auf der Baustelle: große Tippflächen, kurze deutsche Texte, keine Zierde.

Tonalität: Du-frei, sachlich, kurz. „Anmelden“, „Foto hinzufügen“, „Speichern“. Keine Ausrufezeichen, keine Marketingsprache.

## 2. Logo

- Datei: `public/icons/logo.png` – Wortmarke „malerprofis.uderstadt“ in Dunkelgrau, darunter „FEINES HANDWERK®“, umschlungen von einem grünen (oben) und blauen (unten) Schwung.
- Logo immer auf Weiß oder `#fefefe`, nie auf Farbflächen oder Fotos.
- Höhe: 80 px (`h-20`) im Login, in Navigation und Kopfzeile kleiner; Breite automatisch, nie verzerren.
- Freiraum: mindestens die Höhe des „m“ rundum.
- Favicon/App-Icons liegen in `public/icons/`.

## 3. Farben

Die Marke ist **Blau + Grün**. Alles andere ist Neutral oder Signalfarbe.

| Rolle | Wert | Verwendung |
|---|---|---|
| Brand Blau (`accent1`) | `#3981b7` | Primärbutton, Links, aktive Navigation, Fokusring, `theme-color` |
| Brand Grün (`accent2`) | `#40a56d` | Bestätigung, positive Akzente, zweite Datenfarbe |
| Hintergrund | `#fefefe` | Seitengrund, Login |
| Tinte | `#141414` | Fließtext, Überschriften, Hairline-Rahmen (`/5`–`/10` Deckkraft) |
| Karte | `#ffffff` | Karten, Navigation, Modale |
| Fläche | `gray-50` / `gray-100` | Eingabefelder, Chips, Kopfzeile (`gray-100/80` + Blur) |
| Linie | `gray-200` | Trenner, Chip-Rahmen |
| Text gedämpft | `gray-500` / `gray-400` | Hilfstexte, Labels / Fußzeilen |

**Signalfarben** (immer als Paar: sehr helle Fläche + dunkler Text, Rahmen `-100`):

| Zustand | Fläche | Text |
|---|---|---|
| Fehler / Löschen | `red-50` | `red-600` / `red-700` |
| Warnung / Hinweis | `amber-50` (Spalten `amber-50/40`) | `amber-800` |
| Erfolg | `emerald-50` | `emerald-700` / `emerald-800` |

Regeln: Blau ist die einzige Aktionsfarbe – nie ein zweites Blau oder Grün als Button. Signalfarben nur für Zustände, nie als Dekoration. Text auf Blau ist weiß.

**Dunkelmodus** (nur PDF-Designer/Artefakte, wo gebraucht): Grund `#0e1318`, Karte `#161d25`, Tinte `#e3e9ef`, Linie `#2a3541`, Akzent aufgehellt `#6aa9dc` mit dunkler Schrift `#0b1620`.

**Kühle Variante für Artefakte/PDF** (statt reinem Grau): Grund `#e9eef3`, Karte `#fff`, Fläche `#f5f8fb`, Tinte `#15202b`, gedämpft `#5b6876`, Linie `#d4dce4`, Akzent-Soft `#e3eef7`, OK `#2f8a58` / `#e2f3e9`, Warnung `#9a6a0e` / `#fbf0d9`.

## 4. Typografie

- **Inter** (300–700) für alles. **JetBrains Mono** (400/500) für Codes, Zeiten, Baustellennummern (z. B. `050-7`), Versionsnummer.
- Antialiased. Tinte `#141414`.

| Einsatz | Klasse |
|---|---|
| Seitentitel | `text-2xl`/`text-3xl font-bold` |
| Kartentitel | `text-lg`/`text-xl font-bold` |
| Fließtext, Eingaben | `text-sm` |
| Hilfstext | `text-sm text-gray-500` |
| **Feldlabel** (Markenzeichen!) | `text-xs font-bold uppercase tracking-wider text-gray-500` |
| Chips, Meta | `text-xs font-medium` |
| Winzig (Zähler) | `text-[10px]` |

Fett ist Standard für Überschriften, Labels und Buttons (`font-bold`); `font-semibold` für Zwischenebenen. Kein Kursiv, kein Unterstreichen außer Links.

## 5. Form, Abstand, Tiefe

- **Radien:** Karten und Modale `rounded-3xl`; Eingaben, Buttons, Meldungen `rounded-xl`; kleine Elemente `rounded-lg`; Chips und Rundbuttons `rounded-full`.
- **Karte:** `bg-white p-6 rounded-3xl shadow-sm border border-[#141414]/5 space-y-4`.
- **Schatten:** nur `shadow-sm`; `shadow-lg` ausschließlich für schwebende Menüs/Modale. Tiefe entsteht durch Hairline-Rahmen, nicht durch Schatten.
- **Abstand:** 4-px-Raster (Tailwind). Karten untereinander `mb-6`, Karteninhalt `space-y-4`, Label→Feld `space-y-1`, Seitenrand `p-6`.
- **Breite:** Formulare/Login `max-w-sm`; Inhalt zentriert. Ab `md` feste Seitennavigation (`w-64`, weiß, rechter Hairline-Rahmen), darunter sticky Kopfzeile mit Blur.
- **Modal-Hintergrund:** `bg-black/50`, Inhalt zentriert in Karte.

## 6. Bausteine

**Primärbutton** – `bg-brand-accent1 hover:bg-brand-accent1/90 text-white font-bold py-3 rounded-xl`, volle Breite auf dem Handy, Icon (Lucide, 18 px) links vom Text, `disabled:opacity-60`, `transition-colors`. Ladezustand: `Loader2` mit `animate-spin` statt Icon.

**Sekundärbutton** – `bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl`. **Gefährlich** – `bg-red-50 text-red-600 hover:bg-red-100`.

**Eingabefeld** – `w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent1/40`, darüber das Feldlabel (siehe Typografie).

**Chip** – `bg-gray-100 border border-gray-200/50 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm`; Entfernen-Knopf `w-4 h-4 rounded-full`, Hover `bg-red-100 text-red-600`.

**Meldung** – Fläche `-50/60`, Rahmen `-100`, Text kräftig, `rounded-xl p-3 text-sm` (Fehler rot, Erfolg emerald, Hinweis amber).

**Rundbutton (Icon)** – `p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-brand-accent1`, immer mit `title`.

**Raster/Planung** – Zeilen getrennt durch `border-t border-[#141414]/5`; Sonderspalten (Wochenende, Hinweis) mit `amber-50/40`.

**Icons** – ausschließlich *lucide-react*, 16–20 px, Strichstärke Standard, Farbe folgt dem Text.

## 7. Bewegung & Verhalten

Nur `transition-colors`, Spinner und weiche Hover. Keine Einblend-Animationen, kein Springen. Fokus immer sichtbar (Blau-Ring 40 %). Tippflächen mindestens 40 px hoch. Mobile zuerst; Desktop ergänzt nur die Seitennavigation.

## 8. PDFs

Gestaltet im PDF-Designer (siehe `pdf-designer/README.md`): Briefkopf mit Markenzeile, Blau als Akzent, weiße Summenzeile, ruhige Tabellen mit feinen Linien in `#d4dce4`, Inter-ähnliche Sans. Dieselben Farben wie oben, kein Verlauf, keine Rahmenschatten.

## 9. Do / Don’t

- ✅ Weiß, Hairline, große Rundung, ein Blau, fette Großbuchstaben-Labels.
- ✅ Signalfarben als helle Fläche + dunkler Text.
- ❌ Kein Schwarz als Fläche (außer Tinte als Text/Rahmen), keine Verläufe, keine Glas-/Neon-Effekte.
- ❌ Kein Logo auf Farbe, keine zweite Akzentfarbe als Button, keine eckigen Karten.
- ❌ Kein Englisch in der Oberfläche; Daten als `TT.MM.JJJJ`, Zeiten 24 h, Codes in Mono.

## 10. Startvorlage (Tailwind v4)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --color-brand-bg: #fefefe;
  --color-brand-accent1: #3981b7;
  --color-brand-accent2: #40a56d;
}
@layer base { body { @apply antialiased bg-brand-bg text-[#141414]; } }
```

Für Artefakte ohne Tailwind die Werte aus Abschnitt 3 als CSS-Variablen (`--accent`, `--ink`, `--line`, …) übernehmen; `brand-guideline.html` enthält eine fertige Variablenliste samt Dunkelmodus.
