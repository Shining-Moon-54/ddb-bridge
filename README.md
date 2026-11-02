> **Hinweis zur KI-Entwicklung / AI Development Notice**  
> DDB Bridge wird mithilfe von künstlicher Intelligenz (OpenAI ChatGPT) konzipiert und entwickelt. Teile des Quellcodes und der Dokumentation sind KI-generiert; echte Foundry-Laufzeittests stehen noch aus.  
> **English:** This project is designed and developed with the assistance of artificial intelligence (OpenAI ChatGPT). Parts of the source code and documentation are AI-generated and not guaranteed to be manually verified or error-free.

# DDB Bridge

**Eine Foundry-VTT-v14-Erweiterung für zwei Bibliotheksbereiche:** **Book Library** (D&D-Beyond-Quellenbücher) und die übernommene **Map Library** (Szenen-/Kartenarchiv).

> **Stand 0.1.0-alpha.1 (Entwicklungsbranch):** Map Library ist integriert. Book Library inventarisiert Buch-JSONs; zusätzlich gibt es einen ersten **lokalen Testimport** explizit vorbereiteter dnd5e-v6-Zauber/Gegenstände in **eigene Welt-Kompendien**. **Kein Abruf von D&D Beyond, kein Import gekaufter Bücher, Monster oder Klassen.**

## Ziel: Ganze Bücher statt einzelner Charaktere

Ein Benutzer soll ein auf D&D Beyond erworbenes bzw. berechtigt zugängliches Quellenbuch auswählen können. DDB Bridge soll dessen technisch und rechtlich verfügbare Inhalte in **native, spielbare Foundry-Dokumente** verwandeln: Monster-Actors, Zauber, Klassen, Unterklassen, Spezies, Hintergründe, Talente, Gegenstände und passende Journale, ggf. Szenen. Importierte Inhalte bleiben in Kompendien bis zur Verwendung. **„Wie ein offizielles Foundry-Premiumbuch“ ist das UX-Ziel, keine bereits erreichte Gleichwertigkeit.** Insbesondere nicht bereitgestellte Wände, Grafiken, Automatisierungen oder Klassenentscheidungen dürfen nicht stillschweigend erfunden werden.

## Bereits im Code

- **Map Library:** Archivieren, Kategorien, Suche, portable ZIPs, Szenen- und Medienverwaltung, Papierkorb, Cloudexport (Google Drive/Dropbox mit benutzereigener Einrichtung). Bestehende Funktionen stammen aus der experimentellen Map Library v0.4.0-alpha.7 und müssen in einer echten Foundry-V14-Testwelt geprüft werden.
- **Book Library:** GM-Oberfläche über **Spieleinstellungen → Moduleinstellungen → DDB Bridge – Buchbibliothek** sowie die Schaltfläche „DDB Bridge – Bücher“. Lokales Buchinventar und Bericht; ein ausdrücklich zu bestätigender Testimport legt eigene Welt-Kompendien für vorbereitete Zauber/Gegenstände an (Branch-Funktion, noch keine Foundry-Laufzeitabnahme).
- **Importplanung:** Stabile Herkunftsschlüssel aus Quelle, Buch-ID, Inhaltstyp, Quell-ID, Edition und Variante. Dubletten und ungültige Datensätze werden erkannt; 2014/2024 bleiben getrennt.
- **Tests und Build:** Node.js-Tests, Dateihygiene-Checks und Foundry-Modul-ZIP-Build. **Keine echten D&D-Beyond-Inhalte sind im Repository enthalten.**

## Mit dem Testinventar ausprobieren

Die Buchbibliothek ist bereits in Foundry aufrufbar. Zum Prüfen der Oberfläche kannst du das frei erfundene [Testbuch (JSON)](examples/book-inventory.sample.json) herunterladen und in **DDB Bridge – Buchbibliothek** auswählen. Die Oberfläche zählt Monster, Klassen, Zauber, Gegenstände und Journale auf und bietet den **Inventarbericht** als JSON an. Die Beispieldaten sind keine D&D-Beyond-Ausgabe. Für den neuen lokalen Kompendien-Test siehe [eigene Anleitung](docs/LOCAL_IMPORT_ALPHA.md) und [native Testdaten](examples/native-book.sample.json); der gewöhnliche Inventarbericht schreibt nichts.

## Installation (Experimentelle Alpha)

Eine Manifest-URL ist **erst dann als Installationslink nutzbar, wenn der zugehörige GitHub-Release mit ZIP tatsächlich veröffentlicht und überprüft wurde**. Der GitHub-Quellcode ist nicht selbst das installierbare Modul.

Entwicklung:
```bash
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

Die Ausgabe liegt danach unter `dist/`. Foundry V14 und D&D 5e 6.x sind die Zielumgebung. Testweise in **eigener Testwelt** aktivieren.

## Map Library übernehmen – ohne Datenverlust

Die alte Map Library verbleibt mit ihren Originaldaten unter `Data/modules/map-library/storage/`. DDB Bridge arbeitet getrennt unter `Data/modules/ddb-bridge/storage/`.

**Altes Modul und Sicherungen vorerst behalten.** Zur Übernahme zunächst einzelne Karten über das **portable ZIP** der alten Map Library exportieren und im Kartenbereich der neuen Bridge importieren. Das ursprüngliche ZIP-Format `map-library/1` wird weiterhin akzeptiert. Für vollständige Historien, Profile und automatische Migration ist noch eine gesonderte Implementierung nötig. Zwei gleichzeitige aktive Oberflächen nicht als Beleg für Migrationsfähigkeit werten.

## Unterlagen

- [Lokaler Testimport in Welt-Kompendien](docs/LOCAL_IMPORT_ALPHA.md)
- [Buchimport: Manifest und Abnahmekriterien](docs/DDB_BRIDGE_PROJEKTMANIFEST.md)
- [Internes Buchformat](docs/DDB_BRIDGE_DATENVERTRAG.md)
- [Fusions- und Migrationsplan](docs/DDB_BRIDGE_FUSION.md)
- [Übernommene Map-Library-Dokumentation](MAP_LIBRARY.md)
- [Sicherheitsmodell](SECURITY.md)
- [Lizenzstatus](LICENSE)

## Transparenz

Öffentliches Repository heißt **nicht**, dass fremde D&D-Buchtexte, Bilder, Sitzungsdaten oder importierte Kompendien mit veröffentlicht werden dürfen. Zugriffsquellen und Rechte sind vor Implementierung eines D&D-Beyond-Adapters zu prüfen. Das bisherige Map-Library-Projekt hat für seinen eigenen Code noch keine allgemeine Open-Source-Lizenz freigegeben; fremde MIT-Komponenten behalten ihre jeweilige Lizenz.
