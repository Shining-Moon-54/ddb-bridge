# Backups und Wiederherstellung

## Zwei Sicherungsarten

**Portables Kartenpaket:** Auswahl oder alle aktuellen Einträge exportieren. Enthält die aktuellen Original-Szenen und kopierten Medien samt Kategorien und Prüfsummen. Auf anderem Server über das Importinventar neu aufnehmen.

**Vollständiges Versionsbackup:** Den gesamten Ordner `Data/modules/map-library/storage/` mit dem vorhandenen Foundry-/Host-Backup sichern. Er umfasst frühere Kataloge und Inhaltsrevisionen. Ein reines Weltbackup muss diesen Modulordner nicht einschließen. Backups regelmäßig auf Lesbarkeit prüfen.

## Gelöschte Karten

In der Bibliothek **Bereich → Papierkorb** wählen. „Wiederherstellen“ bzw. „Auswahl wiederherstellen“ setzt Karten ohne erneuten Medienimport in die Bibliothek zurück. Szenenoriginale, Assets und frühere Revisionen werden beim Löschen erhalten. Bereits importierte Welt-Szenen bleiben funktionsfähig. Die Funktion gibt keinen Plattenplatz frei; eine sichere endgültige Speicherbereinigung mit Referenzprüfung ist noch offen.

## Cloudpaket wiederherstellen

Das bestätigte ZIP aus Google Drive bzw. Dropbox mit der jeweiligen Anbieteroberfläche herunterladen und über **Dateien / ZIP importieren** öffnen. Prüfsummen und einzelne Importkandidaten prüfen. Kontoprofile oder Anmeldedaten werden dafür nicht benötigt. Cloudexport sichert die gewählten aktuellen Revisionen; für alle historischen Revisionen weiterhin das vollständige Versionsbackup verwenden.

## Fehlgeschlagener Upload

Solange der neue Katalogsnapshot nicht vollständig geschrieben wurde, bleibt der vorherige Katalog maßgeblich. Ein neues Revisionsverzeichnis kann als unverknüpfte Dateiablage zurückbleiben. Das Modul löscht diese Dateien nicht automatisch. Vor manueller Bereinigung vollständiges Backup anlegen und prüfen, ob die Pfade von einer aktuellen Welt-Szene oder einem Katalog referenziert werden.

## Frühere Vorlagenrevision

Die Karte führt frühere Szenenpfade und Hashes in `history`. Eine grafische Wiederherstellungsfunktion ist noch offen. Als vorsichtiger manueller Weg:

1. Vollständige Speicher-Sicherung anlegen.
2. Frühere `scene.json` und die dazugehörigen Medien aus genau dieser Revision als Dateien/ZIP importieren.
3. Im Importvorschaufenster Medien anhand des damaligen `metadata.json` zuordnen; neue Karte zunächst gesondert benennen.
4. Weltkopie und Prüfsummen prüfen. Aktuelle Vorlage bleibt dabei erhalten.

Nicht einzelne Dateien einer alten Revision über eine neue kopieren: Das würde ihre SHA-256 und native Referenzen ungültig machen.

## Katalogkonflikt

Mehrere Köpfe bedeuten, dass zwei Clients auf demselben Vorgänger gespeichert haben. Beide Dateien sind erhalten. Das Modul stoppt vor weiteren Änderungen und wählt nicht still den neueren Zeitstempel.

Derzeit ist eine manuelle Wiederherstellung nötig. Foundry/Schreibclients schließen und vollständiges Speicher-Backup erstellen. Beide Kopf-Snapshots vergleichen: neu angelegte Karten, Kategorieänderungen und aktuelle Entry-Revisionen erfassen. Widersprüchliche Bearbeitungen müssen bewusst entschieden werden. Anschließend unter Erhaltung der Originaldateien in einer Sicherung eine konsistente Katalogkette wiederherstellen; alternativ einen geprüften Vorgänger wiederherstellen und die fehlenden Karten über deren vollständige Revisionspakete neu importieren.

**Nicht allein nach Dateidatum einen Kopf löschen.** Auch dessen Dateien können einzigartige Karten oder Änderungen enthalten. Für unklare Konflikte zunächst nur die selbst erstellten, bereinigten Metadaten zur Fehleranalyse verwenden, keine vertraulichen Szenen öffentlich posten. Eine Merge-/Recovery-Oberfläche ist ein eigener nächster Arbeitspunkt.
