# MAP LIBRARY — VOLLSTÄNDIGE PROJEKTÜBERGABE

**Stand:** 24. Oktober 2026  
**Status:** Verbindliche Anforderungssammlung und Übergabe an einen neuen Chat im ChatGPT-Work-Modus. Keine Behauptung, dass alle Funktionen bereits implementiert sind.  
**Projektname:** Map Library  
**GitHub-Repository (geplant):** `map-library` — **öffentlich (Public)**, aber zunächst nicht aktiv beworben und nicht im offiziellen Foundry-Modulverzeichnis eingereicht. GitHub kennt keine echte „ungelistet“-Sichtbarkeit.  
**Foundry-Modul-ID (Ziel):** `map-library`  
**Unterstützte Foundry-Version:** ausschließlich **Foundry VTT v14**; keine gezielte Rückwärtskompatibilität.  
**Sprache:** zunächst Deutsch; Code und technische Dateinamen können Englisch sein.

> **KI-KENNZEICHNUNG — VERBINDLICH**  
> Ganz oben in der öffentlichen `README.md`, noch vor der Projektbeschreibung, muss deutlich stehen, dass dieses Projekt mithilfe von künstlicher Intelligenz (OpenAI ChatGPT) konzipiert und entwickelt wird. Anforderungen und Entscheidungen werden gemeinsam mit dem Projektinitiator getroffen. Quellcode und Dokumentation können KI-generiert sein; vollständige manuelle Prüfung und Fehlerfreiheit werden nicht behauptet. Eine englische Kurzfassung ist ebenfalls erwünscht. Auch die GitHub-Projektbeschreibung soll auf KI-Entwicklung hinweisen.

---

## 0. AUFTRAG AN DEN NEUEN WORK-CHAT

1. Diese Datei als **maßgebliche Produktspezifikation** lesen und die vorhandene ZIP `RP_Map_Library_v0.3.0.zip` als **unvollständigen Altprototyp** untersuchen, nicht als fertige Umsetzung behandeln.
2. Zuerst den tatsächlichen Codebestand und die offizielle **Foundry-v14-API** überprüfen. Offene technische Fragen ausdrücklich markieren und durch Tests klären, statt Fähigkeiten zu erfinden.
3. Das Projekt auf **Map Library** / `map-library` umbenennen. Dabei alte IDs, Pfade und Einstellungen bei Bedarf durch eine nachvollziehbare Migration behandeln; nicht blind per Suchen/Ersetzen alles umbenennen.
4. Ein sauberes, öffentliches GitHub-Repository vorbereiten. **Keine Zugangsdaten** oder privaten Daten committen. Wenn ein GitHub-Connector Schreibzugriff hat, nach Freigabe dort Dateien pflegen; andernfalls eine vollständig hochladbare Repository-Struktur als ZIP liefern.
5. Das Modul in sinnvollen, **funktionierenden und testbaren Etappen** entwickeln; keine bloßen UI-Attrappen als fertig deklarieren.
6. Bei fachlichen Zielkonflikten eine konkrete Empfehlung geben, aber Entscheidungen des Nutzers nicht eigenmächtig überschreiben. Unnötige Rückfragen vermeiden.
7. Installierbare ZIPs, Quellcode, Changelog, Dokumentation und Testhinweise bei Meilensteinen bereitstellen. Release-/Update-URLs erst nach tatsächlich existierenden GitHub-Dateien eintragen.
8. Bei wichtigen Codeänderungen die V14-API-Konformität prüfen. Kein externer Linux-Dienst, kein manuell einzurichtender systemd-Service als Installationsvoraussetzung.

## 1. PRODUKTZIEL

Map Library ist ein einziges installierbares Foundry-VTT-v14-Modul zur **weltübergreifenden Archivierung, Suche, Organisation, Vorschau und Wiederverwendung vollständiger Szenen**. Es ist **nicht** nur ein Bildbrowser. Bibliothekseinträge sollen auch bei Tausenden Karten nicht als aktive Szenen in jeder Welt auftauchen. Szenen können in eine Welt kopiert, dort bearbeitet und auf ausdrücklichen Wunsch wieder in die Bibliothek übernommen werden.

Grundprinzipien:
- **Foundry ist die Autorität für das Szenenformat.** Keine selbst erfundene zweite Repräsentation von Wänden, Leveln, Licht, Regionen oder Tiles.
- **Archivvorlage bleibt unangetastet.** Weltimport verwendet eine Arbeitskopie; Warnungen statt stillschweigender Löschung.
- **Freie Import- und Speicherwege.** Lokal, JSON, ZIP, URL und optionale Cloud sind unabhängig nutzbar; kein Anbieterzwang.
- **Selbstständiges Foundry-Modul.** Installation über Manifest oder ZIP, aktivieren, Einstellungen öffnen; kein gesonderter Serverprozess.
- **Keine falschen Versprechen.** Native Exportbereinigung, Serverdateizugriff, OAuth und v14-Level-APIs müssen praktisch geprüft werden.

## 2. VOLLSTÄNDIGE SZENENARCHIVIERUNG

- Native Foundry-v14-Scene-JSON als authoritative Vorlage, einschließlich beliebig vieler nativer Level (auch 30+), deren Höhen, Zuordnungen und eingebetteter Daten.
- Beibehalten: Hintergründe, Rasterkonfiguration, Sicht-/Beleuchtungs-/Dunkelheitseinstellungen, Wände, Türen, Lichtquellen, Tiles, Dach- und Bildebenen, Zeichnungen, Regionen, deren Formen/Oberflächen/Behaviors, Szeneneinstellungen und grundsätzlich vorhandene Flags.
- **Kartenbilder, Tiles, Dächer und alle benötigten Bild-Assets** sind Teil des portablen Kartenpakets. Assetreferenzen erfassen, Bytes sichern und beim Import auf gültige Speicherpfade umsetzen.
- Audio und Animationen **nicht pauschal als zwingende Kartenbestandteile erfinden**. Falls eine konkrete Szene Medienreferenzen enthält, Abhängigkeiten erkennen, benennen und nach festgelegter Regel behandeln; Video-Tiles sind ggf. tatsächlich benötigte Tile-Assets.
- Regionen, Levelübergänge und Teleporter **nicht vorsorglich löschen**. Nicht auflösbare Ziele und Abhängigkeiten beim Weltimport anzeigen; Nutzer darf trotzdem importieren. Optionale spätere Funktion: „Verweis reparieren“ an der importierten Kopie.
- Drittanbieter-Modul-Flags und -Zonen nicht unbedacht verwerfen. Bei eindeutig erkennbaren zusätzlichen Modulobjekten **vor optionaler Übernahme fragen**; native Regionsdaten standardmäßig bewahren. Unsichere oder ausführbare Verhaltensdaten kennzeichnen.
- Spielbezogene Tokens/Actors sollen **nicht als Kartenvorlage neu erzeugt werden**. Ob und wie der native V14-Exporter sie bereinigt, zuerst am echten Export testen. Nicht behaupten, er tue es bereits sicher.
- Bereits erkundeter Kriegsnebel / nutzerbezogener Fortschritt wird nicht mit archiviert. Foundry verwaltet `FogExploration` als eigenes Dokument. **Nicht** mit nativen Sichtregeln verwechseln.
- Keine automatische Übernahme von fremden ausführbaren Skripten ohne Sicherheitsprüfung.

### Native Foundry-Exportfunktion — wichtiger technischer Befund

- `ClientDocument.exportToJSON()` stößt den **Download** einer JSON-Datei im Client an und liefert dem Modul nicht einfach den JSON-Text zurück.
- `toCompendium()` liefert eine exportorientierte Datenrepräsentation und entfernt weltbezogene Eigenschaften. **Exakt welche Scene-Felder in v14 entfernt werden, ist noch zu testen.**
- `importFromJSON()` aktualisiert ein bestehendes Dokument; für eine neue Szene ist ein korrekter Erstellungsweg erforderlich.
- Foundrys Szenen-JSON enthält nicht automatisch alle Bilddateien; Assetpaketierung ist unsere Aufgabe.
- Die Aussage „Foundry bereinigt das alles selbst“ darf nicht ungeprüft als garantiert gelten. Nach Test entscheiden, ob archiviert wird: (a) exportbereinigte native JSON als Hauptvorlage oder (b) unveränderte Rohfassung plus exportbereinigte Fassung getrennt. **Nie stillschweigend das Archivoriginal verändern.**

## 3. KATALOG UND BIBLIOTHEKSOBERFLÄCHE

- Zentrale Bibliothek mit Kategorien und beliebig verschachtelten Unterkategorien; eigene Kategorien jederzeit anlegen/umbenennen/verschieben.
- Einträge mit Name, Beschreibung, Tags, Autor, Quelle/URL, Lizenz, Importdatum, Bildmaßen, Rastertyp/-größe, Asset-/Dateigrößen, Speicherprofil und Versionsinformationen.
- Vorschaubilder; bei nativen Multi-Level-Szenen nach Möglichkeit pro Level eine Vorschau; Kachel-/Listenansicht, Suche, Filter, Sortierung, Favoriten.
- Mehrfachauswahl, Massenimport/-export, Massenverschiebung, Fortschritt und Fehlerberichte.
- SHA-256-Prüfsummen, Duplikaterkennung, fehlende Dateien/Assets sichtbar, Integritätsprüfung, nachvollziehbare Versionierung; keine ungefragten Überschreibungen.
- Weltimport erstellt eine **neue Szene**, ohne die Vorlage zu verändern. Expliziter Befehl zum Aktualisieren einer Vorlage aus einer Welt-Szene.
- Große Kataloge performant: Paging, lazy-loaded Thumbnails, nicht Tausende aktive Scene-Dokumente im Weltverzeichnis anlegen.
- GMs mit entsprechender Berechtigung verwalten die Bibliothek; Rollenprüfung auch serverseitig, soweit die API es erlaubt.

## 4. IMPORTWEGE

1. Kartenbilder (mindestens PNG, JPG/JPEG, WebP; weitere nur nach API-/Formatprüfung).
2. Vorhandene Foundry-Szene aus der aktuellen Welt.
3. Native Foundry-Scene-JSON.
4. UVTT / DD2VTT einschließlich vorhandener Wand-/Lichtdaten, soweit Format und v14-API es zulassen.
5. ZIP aus eigener Bibliothek oder fremder Struktur.
6. **Direkte öffentliche HTTPS-URL** zu Bild, JSON oder ZIP: Foundry lädt die Quelle direkt in seinen Speicher, **ohne vorherigen Download auf den PC des Nutzers**. Mehrere URLs als Komfortfunktion.
7. Optionale Cloud-Konten (siehe Abschnitt 7).

Importvorschau, klare Warnungen bei fehlenden Assets/Referenzen, Fortschritt, Abbruch und Dublettenbehandlung. Bestehende JSON-Rasterdaten bewahren; Detect Grid nur auf Nutzerwunsch.

**Sicherheit bei URL-Import:** SSRF-Schutz einschließlich Redirects/DNS/private IP-Bereiche, Dateityp- und Größenlimits, Zeitlimits, Rechteprüfung. Keine ungeschützte URL-Fetch-Funktion für beliebige lokale Serverziele.

## 5. ZIP-IMPORT / ZIP-EXPORT

**Eigener ZIP-Export:** vollständige Bibliothek, Kategorie, Mehrfachauswahl oder Einzelkarte. Eine oberste Verzeichnisebene `Map-Library/` (frühere Planung: `RP-Map-Library/`, auf neuen Projektnamen anpassen). Darunter z. B. `library.json`, `categories.json`, `maps/<category>/<map-id>/scene.json`, `metadata.json`, `thumbnail.webp`, Bild-/Tile-Assets und Prüfsummen. **Exakte Struktur und Manifestversion vor Implementierung festlegen**; keine Zugangsdaten exportieren.

**Fremd-ZIP-Import:** keine eigene Ordnerstruktur voraussetzen. ZIP inventarisieren, Szenen-JSON, Bilder und Assetpfade erkennen. Automatisch nur zuordnen, wenn Dateireferenzen/Metadaten **eindeutig** sind. Bei Mehrdeutigkeit eigenes Zuordnungsfenster öffnen: JSON ↔ Hauptbild ↔ Tiles/weitere Bilder manuell verknüpfen. Bilder ohne JSON dürfen als neue einfache Szenenvorlage importiert werden; JSON ohne Bild zeigt fehlende Abhängigkeit und ermöglicht Nachreichen. Vorschau und Bestätigung vor Import. Zip-Slip-/Zip-Bomb-Schutz, Entpacklimits.

**Manueller Cloud-Workaround:** Export-ZIP kann unabhängig vom eingebauten Cloud-Feature von Hand auf Dropbox/Drive etc. abgelegt werden.

## 6. DETECT GRID — VERBINDLICH

- **Optional** beim Import durch Checkbox (standardmäßig **aus**).
- Kontextmenüeintrag **„Detect Grid“ ganz unten** beim Rechtsklick auf **jede Foundry-Szene** (auch nicht aus Bibliothek) und auf Bibliothekseinträge.
- Schritt 1: Bereits **gedrucktes sichtbares Raster** im Kartenbild erkennen; auch schwache, verdeckte oder unterbrochene Linien und wiederkehrende Muster.
- Schritt 2: Falls kein Raster sichtbar: Rastergröße/Versatz aus Dimensionen, Metadaten und strukturellen Wiederholungen **als unsichere Kandidaten** schätzen.
- Schritt 3: Wenn nötig manuelle Kalibrierung durch Zeichnen **einer Zelle oder eines 3×3-Feldbereichs**, passend zur Rastergeometrie.
- Quadrat, v14-unterstützte rechteckige/sonstige Geometrien, Hex pointy-top und flat-top; **nur tatsächlich unterstützte v14-Rastertypen** anbieten.
- Eigenes Vorschau-/Kalibrierfenster mit tatsächlichem Kartenbild, Grid-Overlay, Typ, Zellgröße, X-/Y-Versatz und manuellen Korrekturen.
- **Niemals vor ausdrücklicher Bestätigung verändern.** Nur Klick auf **„Raster übernehmen“** schreibt Einstellungen. Abbrechen/Schließen ändert nichts.
- **Keine Funktion „rasterlose Karte erkennen“.** Rasterlosigkeit ist kein Detektionsmodus.
- Falls Bildanalyse-Bibliothek eingesetzt wird: Lizenz, Performance und v14-Integration prüfen.

## 7. CLOUD — OPTIONAL, MEHRERE ANBIETER UND KONTEN

Geplant: Dropbox, Google Drive, OneDrive, Nextcloud/WebDAV, S3/Backblaze B2, SFTP. Anbieteradapter nach tatsächlicher Machbarkeit priorisieren; **nicht behaupten, alle funktionieren bereits**.

- Mehrere Cloudprofile gleichzeitig, einschließlich mehrerer Konten **desselben** Anbieters.
- Nutzer wählt erst „Cloud hinzufügen“ und Anbieter; danach erscheinen nur die **passenden** Einstellungen.
- Gewünschter Ablauf: Modul installieren → Einstellungen → Anbieter verbinden → nutzen. **Keine externen Dienste oder manuellen Serverprozesse.** OAuth-Besonderheiten können Anbieter-App-Registrierung/Redirect-Infrastruktur erfordern; Grenzen transparent aufzeigen, keine unsicheren Umgehungen.
- **Lokales Cachelimit** frei in GB, `0 = keine vom Modul gesetzte Obergrenze`.
- **Pro Cloudkonto eigenes Speichernutzungslimit** in GB, `0 = keine vom Modul gesetzte Obergrenze` (nicht mit Anbieter-Kontingent verwechseln).
- Kategorien einem bevorzugten Cloudkonto zuweisen; bei ausgeschöpftem Limit optional Fallback-Konto oder Upload stoppen. Änderung der Zuordnung verschiebt Bestandsdaten **nicht automatisch**.
- Cloud-Originale, lokal nur Metadaten und Thumbnails möglich; Assets bei Bedarf laden. Cachebereinigung darf keine einzige Originalkopie und keine aktive Szene zerstören.
- **Keine automatische Hintergrundsynchronisierung.** Nur manuelle Synchronisation per Button. Manueller vollständiger Scan kann extern hinzugefügte Dateien finden.
- **Niemals entfernte Cloud-Dateien automatisch löschen**, nur weil sie lokal fehlen. Konflikte/Versionen nachvollziehbar behandeln.
- Zugangsdaten/Tokens niemals in ZIP, Katalog, Logs oder öffentliche Repository-Dateien. Berechtigungsgrenzen und realistische Token-Sicherheit in einer Foundry-Modulumgebung prüfen.

## 8. IMPORTPRÜFUNG UND WARNUNGEN

Vor Erstellen einer Welt-Szene möglichst anzeigen:
- Nicht auflösbare Region-/Teleporter-/Level- oder Cross-Scene-Ziele.
- Fehlende Bild-/Tile-Assets oder andere referenzierte Dateien.
- Fehlende Drittanbieter-Module oder nicht unterstützte Verhaltensabhängigkeiten.
- Potenziell problematische Skript-/Flag-Daten.

Nutzer kann **„Trotzdem importieren“** wählen, sofern Foundry das Dokument technisch akzeptiert. **Nicht automatisch Regionsdaten löschen.** Optionale manuelle Reparatur erst an der importierten Kopie. Fehlermeldungen konkret, nicht pauschal.

## 9. SICHERHEIT, ZUVERLÄSSIGKEIT, LEISTUNG

- Keine Geheimnisse in Git, Releases, ZIP oder Debuglogs. Public bedeutet: **Quellcode und veröffentlichte Releases sind für jeden lesbar**.
- Prüfsummen, Größenlimits, Pfadvalidierung, keine beliebige Ausführung fremder ZIP-/JSON-Inhalte, keine destruktiven Standardaktionen.
- Cloud-Dateien nicht automatisch löschen; Änderungen an existierenden Vorlagen bestätigen.
- GM-/Berechtigungsprüfung nicht nur im UI, sondern an wirksamen Schreib-/Netzwerkaktionen.
- Ressourcenschonung für Raspberry-Pi-Hosting, insbesondere Katalog mit Tausenden Karten und großen Multi-Level-Szenen.
- Testfälle: 30+ Level, viele Tiles und Dachbilder, native Regionen, fremde Modul-Flags, fehlende Ziele, kaputte Assetpfade, ZIP-Mischformate, große Archive, Cachelimit, Cloudkonflikte.

## 10. GITHUB, RELEASES, INSTALLATION

- **Ein öffentliches Repository `map-library`**, keine separate private Entwicklungsablage notwendig.
- Nicht aktiv bewerben, noch nicht ins offizielle Foundry-Verzeichnis einreichen. **Trotzdem öffentlich durchsuchbar** — keine echte „unlisted“-Option.
- README beginnt mit dem **deutschen und englischen KI-Hinweis** (siehe Anfang dieses Dokuments).
- Foundry installiert per **öffentlich abrufbarer Manifest-URL**; Releases enthalten installierbare ZIPs. Keine GitHub-Anmeldung und kein Token in Foundry nötig.
- `module.json` erhält korrekte `id`, `title`, `version`, v14-Kompatibilität, `manifest`, `download` und erforderliche Metadaten. **Nicht** fiktive Links eintragen; URLs erst nach Anlage des Repos/Releases einsetzen.
- Vor Veröffentlichung prüfen, ob GitHub-Raw-Manifest und GitHub-Release-Asset wirklich anonym abrufbar sind.
- Repo-Dokumentation: README, CHANGELOG, LICENSE (Lizenzentscheidung noch offen), Projektplan, Architektur, Installationsanleitung, Sicherheits-/Testhinweise.
- Modul muss ohne externen systemd-Dienst installierbar sein. Interne Foundry-Servermöglichkeiten prüfen, aber keine nicht existierenden Server-APIs unterstellen.

### Verbindlicher README-Einstieg

> **Hinweis zur KI-Entwicklung / AI Development Notice**  
> Dieses Projekt wird mithilfe künstlicher Intelligenz (OpenAI ChatGPT) konzipiert und entwickelt. Die Anforderungen und Entscheidungen entstehen in Zusammenarbeit mit dem Projektinitiator. Teile des Quellcodes und der Dokumentation sind KI-generiert; eine vollständige manuelle Überprüfung oder Fehlerfreiheit wird nicht garantiert.  
> **English:** This project is designed and developed with the assistance of artificial intelligence (OpenAI ChatGPT). Requirements and decisions are made in collaboration with the project initiator. Parts of the source code and documentation are AI-generated and are not guaranteed to be fully reviewed or error-free.

## 11. IST-ZUSTAND DER VORHANDENEN DATEIEN

In der bisherigen Unterhaltung wurden bereitgestellt:
- `RP_Map_Library_Projektplan.md` — älterer, bereits ausführlicher Plan.
- `RP_Map_Library_v0.1.0.zip`, `RP_Map_Library_v0.2.0.zip`, **`RP_Map_Library_v0.3.0.zip`** — Prototypen; **v0.3.0 existiert tatsächlich** und ist für die Codeübernahme der naheliegende Startpunkt.

**Prüfung des v0.3.0-Archivs am 24.10.2026:** Enthält sieben Dateien: `module.json`, `README.md`, `styles/main.css`, `tools/export.py`, `tools/cloud-sync.sh`, `scripts/main.js`, `storage/catalog.json`. Das ZIP ist nur rund 16 KB groß. **Nicht als vollständige Umsetzung der obigen Anforderungen verstehen.** Die bisherige `module.json` verwendet noch `id: "rp-map-library"`, `title: "RP Map Library"` und `compatibility.minimum: "13"`. Die alten `tools/`-Skripte beweisen **keine** funktionierende eingebaute Cloud-Integration; insbesondere ein externes Shell-Skript darf keine Installationspflicht werden. Vor Wiederverwendung Funktion, Sicherheit und v14-Konformität prüfen.

**Wichtig für den neuen Chat:** Dateien müssen dort tatsächlich als Anhänge verfügbar sein. Sandbox-Links aus früheren Chats sind kein verlässlicher Ersatz für erneutes Anhängen.

## 12. V14-API-QUELLEN UND OFFENE TECHNISCHE PRÜFUNGEN

Offizielle Ausgangspunkte (URLs im neuen Chat erneut auf Aktualität und exakte API-Signaturen prüfen):
- https://foundryvtt.com/api/v14/classes/foundry.ClientDocument.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.Scene.html
- https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.SceneData.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.FogExploration.html
- https://foundryvtt.com/article/scene-regions/
- https://foundryvtt.com/article/tiles/

**Tests vor endgültiger Architekturentscheidung:**
1. In realer v14-Installation `scene.toObject()`, `scene.toCompendium()` und `exportToJSON()` vergleichen; kontrollieren, was bei Tokens, Levels, Regions, Flags, `_stats`, Referenzen und Medien erhalten bleibt.
2. Exportierte JSON in **neue** v14-Szene importieren; Roundtrip-Test mit Multi-Level- und Regionsszene, inklusive IDs und Abhängigkeiten.
3. Assets aus allen relevanten v14-Level-/Tile-/Scene-Feldern erfassen; Pfadumbiegung nur an Arbeitskopie.
4. Möglichkeiten für Serverdateizugriff, Datei-Uploads, sichere URL-Downloads und ZIP-Verarbeitung **innerhalb eines reinen Foundry-Moduls** konkret prüfen.
5. Möglichkeiten und Grenzen der Provider-Authentifizierung ohne zusätzliche Dienste prüfen.
6. Gridtypen, Pixelgrößen und Offsets anhand tatsächlicher v14-API und Rendering-Logik validieren.
7. Performance und Sicherheit der Export-/Importprozesse messen.

## 13. UMSETZUNGSREIHENFOLGE UND ABNAHME

**Etappe A — Grundgerüst und Bibliothek:** Umbenennung, v14-Modulmanifest, KI-Hinweis, Kategorien, Katalog, Suche, Metadaten, Welt-Szenenexport/-import, kleine Vorschauen. Abnahme: Eine reale v14-Szene kann archiviert und in einer anderen Welt wieder angelegt werden.

**Etappe B — Vollständige Portabilität:** Assetinventar, Pfadzuordnung, ZIP-Export/-Import, fremde ZIP-Zuordnung, JSON/UVTT, direkter URL-Import. Abnahme: Szene mit Tiles/Dächern/Leveln bleibt auf anderer Installation nutzbar; fehlende Assets werden gemeldet.

**Etappe C — Detect Grid:** Sichtbare Raster, Fallback-Heuristik, manuelle Zelle/3×3, Vorschau und Bestätigung. Abnahme: Abbruch verändert nichts; Übernehmen setzt Raster korrekt.

**Etappe D — Cloud:** Anbieterprofile, Grenzen, Cache, manuelle Sync, mehrere Konten, Sicherheitsprüfung. Anbieter schrittweise nach realer API-Machbarkeit. Abnahme: Ein Anbieter Ende-zu-Ende getestet, danach weitere.

**Etappe E — Härtung und Releases:** Rechte, Sicherheitschecks, große Bibliotheken, komplexe Szenen, automatisierte Tests, Dokumentation, Releases/Manifest.

Die Reihenfolge dient der Implementierung; **keine künstlichen Nutzungsbeschränkungen** zwischen fertigen Funktionen.

## 14. AUSDRÜCKLICH NICHT GEWÜNSCHT

- Kein Pflicht-Cloudkonto, keine verpflichtende ZIP-Struktur für Fremdimporte.
- Kein zusätzlicher systemd-Dienst und keine manuelle Serveradministration als Voraussetzung.
- Keine heimliche Veränderung von archivierten Szenen oder Regionszielen.
- Keine künstliche Begrenzung der Anzahl nativer Level.
- Keine Reduktion komplexer Szenen auf Hintergrundbild plus ein Dach.
- Kein automatischer Grid-Scan ohne Wunsch; keine „rasterlos erkennen“-Funktion.
- Keine automatischen Cloud-Löschungen oder Hintergrundsynchronisierung.
- Keine Behauptung, dass unfertige Funktionen bereits funktionieren.
- Kein altes RP-Branding im fertigen Produkt.

## 15. STARTTEXT FÜR DEN WORK-MODUS

> Wir entwickeln ein Foundry-VTT-v14-Modul namens **Map Library**. Lies die angehängte Datei `Map_Library_Vollstaendige_Projektuebergabe.md` vollständig und behandle sie als verbindliche Anforderungssammlung. Analysiere außerdem den angehängten unvollständigen Prototyp `RP_Map_Library_v0.3.0.zip`. Prüfe zunächst die tatsächlichen v14-APIs und den Codebestand, benenne offene technische Risiken, und setze anschließend ein sauberes, testbares Modul auf. Das GitHub-Repository soll `map-library` heißen und **öffentlich** sein, damit Foundry `module.json` und Releases anonym abrufen kann. Die README muss **ganz oben** sichtbar auf die KI-Entwicklung durch OpenAI ChatGPT hinweisen. Keine externen Dienste voraussetzen, keine Funktionen vortäuschen. Arbeite schrittweise mit überprüfbaren Ergebnissen und liefere GitHub-fertige Dateien beziehungsweise Commit-Vorschläge. Frage nur nach wirklich erforderlichen Zugangsdaten/Entscheidungen und veröffentliche keine Geheimnisse.

---

**Ende der Übergabe.**
