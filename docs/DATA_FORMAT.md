# Datenformat 1

Formatkennung: `map-library/1`. Szenendaten selbst behalten das native Foundry-v14-Format; dieses Dokument definiert ausschließlich Verpackung und Metadaten.

## Persistente Ablage

| Pfad unter `Data/modules/map-library/storage/` | Inhalt |
| --- | --- |
| `catalogs/c.<revision>.<parent>.json` | Unveränderlicher Katalog-Snapshot mit `revision`, `parent`, `created`, `catalog` |
| `maps/<entry-id>/<revision>/scene.json` | Unveränderte native Quellszene nach JSON-Serialisierung |
| `maps/<entry-id>/<revision>/metadata.json` | Metadaten und Assetinventar dieser Archivierung |
| `maps/<entry-id>/<revision>/assets/<name>_<sha256>.<ext>` | Erfasste Medienbytes mit Namen ohne Leerzeichen |
| `maps/<entry-id>/<revision>/thumbnail.webp` | Optionales kleines Vorschaubild |

IDs sind zufällige Hexkennungen. Kategorien werden nicht in die physischen Speicherpfade eingebaut. Dadurch verschiebt eine Kategorieänderung keine Medien und beschädigt keine aktiven Weltkopien.

Seit Alpha 3 wird der Basisname einer Medienkopie einmal URI-dekodiert, jedes Leerzeichen durch `_` ersetzt und auf Buchstaben, Ziffern, `.`, `_` und `-` begrenzt. Der Namensstamm umfasst höchstens 40 Unicode-Zeichen; die vollständige SHA-256-Prüfsumme und Medienendung folgen danach. Identische Bytes derselben Endung werden innerhalb einer Revision weiterhin nur einmal geschrieben. Ältere Namen nach dem Muster `<sha256>.<ext>` bleiben gültig: Leser folgen immer dem im Inventar hinterlegten Pfad und leiten ihn nicht aus einem Dateinamensmuster ab. Deshalb bleibt die Formatkennung `map-library/1` kompatibel.

Seit Alpha 5 ist `.svg` mit MIME-Typ `image/svg+xml` als Szenenabhängigkeit möglich, sofern die Datei das [statische SVG-Profil](SVG.md) erfüllt. Die SVG-Bytes bleiben unverändert und erhalten dieselben Pfad-/Prüfsummenfelder wie andere Medien. In Modulflags werden nur eindeutige einzelne Dateipfade inventarisiert; zusammengesetzte Modultexte werden unverändert im nativen Szenenoriginal erhalten.

## Katalog

`catalog = { format, categories, entries }`. Eine Kategorie hat `id`, `name`, `parent` (ID oder `null`). Kreisbezüge und fehlende Eltern sind ungültig. Ein Entry enthält:

| Felder | Bedeutung |
| --- | --- |
| `id`, `revision` | Stabile Kartenkennung, aktuelle Inhaltsrevision |
| `name`, `description`, `tags`, `author`, `source`, `license` | Nutzer-Metadaten; Quellenadresse ohne Geheimnisse |
| `category`, `favorite` | Organisation |
| `created`, `updated` | ISO-Zeitstempel |
| `scene`, `hash`, `thumbnail` | Archivpfad, SHA-256 der gespeicherten Szenenbytes, optionale Vorschau |
| `width`, `height`, `grid`, `levels`, `bytes` | Kataloginformationen; nicht das authoritative Szenenformat |
| `assets` | Inventar: ursprüngliche Referenz, Modulpfad oder `null`, SHA-256, Endung, MIME, Bytes, Fehlstatus |
| `profile` | Derzeit ausschließlich `local`; keine vorgetäuschte Cloudablage |
| `moduleVersion`, `foundryVersion` | Herkunft der Archivierung |
| `warnings` | Bekannte Hinweise bei dieser Archivierung, keine vollständige aktuelle Abhängigkeitsprüfung |
| `history` | Vorherige Revisionspfade, Hashes und Assets; keine automatische Löschung |

Duplikaterkennung basiert auf SHA-256 derselben serialisierten Szenendaten. Inhaltlich ähnliche Karten oder Exporte mit anderen IDs/Statistiken können unterschiedliche Hashes haben. Eine semantische Ähnlichkeitserkennung ist nicht implementiert.

## Portables ZIP

Ein ZIP besitzt genau die oberste Produktebene `Map-Library/`. Darunter:

| ZIP-Pfad | Inhalt |
| --- | --- |
| `library.json` | `format`, `exportedAt`, `categories`, ausgewählte `entries` mit relativen Paketpfaden |
| `categories.json` | Vollständige Kategoriehierarchie der Quelle |
| `checksums.json` | Objekt `relativer Paketpfad → SHA-256` für jede Datei außer sich selbst |
| `maps/<id>/<revision>/scene.json` | Native Original-JSON |
| `maps/<id>/<revision>/metadata.json` | Portabler Entry |
| `maps/<id>/<revision>/assets/<name>_<hash>.<ext>` | Medienbytes mit derselben Namensregel wie im lokalen Archiv |
| `maps/<id>/<revision>/thumbnail.webp` | Optionale Vorschau |

Das Inventar ordnet **ursprüngliche Szenenreferenz → Paketdatei** zu. Beim erneuten Archivieren werden neue lokale Modulpfade vergeben. Bei Weltimport werden nur die Referenzen auf einer Arbeitskopie geändert. Kein Modulcode, keine Anbietertokens, keine Pflicht-Cloudkonfiguration im Paket.

Der Export enthält die ausgewählten aktuellen Szenen und Medien; alte Inhaltsrevisionen werden nicht als vollständiger Verlauf mitgepackt. Kataloghistorienpfade können als Herkunftsmetadaten vorhanden sein, sind nach einer Neuaufnahme aber keine verfügbare lokale Historie. Für ein vollständiges Versionsbackup den gesamten persistenten Speicher sichern.

## Fremd-ZIP

Keine Namens- oder Ordnerstruktur wird vorausgesetzt. Szenen-JSON wird anhand der nativen äußeren Form erkannt. Referenzen relativ zur jeweiligen JSON haben Vorrang, dann eindeutiger exakter Archivpfad, dann nur ein einziges passendes Basename. Mehrdeutige Namen bleiben offen. Bilder ohne zugeordnete JSON werden als separate Bildkandidaten angeboten. Nicht zugeordnete Skripte werden nicht ausgeführt oder auf den Server hochgeladen.

Keine automatischen Konvertierungen eines UVTT-Objekts in eine vermeintlich native Szene. Unbekannte zukünftige Formatkennungen werden abgewiesen. Änderungen am Verpackungsformat benötigen eine neue dokumentierte Formatversion und explizite Migration.
