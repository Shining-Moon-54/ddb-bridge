# Lokaler Kompendien-Testimport (Alpha / Entwicklungsbranch)

**Kein D&D-Beyond-Adapter.** Diese Funktion kann **keine gekauften D&D-Beyond-Bücher herunterladen** und kontrolliert keine Kontoberechtigungen. Sie testet den Schreibpfad für synthetische oder selbst erstellte lokale Daten. Nur `fixture` und `local` dürfen Dokumente erzeugen; `access: "confirmed"` für `dndbeyond` reicht ausdrücklich **nicht**.

## In einer Foundry-V14-Testwelt ausprobieren

1. Feature-Branch als Entwicklungs-ZIP bauen. Original-Modul und Map-Library-Daten vorher sichern.
2. Foundry V14, dnd5e 6.x und DDB Bridge in einer **separaten Testwelt** starten.
3. Als Spielleitung „DDB Bridge – Bücher“ öffnen.
4. Die frei erfundene Datei [native-book.sample.json](../examples/native-book.sample.json) auswählen.
5. Inventar prüfen: ein Zauber und ein Gegenstand sind als native-kompatible Kandidaten vorbereitet. Ein Monster wird als **nicht unterstützt** angezeigt.
6. Die Schaltfläche „Testdaten in eigene Welt-Kompendien importieren“ auswählen und die ausdrückliche Rückfrage bestätigen.
7. Im Kompendiumverzeichnis nach den zwei **Welt-Kompendien** mit Präfix „DDB Bridge“ suchen. Zauber und Gegenstand öffnen und auf gültige dnd5e-Sheets kontrollieren.
8. Dieselbe JSON-Datei erneut importieren: keine Dubletten; vorhandene Einträge werden nicht verändert.

**Nicht in Produktivwelten testen:** Node-Tests simulieren Foundry-API-Aufrufe, ersetzen aber keine echte V14/dnd5e-6-Laufzeitprüfung.

## Eingabeformat

`book.provider` ist `fixture` oder `local`. Die übrigen Buchfelder folgen [dem Zwischenformat](DDB_BRIDGE_DATENVERTRAG.md). Jeder importierbare Eintrag muss `kind: "spell"` oder `kind: "item"` und einen **explizit nativen** Payload enthalten:

- `payload.format: "foundry-dnd5e-v6"`
- `payload.name`: nicht leer
- `payload.type`: bei `spell` ebenfalls `spell`, bei `item` einer von `equipment`, `weapon`, `consumable`, `loot`, `tool`, `container`
- `payload.system`: ein Objekt mit bereits an die erkannte dnd5e-Version angepassten Feldern; Zauber brauchen `system.level` (0–9).

Das Modul überträgt **keine beliebigen D&D-Beyond-JSONs** in diese Struktur. Für reguläre DDB-Inhalte muss später erst ein separater legaler, berechtigter Quellenadapter samt Parser und Konverter erstellt werden. Keine eingebetteten Bilddateien, Tokens, Journal-Seiten oder automatischen Zauber-Aktivitäten werden aus Inventardaten erfunden.

## Sicherheitsgrenzen und Wiederholung

- Maximal 4 MiB JSON-Datei in der Oberfläche, 250 Einträge pro Testimport und 64 KiB `system`-Daten je konvertiertem Eintrag; unbekannte Daten bleiben außen vor.
- Die Rückfrage ist erforderlich. Es wird ausschließlich in eigene **world**-Kompendien der aktuellen Welt geschrieben; keine World-Items oder World-Actors und keine fremden Modul-/Premium-Packs.
- `sourceKey` aus Provider, Buch, Art, Quell-ID, Edition und Variante steckt in `flags.ddb-bridge`; identische Quellen werden beim nächsten Lauf **übersprungen**, niemals still überschrieben.
- 2014 und 2024 haben getrennte Schlüssel und Kompendien.
- Einträge ohne native Felder, Monster, Klassen, Unterklassen, Journale, Tabellen, Szenen und Regeln werden **nicht** als fertig importiert ausgegeben.
- Die `completeness`-Flag bleibt `unverified`. Dnd5e-Schemas, Activities und Advancements müssen in Foundry überprüft werden.
- Quelle nur aus vertrauenswürdigen lokalen Dateien laden. Öffentliches GitHub enthält keine bezahlten Buchtexte oder Kontogeheimnisse.
- Fehlerberichte enthalten nur Herkunftsschlüssel und Statuscodes, keine Payloads; bei Einzelproblemen läuft der nächste Eintrag weiter.

## Manuelle Abnahme (noch offen)

| Schritt | Erwartung | Stand |
| --- | --- | --- |
| Native spell + equipment | Zwei gültige dnd5e-Dokumente in Welt-Kompendien | Offen |
| Wiederholung | Keine doppelten Items | Offen |
| 2014 und 2024 | Zwei getrennte Welt-Kompendien | Offen |
| Fehlerhafte/teilweise Daten | Warnung, keine falsche Vollständigkeit | Offen |
| Map-Library-Menüs und ZIP | Unverändert funktionsfähig | Offen |
