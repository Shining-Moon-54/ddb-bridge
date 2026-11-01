# DDB Bridge — Projektmanifest

**Stand:** 2026-11-01  
**Projektname:** DDB Bridge  
**Ziel:** öffentliches GitHub-Projekt; selbst gehostetes Foundry VTT V14 / dnd5e 6.x; deutsche Oberfläche, englische Ergänzungen.  
**Phase:** Gründung und Integration mit bestehender Map Library; **kein produktionsreifer Importer**.

## 1. Produktauftrag

Mit einer **bereits rechtmäßig zugänglichen** D&D-Beyond-Buchquelle soll der Benutzer einen Buchimport anstoßen, dessen Ergebnis in Foundry möglichst wie ein gekauftes natives Quellenpaket **benutzbar** ist. Keine bloße PDF-Anzeige und keine reine Textkopie.

Ein Buchimport erzeugt, soweit die Quellinformationen rechtmäßig und technisch vorliegen:
- Quellenbuch-Eintrag mit Titel, Edition/Regelversion, ID, Herkunft, Lizenz-/Zugriffsstatus, Importzeit und Vollständigkeit.
- **Item-Kompendien:** Klassen, Unterklassen, Spezies, Hintergründe, Talente, Zauber, Waffen, Ausrüstung, Werkzeuge, magische Gegenstände und Merkmale.
- **Actor-Kompendien:** Monster und NSC mit Aktionen, Angriffen, Fähigkeiten, Ressourcen, Sinnen und Token, soweit zugänglich.
- **JournalEntry-Kompendien:** Kapitel, Regeln, Abschnitte, Querverweise, Handouts und Quellenverknüpfungen.
- **RollTables** sowie Abenteuer-Szenen, sofern Quelle und Rechte dies hergeben. Szenen sollen die vorhandene Map Library zur Archivierung wiederverwenden.
- **D&D-2014- und 2024-Varianten nebeneinander**, ohne stilles Überschreiben.

Die native Foundry-/dnd5e-Semantik ist entscheidend: Klassen mit Advancements und Entscheidungen, Zauber mit Activities/Skalierung, Monster mit nutzbaren Angriffen. Eine fehlende Mechanik wird als **teilweise** ausgewiesen.

## 2. Prioritäten

**P0 – Fundament**  
Sichere Fusion ohne Datenverlust; Buchkatalog; Quellenidentität; Quell-/Berechtigungsmodell; Dry-Run; Testwelt. Bestehende Map Library bleibt installationsfähig.

**P1 – Buchimport (Kernziel)**  
Buchauswahl → Quellprüfung → Metadaten-Inventar → Parser → Normalisierung → Konverter → Kompendien. Erst Zauber, Gegenstände und Monster, danach weitere Charakteroptionen. Quellenbuchkapitel/Journale, sofern verfügbar.

**P2 – vollständige Charakteroptionen**  
Klassen, Unterklassen, Spezies, Feats, Hintergründe; native Stufenaufstiege, Referenzen, 2014/2024-Trennung; echte Abnahme mit neuen Charakteren über mehrere Level.

**P3 – Abenteuer, Szenen und Map Library**  
Karten aus Buchquellen, Assetmanifest, vorhandene Szenen ins Kartenarchiv, korrekte Zuordnung, reversible Übernahme. Keine erfundenen Wände, Beleuchtung, Trigger oder proprietären Premium-Daten.

**P4 – Qualität und Synchronisierung**  
Wiederaufnehmbare Jobs, Deduplizierung, Quelländerungen, dreiseitiger Änderungsvergleich, Berichte, Fehlertickets, optionale Charakterimporte.

## 3. Buchimport-Ablauf

1. **Quelle verbinden:** Nur zulässige, vom Benutzer berechtigte Inhalte; unterstützte Schnittstellen offen dokumentieren. Keine generische Annahme einer offiziellen DDB-Volltext-API.
2. **Buch entdecken:** Quellen-ID, Titel, Edition, Sprache, Inhaltstypen und vorhandene Benutzerberechtigungen prüfen. Nicht unterstützte Quellen offen benennen.
3. **Inventarisieren:** Einträge und Abhängigkeiten zählen, fehlende Bestandteile als Lücken markieren.
4. **Dry-Run:** Geplante Packs, Neu/Update/Überspringen/Konflikt/Nicht unterstützt anzeigen; kein Schreiben.
5. **Normalisieren:** Versionsunabhängiges Zwischenformat je Eintrag mit stabiler Identität, Buchherkunft, Edition und Abhängigkeiten.
6. **Konvertieren:** Native Foundry-Dokumente für die *konkret erkannte* dnd5e-Systemversion generieren.
7. **Abhängigkeiten auflösen:** Klassen/Unterklassen/Features, Monsteraktionen, Zauber und Journal-Links anhand IDs statt Namen verbinden.
8. **Validieren:** Foundry-Systemschema, Links, eingebettete Daten, Mechaniken, Medienreferenzen, Quellenrechte.
9. **Schreiben:** Nur in eigene weltübergreifende Kompendien; niemals fremde Premium-Packs überschreiben; kleine Batches.
10. **Berichten:** Gesamtmenge, vollständig/teilweise/fehlgeschlagen, Gründe, manuelle Nacharbeit, Resume-Status.

## 4. Definition von „wie ein Foundry-Premium-Buch“

Eine gleichartige **Benutzererfahrung** ist das Ziel, keine unbewiesene Feature-Gleichheit:
- Eigene sichtbar benannte Kompendien und Buch-Navigation.
- Drag-and-drop-fähige, valide Actors und Items.
- Verlinkte Journal-Seiten und Regelreferenzen.
- Importierte Charakteroptionen erscheinen in kompatiblen Charakterbau-Workflows.
- Monster sind nach Import in Testwelt spielbar, nicht nur statische Beschreibungen.
- Keine kompletten Buchinhalte in World-Actors/World-Items, bis der Benutzer sie braucht.
- **Transparente Unterschiede** zum offiziellen Premium-Paket, z. B. fehlende Szene-Wände, offizielle Grafiken oder Spezialmakros.

## 5. Technik

- Foundry-Modul + optionaler sicherer lokaler Adapter, aber **keine zwingenden undokumentierten externen Dienste**.
- Auth-/Quellenadapter strikt vom Parser trennen; keine Secrets in Frontend-Logs/Compendiums.
- Pure, versionierte Kernfunktionen mit Node-Testläufen; Foundry-Adapter separat und in V14-Testwelt zu prüfen.
- 2014/2024 mit separatem Schlüssel führen. Identität: Provider + Buch-ID + Entitätstyp + Quell-ID + Edition + Variante.
- Wiederaufnehmbare Jobs mit persistentem Fortschritt und begrenzten Retry-Intervallen; Fehlereinträge beeinträchtigen nicht alle anderen.
- Kein blindes Löschen, keine globalen Namensmatches, keine automatische Mutation bestehender Premium-Packs.
- Pack-IDs, Links und Migration beim Modulnamenwechsel explizit dokumentieren.
- Importierte Buchdaten und Tokens bleiben **lokal** und werden nie in öffentliche Releases eingebettet.

## 6. Datenschutz und Urheberrecht

- Ausschließlich Inhalte verarbeiten, zu denen der angemeldete Benutzer technisch und rechtlich Zugang hat.
- Kein DRM-/Paywall-Bypass, keine Nachbildung oder Weitergabe eines fremden Angebots, keine öffentlichen Dump-Pakete.
- Bei unklarer Zugriffsart klarer Fehlerstatus. Keine Aussage „ein DDB-Buch kann immer vollständig importiert werden“ ohne konkrete Quelle und Abnahme.
- Importierte Daten müssen in Foundry und auf Speicher-/Backup-Ebene korrekt geschützt sein. Ein „GM-only“-Button schützt nicht vor direkt zugänglichen statischen Dateien.
- Upstream-Projekte (MrPrimate DDB-Importer, VTTA) nur unter Beachtung ihrer Lizenzen verwenden; keine ungeprüfte Übernahme ihrer eingebundenen Drittdaten.

## 7. Abnahmetests

1. Derselbe Buchstand zweimal importiert → **keine Dubletten**.
2. Gleicher Eintragsname 2014 und 2024 → **zwei getrennte Einträge**.
3. Fehlender Monster-Token → klarer Hinweis, Actor wird nicht fälschlich als vollständig markiert.
4. Ein Fehler unter 10.000 Einträgen → Auftrag fortsetzbar, 9.999 andere nicht pauschal verworfen.
5. 2024er Klasse → unter dnd5e 6.x in neuen Charakter einfügbar, Klasse und Advancement über mehrere Level testbar.
6. Herkunft und Buchreferenz jedes Dokuments nachweisbar.
7. Alte Map-Library-Bibliothek nach Integration unverändert lesbar und wiederherstellbar.
8. Keine Kontogeheimnisse, geschützten Buchtexte oder Bilder in Quellcode, CI-Logs oder Releases.
9. Keine Behauptung vollständiger Premium-Gleichwertigkeit bei fehlenden Journalen, Szenen, Walling oder Automationen.

## 8. GitHub- und Release-Politik

- Die bestehende öffentliche `ddb-bridge`-Historie beibehalten; zuerst Feature-Branch und Pull Request, kein ungeprüfter Bruch des Release-`main`.
- Projektname später `DDB Bridge`, angestrebter Repository-Slug `ddb-bridge`; tatsächliche GitHub-Umbenennung erfordert ausreichende Repository-Verwaltungsrechte.
- Für eine Übergangszeit alte `ddb-bridge`-Modul-ID, Manifest- und Installationswege erhalten. **Kein** voreiliger Umzug oder Rewrite gespeicherter Kataloge.
- Die finale Entscheidung über Lizenzierung des Eigen-Codes bleibt offen und wird **nicht** automatisch durch Referenzprojekte ersetzt.
