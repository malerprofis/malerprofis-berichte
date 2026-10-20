---
titel: Datenschutzhinweis für Mitarbeiter
app: Malerprofis Uderstadt
gilt_fuer: Alle Mitarbeiter, die die App nutzen
sprache: de
quelle: docs/datenschutz-mitarbeiter.md
pdf: docs/Datenschutzhinweis-Mitarbeiter.pdf
deckblatt_oben: Datenschutz
deckblatt_unten: in der Mitarbeiter-App
einleitung: Welche Daten die App über dich speichert, wofür, wer sie sieht und welche Rechte du hast. Information nach Art. 13 DSGVO.
hinweis_fuer_ki: >
  Diese Datei ist die einzige Quelle des Datenschutzhinweises. Das PDF wird
  daraus mit `tsx scripts/build-anleitung.ts docs/datenschutz-mitarbeiter.md`
  erzeugt und nie von Hand bearbeitet. Jede Angabe muss zum Quelltext der App
  passen (Tabellen in supabase/migrations, Speicher im Browser in src/lib).
  Kommt eine neue Datenart oder ein neuer Dienstleister hinzu, muss diese Datei
  mitgezogen werden.
---

# Datenschutzhinweis für Mitarbeiter

## 1. Worum es geht

Die App ersetzt Zettel, Mails und Anrufe zwischen Baustelle und Büro. Dafür
speichert sie Daten über dich. Hier steht, welche das sind, wofür wir sie
brauchen und was mit ihnen passiert.

### Wer verantwortlich ist

Verantwortlich für deine Daten ist dein Arbeitgeber:

**Malermeister Uderstadt GmbH**, Luisenweg 7, 20537 Hamburg

Fragen zum Datenschutz stellst du am einfachsten direkt im Büro, mündlich oder
schriftlich.

## 2. Welche Daten die App speichert

| Bereich | Was gespeichert wird |
| --- | --- |
| Konto | Vor- und Nachname, Zugangsdaten (Passwort nur verschlüsselt), Rolle, Resturlaub |
| Wochenplanung | Auf welcher Baustelle du an welchem Tag eingeteilt bist |
| Wochenberichte | Arbeitszeiten, Tätigkeiten je Tag und Baustelle, deine Unterschrift |
| Urlaub und Krankheit | Urlaubsanträge und deren Status, Krankheitstage (nur das Datum, keine Diagnose) |
| Auslagen | Beträge, Belegfotos, Abrechnungen |
| Abnahme | Protokolle mit Fotos, Mängeln, deiner Unterschrift und der des Kunden |
| Projekte | Deine Nachrichten im Baustellen-Chat und Dateien, die du hochlädst |
| Push | Ob und wofür du Push-Nachrichten bekommen willst, und die Adresse deines Geräts dafür |

> **Kein Standort, keine Ortung.** Die App fragt deinen Standort nicht ab und
> zeichnet nicht auf, wo du dich aufhältst.

## 3. Wofür und auf welcher Grundlage

| Zweck | Rechtsgrundlage |
| --- | --- |
| Einsatzplanung, Wochenberichte, Lohnabrechnung, Auslagen erstatten | Arbeitsvertrag, Art. 6 Abs. 1 lit. b DSGVO |
| Arbeitszeit aufzeichnen und aufbewahren | Gesetzliche Pflicht, Art. 6 Abs. 1 lit. c DSGVO mit § 16 Abs. 2 ArbZG |
| Belege und lohnrelevante Unterlagen aufbewahren | Gesetzliche Pflicht, Art. 6 Abs. 1 lit. c DSGVO mit § 147 AO und § 41 EStG |
| Krankheitstage erfassen (Entgeltfortzahlung) | Arbeitsrecht, Art. 9 Abs. 2 lit. b DSGVO |
| Abnahmen und Baustellen-Chat | Arbeitsvertrag, Art. 6 Abs. 1 lit. b DSGVO |
| Push-Nachrichten | Deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO |

Push-Nachrichten sind freiwillig. Du schaltest sie in der App ein und jederzeit
wieder aus. Ohne Push funktioniert die App genauso.

## 4. Wer die Daten sieht

| Wer | Was |
| --- | --- |
| Du selbst | Deine eigenen Berichte, Anträge, Auslagen und Abnahmen |
| Das Büro | Alle Daten aller Mitarbeiter, um planen und abrechnen zu können |
| Alle Kollegen | Die Wochenplanung, alle Projekte mit ihren Dateien und den Baustellen-Chat |
| Bürofernseher | Die Wochenplanung mit Namen, Baustellen und Abwesenheiten sowie den Urlaubsplan des Jahres |

Wochenberichte, Auslagen, Urlaubsanträge und Abnahmen anderer Kollegen siehst
du nicht, und sie sehen deine nicht. Diese Grenzen zieht die Datenbank selbst,
nicht nur die Oberfläche.

> **Was du in den Chat schreibst, lesen alle Kollegen.** Schreib dort nur, was
> zur Baustelle gehört, und nichts Privates über dich oder andere.

## 5. Dienstleister

Die App läuft nicht auf einem eigenen Server im Büro. Diese Dienstleister sind
beteiligt:

| Dienstleister | Aufgabe |
| --- | --- |
| Supabase Inc. | Datenbank, Login und Dateispeicher. Mit Supabase besteht ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) mit EU-Standardvertragsklauseln. |
| GitHub Inc. (Microsoft) | Liefert die App-Seite aus und sieht dabei technisch deine IP-Adresse. Deine Daten in der App sieht GitHub nicht. GitHub ist nach dem EU-US Data Privacy Framework zertifiziert. |
| Apple, Google oder Mozilla | Nur bei eingeschaltetem Push: Sie stellen die Nachricht auf dein Gerät zu. Der Inhalt ist dabei verschlüsselt. |

Darüber hinaus geben wir deine Daten nur weiter, wenn ein Gesetz es verlangt,
zum Beispiel an Steuerberater, Krankenkasse oder Finanzamt.

## 6. Was auf deinem Handy gespeichert wird

Die App legt einige Daten im Browser deines Geräts ab, damit sie schnell und
auch ohne Netz funktioniert:

- **Deine Anmeldung**, damit du dich nicht jedes Mal neu einloggen musst.
- **Entwürfe** von Wochenberichten, solange du sie noch nicht abgegeben hast.
- **Auslagen und Abnahmen**, die ohne Netz erfasst wurden, bis sie übertragen sind.
- **Die App selbst**, damit sie sofort startet.

Das ist technisch nötig (§ 25 Abs. 2 TDDDG). Die App setzt keine Werbe- oder
Analyse-Cookies und bindet keine Tracking-Dienste ein.

## 7. Wie lange die Daten bleiben

| Daten | Wie lange |
| --- | --- |
| Baustellen-Chat und Projektdateien | Bis die Baustelle archiviert wird. Der Chat wird dabei als PDF gesichert. |
| Wochenberichte und Arbeitszeiten | Mindestens 2 Jahre (§ 16 Abs. 2 ArbZG), als Lohnunterlage 6 Jahre |
| Auslagen und Belege | 8 Jahre (§ 147 AO) |
| Push-Anmeldung | Bis du Push ausschaltest oder das Gerät wechselst |
| Konto | Nach deinem Ausscheiden wird es gesperrt und gelöscht, sobald keine Aufbewahrungsfrist mehr läuft |

## 8. Deine Rechte

Du hast das Recht auf:

- **Auskunft** über die Daten, die wir über dich speichern (Art. 15 DSGVO).
- **Berichtigung** falscher Daten (Art. 16 DSGVO).
- **Löschung**, soweit keine Aufbewahrungspflicht entgegensteht (Art. 17 DSGVO).
- **Einschränkung** der Verarbeitung (Art. 18 DSGVO).
- **Datenübertragbarkeit** (Art. 20 DSGVO).
- **Widerspruch** gegen die Verarbeitung (Art. 21 DSGVO).
- **Widerruf** deiner Einwilligung für Push, jederzeit und für die Zukunft.

Dafür reicht eine kurze Nachricht ans Büro.

### Beschwerde

Du kannst dich auch bei der Aufsichtsbehörde beschweren:

**Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit**,
Ludwig-Erhard-Straße 22, 20459 Hamburg
