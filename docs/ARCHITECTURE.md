# Architektur

## Zuständigkeiten

| Bereich | Verantwortung |
| --- | --- |
| `scripts/core/scene.js` | Native Szenenvalidierung, Assetreferenzen, Warnungen, unverändernde Pfadumbiegung, Arbeitskopie |
| `scripts/core/catalog.js` | Metadatenmodell, Kategoriehierarchie, Filter und Paging |
| `scripts/core/media.js` | Unterstützte Mediensignaturen, Bildabmessungen und Thumbnail |
| `scripts/core/zip.js` | ZIP-Inventar, Pfad-/Größenschutz, Streamingentpacken, CRC32 |
| `scripts/core/package.js` | Portables Format, SHA-256, Fremd-ZIP-Zuordnung |
| `scripts/foundry/storage.js` | Foundry-Datei-APIs, Rollenprüfung, Snapshotketten und Konflikte |
| `scripts/foundry/service.js` | Prüfen → neue Dateien schreiben → Katalog abschließen; Weltimport |
| `scripts/foundry/ui.js` | ApplicationV2, Galerie, Importprüfung, Assetzuordnung, Organisation |
| `scripts/core/cloud.js` | Validierte öffentliche Profilfelder, Exportlimit, Dateinamen, Dropbox-Content-Hash |
| `scripts/cloud/auth.js` | Google-Tokenmodell, Dropbox-PKCE mit einmaligem Code, keine Secrets/Refresh-Tokens |
| `scripts/cloud/providers.js` | Anbieter-REST, paginierter Exportscan, neue Uploads, Größen-/Prüfsummenbestätigung |
| `scripts/foundry/cloud.js` | GM-Prüfung, lokale Profilmetadaten, kontogebundene Sitzungstokens, Serialisierung |
| `scripts/foundry/diagnostics.js` | Freiwillige, nur lesende API-Diagnose ohne Ausgabe privater Feldinhalte |

## Archivieren

1. Quellszene mit `toObject()` oder eingelesener nativer JSON kopieren; Ausgangsobjekt nicht verändern.
2. JSON-Struktur und erkennbare Geheimnisse prüfen. Assetinventar aus bekannten Medienfeldern einschließlich Leveln und Flags bilden. Tokenbilder sind keine notwendigen Kartenassets.
3. Eindeutige mitgelieferte Dateien oder lokale Foundry-Dateien lesen. Fremde URLs nicht automatisch abrufen. Warnungen, Mengen und Vorschau vor dem Speichern anzeigen.
4. Neue Entry-ID bzw. neue Revision zuweisen. Original-JSON und Medien in ein neues Revisionsverzeichnis laden; gleiche Hashdateien innerhalb der Revision deduplizieren.
5. `metadata.json` schreiben; erst anschließend eine neue unveränderliche Katalogrevision hochladen.

Fehler vor Schritt 5 erzeugen keine sichtbare neue Karte und überschreiben keine vorhandene. Es können unverknüpfte Dateien verbleiben. Das Modul entfernt sie nicht ungefragt.

## Weltimport

1. Original-JSON und alle archivierten Assets erneut lesen und prüfen.
2. Warnungen und bewusste optionale Übernahmen bestätigen.
3. Auf einer Kopie Assetreferenzen auf persistente Modulpfade umsetzen; Tokens entfernen; weltbezogene Stamm-ID, Ordner, Besitzrechte und Statistiken entfernen; Aktivierung und Navigation ausschalten.
4. Neue Foundry-ID vergeben. Eindeutig erkannte Selbstreferenzen `Scene.<alte-ID>…` auf neue ID umbinden. Fremde Ziele unverändert lassen und bei erkannten fehlenden Szenen warnen.
5. Über `CONFIG.Scene.documentClass.create` eine neue Szene anlegen: `keepId: true` für die frisch erzeugte Stammkennung, `keepEmbeddedIds: true` für native Level-/Region-/Tile-Kennungen. Foundry bleibt die endgültige Formatvalidierung.

Keine Actor-Erzeugung, kein `importFromJSON` auf einer existierenden Szene und keine automatische Änderung des Archivs. Die manuelle Vorlagenaktualisierung bildet einen neuen Archivierungsvorgang mit erwarteter Vorgängerrevision.

## Katalog und konkurrierende Schreiber

Jeder Snapshot enthält einen vollständigen schlanken Metadatenkatalog und einen Vorgänger. Dateiname: `c.<revision>.<parent>.json`, bei der ersten Revision `parent=root`. Ein Kopf ist eine Revision, die von keiner anderen Revision als Vorgänger genannt wird.

- Kein Kopf: leere neue Bibliothek.
- Ein Kopf: nur diesen Katalog laden; Szenen werden erst bei Bedarf gelesen.
- Mehrere Köpfe: Konflikt, keine automatische Auswahl nach Zeitstempel und keine weiteren Schreibvorgänge.

Clientinterne Promise-Queue und, wenn verfügbar, Web Locks serialisieren lokale Vorgänge. Ein Dateilisting vor und nach dem Schreiben erkennt konkurrierende Katalogzweige. Das ist **keine atomare Datenbanktransaktion über mehrere Geräte**; unveränderliche Geschwisterdateien verhindern jedoch das stille Überschreiben eines anderen Kopfes. Mehrere gleichzeitig geöffnete Schreibclients vermeiden, bis echte Servertransaktionen verfügbar sind.

Snapshots werden nicht automatisch gelöscht. Dadurch wächst der Speicherbedarf bei sehr vielen Metadatenänderungen. Eine sichere explizite Kompaktierung und Wiederherstellungsoberfläche ist ein späterer Härtungsschritt.

## Größen und Performance

Start lädt Dateinamen der Katalogrevisionen und einen Metadaten-Snapshot. Keine Karte wird dafür als World-Scene angelegt. In der Galerie maximal 48 Karten, Bilder `loading=lazy`. Suche und Filter arbeiten auf Metadaten; 5.000 synthetische Einträge sind automatisiert geprüft. Das ist keine Aussage zur realen Canvas- oder Raspberry-Pi-Performance.

Browserbasierte Assetpakete haben feste Arbeitsgrenzen, damit ein einzelner Import einen kleinen Server oder Client nicht durch unbeschränkte Datenmengen belastet. Große Sammlungen werden in Auswahlpaketen transportiert. Serverstreaming, Workerentlastung, 10.000+-Messungen und Thumbnail je Level folgen nach echter v14-Abnahme.

## Löschen und Cloudexport

Löschen setzt erst nach Bestätigung in einer neuen Katalogrevision `archived=true` und `deletedAt`. Alle ausgewählten Einträge werden vor Änderungen gegen Revision, Änderungszeit und Papierkorbstatus geprüft. Eine veraltete Auswahl wird vollständig abgewiesen. Der Papierkorb nutzt dieselben Metadaten und erhält Szenen, Medien und frühere Revisionen. Wiederherstellen setzt den Status zurück. Keine Dateilöschung: Welt-Szenen können diese Medien bereits verwenden.

Cloudexport erstellt dasselbe geprüfte portable ZIP wie der lokale Export und lädt es als neue Datei hoch. Kontoverbindung, frische Speicherprüfung und Profilgrenze werden vor dem Upload geprüft. Google verwendet resumable Uploads mit 4-MiB-Blöcken und SHA-256-Bestätigung; Dropbox einen begrenzten Upload unter seinem Einzelrequestlimit und den Anbieter-Content-Hash. Fehler und Abbrüche führen nie zu einem bestätigten Erfolg. Ein möglicherweise bereits abgeschlossener Remote-Upload wird nicht automatisch gelöscht. Details und derzeit offene Integrationstests: [CLOUD.md](CLOUD.md).
