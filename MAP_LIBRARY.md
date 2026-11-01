> **Hinweis zur KI-Entwicklung / AI Development Notice**  
> Dieses Projekt wird mithilfe künstlicher Intelligenz (OpenAI ChatGPT) konzipiert und entwickelt. Die Anforderungen und Entscheidungen entstehen in Zusammenarbeit mit dem Projektinitiator. Teile des Quellcodes und der Dokumentation sind KI-generiert; eine vollständige manuelle Überprüfung oder Fehlerfreiheit wird nicht garantiert.  
> **English:** This project is designed and developed with the assistance of artificial intelligence (OpenAI ChatGPT). Requirements and decisions are made in collaboration with the project initiator. Parts of the source code and documentation are AI-generated and are not guaranteed to be fully reviewed or error-free.

# Map Library

Eine weltübergreifende Szenenbibliothek für **Foundry VTT v14**. Karten bleiben als native Szenendaten mit Ebenen, Wänden, Licht, Tiles, Dachbildern, Zeichnungen und Regionen archiviert. Erst beim Weltimport entsteht eine neue Szene im Weltverzeichnis.

**Version 0.4.0-alpha.7 ist eine experimentelle, noch nicht in einer echten Foundry-Installation abgenommene Alpha.** Automatisierte Tests prüfen Datenverarbeitung, ZIP-Sicherheit, Speicherung mit API-Doubles und die DOM-Oberfläche. Sie ersetzen keine Foundry-/Canvas-/Berechtigungsprüfung. Eine `compatibility.verified`-Angabe wird deshalb bewusst nicht gesetzt. Zunächst eine separate v14-Testwelt verwenden.

**Neu in Alpha 7:** Karten einzeln oder als Auswahl löschen, nach Bestätigung in den Papierkorb verschieben und wiederherstellen. Die Medien bleiben erhalten, damit vorhandene Welt-Szenen weiter funktionieren; dies gibt noch keinen Plattenplatz frei. Google Drive und Dropbox können als mehrere Cloudprofile für manuelle Exporte eingerichtet werden. Eigene Anbieter-App-Kennung und Anmeldung erforderlich; Tokens bleiben ausschließlich im Sitzungsspeicher. Die Anbieteradapter sind gegen die aktuellen Primärquellen und mit HTTP-Doubles geprüft; echte Konto-/Browserabnahme ist noch offen. [Cloud einrichten](docs/CLOUD.md).

**Korrektur in Alpha 6:** Die SVG-Prüfung akzeptiert nun auch Inline-Stile für `touch-action`, Breite/Höhe, Mindest-/Maximalgrößen und SVG-Geometrie. Dadurch werden statische Icons nicht mehr allein wegen `touch-action` oder `height` als ungesichert gemeldet. Die Dateien bleiben unverändert; aktive Inhalte und externe Ressourcen werden weiterhin abgewiesen. Die gemeldeten Stilmuster sind mit synthetischen Assets bis zum Archiv-/ZIP-/Weltimport geprüft.

**Neu in Alpha 5:** Statische SVG-Icons aus Foundry und Modulen können als Szenenassets mitgesichert werden. Die Dateien werden vor dem Upload gegen ein begrenztes statisches SVG-Profil geprüft und anschließend unverändert kopiert. Zusammengesetzte Modultexte wie `IA: icons/svg/sun.svg|icons/svg/sleep.svg` werden nicht mehr als einzelne fehlende Datei angefordert; die Originalflags bleiben erhalten. Einzelheiten und Grenzen: [SVG-Unterstützung](docs/SVG.md).

**Neu in Alpha 4:** Im Szenenverzeichnis öffnet unten **„Map Library öffnen“** die Bibliothek. Ein Rechtsklick auf eine Welt-Szene bietet **„In Map Library sichern“** und öffnet direkt die Importvorschau dieser Szene. Gespeichert wird erst nach Bestätigung. Beide Zugriffe sind für GMs verfügbar; die optionale schwebende Schaltfläche lässt sich weiterhin getrennt abschalten.

**Änderungen in Alpha 3:** Beim Sichern werden Leerzeichen in den Dateinamen der Medienkopien automatisch durch `_` ersetzt, auch wenn sie im Quellpfad als `%20` stehen. Lesbare Namen erhalten zusätzlich eine Prüfsumme für eindeutige Zuordnungen; beim Weltimport werden die Verweise auf die Kopien angepasst. Die Quelldateien der laufenden Welt und das native Archivoriginal bleiben unverändert. Außerdem ist die doppelte URL-Kodierung zu `%2520`, die zu falschen 404-Fehlern führte, behoben. Zum Aktualisieren die Welt beenden, im Setup unter **Zusatzmodule** die Map Library aktualisieren und die Welt anschließend neu laden. Der Manifest-Link bleibt gleich.

Die Korrektur aus Alpha 2 für „(destructured parameter) is not iterable“ in Vorschau und Importprüfung ist weiterhin enthalten.

## Aktueller Funktionsumfang

| Funktion | Stand dieser Alpha |
| --- | --- |
| Native Szene aus der aktuellen Welt archivieren | Implementiert über `toObject()`; Original bleibt unverändert |
| 30+ native Ebenen, eingebettete Kennungen, Regionen, Flags | Vollständige native JSON wird gespeichert; 32 Ebenen in synthetischen Tests geprüft |
| Weltimport | Neue, inaktive Szene; keine Tokens; stabile eingebettete IDs; separate Bestätigung für Drittanbieter-Daten/Automatisierungen |
| Bildimport | PNG, JPG/JPEG, WebP; einfache native v14-Szene |
| Native Szenen-JSON | Import mit Assetinventar und Vorschau |
| Assetkopien | Alle erkannten lokalen Medienreferenzen einschließlich statischer SVG-Icons; SHA-256; manuelles Nachreichen; keine automatischen externen Downloads |
| Eigene portable ZIPs | Export der Auswahl oder aller ausgewählten Treffer, Importinventar, Kategorienübernahme, Prüfsummen |
| Fremde ZIPs | Inventar ohne vorgeschriebene Struktur; eindeutige Zuordnung; manuelle Auswahl bei Mehrdeutigkeit; Einzelprüfung der Karten |
| Organisation | Verschachtelte Kategorien anlegen/umbenennen/verschieben, Metadaten, Suche, Tags, Sortierung, Favoriten, Kachel-/Listenansicht |
| Mehrfachauswahl | Alle Treffer oder sichtbare Seite auswählen; verschieben, löschen/wiederherstellen und exportieren |
| Löschen / Papierkorb | Bestätigtes Löschen einzelner/mehrerer Karten, eigener Papierkorbbereich, Wiederherstellung; Medien bleiben erhalten |
| Versionen und Integrität | Unveränderliche Szenenrevisionen, Historie, SHA-256-Prüfung, Katalogkonflikterkennung |
| Detect Grid | **Noch nicht implementiert**, eigener verbindlicher Meilenstein C |
| UVTT / DD2VTT | **Noch nicht implementiert** |
| Direkter serverseitiger HTTPS-Import | **Noch nicht implementiert**; sicherer Server-Fetch ist nicht durch die geprüften Client-APIs belegt |
| Cloudexport | Google Drive und Dropbox: mehrere Profile, eigene Appkennung, Sitzungsanmeldung, manuelle ZIP-Uploads, Profil-Speicherlimit und Prüfsummen; echte Kontoabnahme offen |
| Cloud-Sync, Remote-Originale, Cache, Fallback | **Noch nicht implementiert**; lokale Archive bleiben vollständig erhalten |
| Vorschau je Ebene, vollautomatischer Massenimport | **Noch offen**; derzeit erste Hintergrundvorschau und einzeln bestätigte Importkandidaten |

Die vollständige Produktspezifikation bleibt verbindlich: [Projektübergabe](docs/PROJEKTUEBERGABE.md). Der abweichende Implementierungsstand ist in [Anforderungsabdeckung](docs/REQUIREMENTS.md) und [Roadmap](docs/ROADMAP.md) nachvollziehbar.

## Installation

Die reguläre Installation erfolgt über Foundrys **Manifest-URL**, entsprechend der [offiziellen Modul-Anleitung](https://foundryvtt.com/article/modules/).

**Installationslink:** [https://raw.githubusercontent.com/Shining-Moon-54/map-library/main/module.json](https://raw.githubusercontent.com/Shining-Moon-54/map-library/main/module.json)

1. Im Foundry-Setup **Zusatzmodule / Add-on Modules** öffnen.
2. **Modul installieren / Install Module** anklicken.
3. Den obigen Installationslink in das Feld **Manifest URL** einfügen und **Installieren** wählen.
4. Foundry liest die `module.json`, lädt das dort unter `download` angegebene ZIP automatisch herunter und entpackt das Modul selbst.
5. Eine v14-Testwelt laden, als GM unter **Module verwalten / Manage Modules** die **Map Library** aktivieren und die Einstellungen speichern.
6. Im Szenenverzeichnis unten **Map Library öffnen** oder unter **Spieleinstellungen → Moduleinstellungen → Map Library öffnen** wählen.

Die öffentliche Manifest-URL bleibt für spätere Updates gleich. Das ZIP im [Alpha-Release](https://github.com/Shining-Moon-54/map-library/releases/tag/v0.4.0-alpha.7) ist das von Foundry automatisch geladene Installationspaket. Der Release-Workflow kann auf einem vorbereiteten Release-Zweig gestartet werden: Er legt zuerst ein tatsächliches Release an, veröffentlicht ZIP und Manifest, prüft den anonymen Zugriff und übernimmt erst danach den Stand einschließlich Update-Manifest nach `main`.

Die Nutzung erfordert weder Node/Python auf dem Foundry-Server noch einen zusätzlichen Dienst. Node 24 und npm werden ausschließlich für Entwicklung, Tests und Paketbau benötigt. Die ZIP-Bibliothek ist im Installationspaket enthalten.

## Benutzung

**Archivieren:** Rechtsklick auf eine Welt-Szene → **„In Map Library sichern“**. Alternativ in der Bibliothek „Welt-Szene archivieren“ → Szene wählen. Danach Assetinventar und Warnungen prüfen → Name, Kategorie, Tags und Rechteangaben ergänzen → fehlende Medien zuordnen → archivieren. Fehlende Assets und identische Szenendaten müssen ausdrücklich zugelassen werden.

**Dateien importieren:** JSON und zugehörige Bilder gemeinsam auswählen oder ein ZIP öffnen. Im Inventar jeden gewünschten Eintrag prüfen. Bei mehreren gleichnamigen Assets die Zuordnung selbst wählen, anschließend „Zuordnung erneut prüfen“. Zusätzliche Dateien lassen sich in der Vorschau nachreichen. Kategorien aus eigenen Paketen können vor der Kartenaufnahme übernommen werden; widersprüchliche vorhandene Kategorien werden nicht überschrieben.

**Weltkopie:** „In Welt importieren“ → Warnungen lesen → optionale Drittanbieter-Daten und geprüfte Automatisierungen bestätigen → „Neue Szene erstellen“. Das Archivoriginal wird weder aktualisiert noch gelöscht. Neue Weltkopien werden zunächst nicht aktiviert oder in der Navigation angezeigt; bei Bedarf in Foundry ändern.

**Vorlage aktualisieren:** An einer Karte „Aus Welt aktualisieren“ wählen, Quellszene auswählen und neue Revision ausdrücklich speichern. Die vorherige Szene und deren Assets bleiben erhalten. Historie und Wiederherstellung: [RECOVERY.md](docs/RECOVERY.md).

**Löschen:** An der Karte „Löschen“ oder bei mehreren gewählten Karten „Auswahl löschen“ → „In Papierkorb verschieben“ bestätigen. Über **Bereich → Papierkorb** gelöschte Karten anzeigen und einzeln/als Auswahl wiederherstellen. Dateien und ältere Katalogrevisionen bleiben erhalten.

**Cloudexport:** Unter „Cloud-Konten“ bzw. den Moduleinstellungen zuerst Google Drive oder Dropbox hinzufügen und nach [Anleitung](docs/CLOUD.md) verbinden. An der Karte „In Cloud exportieren“ oder „Auswahl in Cloud exportieren“ → Zielprofil → „Jetzt in Cloud exportieren“. Nach Neuladen/Ablauf erneut verbinden. Bestätigte Exporte enthalten die aktuellen Kartenrevisionen als portables ZIP, keine Tokens; kein automatischer Abgleich und keine Remote-Löschung.

**Export:** Gewünschte Kategorien/Filter wählen, „Alle Treffer auswählen“, dann „Auswahl exportieren“. Ohne Filter und mit allen Treffern umfasst dies die vollständige aktuelle Bibliothek. Portable ZIPs enthalten aktuelle Kartenrevisionen; die gesamte Revisionshistorie wird durch ein Backup des persistenten Modulordners gesichert.

## Daten und Grenzen

- Bibliothek auf demselben Foundry-Server: `Data/modules/map-library/storage/`, von Welten unabhängig. `persistentStorage` und `uploadPersistent` werden genutzt. Eigene Backups bleiben erforderlich.
- **Keine vertrauliche Datenablage:** Foundry stellt Mediendateien und diese JSON-Archive als statische Dateien bereit. GM-Prüfungen schützen die Modulaktionen, schaffen aber keine zusätzliche serverseitige Lesesperre. Originale können Tokens, versteckte Inhalte und Flags enthalten. Solche Archive nur berechtigten Personen zugänglich machen; niemals in dieses öffentliche Repository hochladen.
- Nur erkannte Assetfelder werden paketiert. Unbekannte oder dynamisch aus Skripten erzeugte Abhängigkeiten lassen sich nicht garantiert finden. Modulflags werden nur bei eindeutigen einzelnen Dateireferenzen als Assets behandelt. Nicht unterstützte Medien wie AVIF sowie SVGs außerhalb des statischen Profils werden mit dem Ablehnungsgrund als nicht gesichert gemeldet. Native v14-Roundtrips bleiben ein Abnahmepunkt.
- Remote-Assets werden weder automatisch vom Server noch vom Browser geholt. Bei Bedarf Datei selbst beschaffen und im Import zuordnen. Quellenadresse ist eine Metadatenangabe, kein URL-Importer.
- Alpha-Limits: ZIP 128 MiB, entpackt 256 MiB, Einzeldatei 64 MiB, JSON 16 MiB, maximal 5.000 ZIP-Einträge. Diese Sicherheitsgrenzen betreffen einen einzelnen Vorgang und sind keine feste Obergrenze der Kartenzahl. Große Sammlungen in Teilmengen exportieren.
- Archiv- und Katalogrevisionen werden nicht automatisch bereinigt. Gleichzeitige Katalogschreiber können einen erkennbaren Konflikt erzeugen; beide Fassungen bleiben erhalten. Bei Konflikten stoppt das Modul weitere Änderungen.
- Abbruch verhindert den Katalogabschluss, solange dieser nicht begonnen hat. Bereits hochgeladene, unverknüpfte Dateien können zurückbleiben. Ein bereits an Foundry abgesendeter Szenen-Erstellungsauftrag lässt sich nicht zuverlässig abbrechen.

## Entwicklung

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

Das Installationspaket liegt anschließend unter `dist/`. `npm run vendor` aktualisiert die eingecheckte Kopie der exakt gepinnten MIT-Bibliothek fflate; keine CDN-Laufzeitabhängigkeit. Eigener Quellcode und Tests verwenden ES-Module.

- [Architektur](docs/ARCHITECTURE.md), [ZIP-/Datenformat](docs/DATA_FORMAT.md)
- [v14-API-Prüfung](docs/API_V14.md), [Test- und Abnahmeplan](docs/TESTING.md)
- [Migration des Altprototyps](docs/MIGRATION.md), [Sicherheitsmodell](SECURITY.md)
- [Cloud-Einrichtung und Grenzen](docs/CLOUD.md), [Detect-Grid-Entwurf](docs/DETECT_GRID.md)
- [Beitragen](CONTRIBUTING.md), [Änderungen](CHANGELOG.md), [Lizenzstatus](LICENSE)

Lizenzentscheidung für den eigenen Projektcode: **noch offen**. Enthaltene Drittanbieter-Lizenzen bleiben gesondert gültig. Dieses Repository enthält keine fremden Karten, Kaufabenteuer, Zugangsdaten oder privaten Foundry-Weltdaten. Es wird zunächst nicht im offiziellen Foundry-Modulverzeichnis eingereicht.
