# DDB Bridge + Map Library: Fusions- und Migrationsplan

## Unveränderliche Ausgangslage
- Public repository: `ddb-bridge`.
- Installiertes Foundry-Modul: `ddb-bridge`, Version 0.4.0-alpha.7.
- Weltübergreifende Originaldaten: `Data/modules/ddb-bridge/storage/`.
- Reale Installation noch nicht ausreichend abgenommen; bestehende Alpha nicht als garantiert fehlerfrei bezeichnen.
- Bestehende Main-Branch-Releases und Manifest-URL bleiben bis zum expliziten Migrationsrelease unverändert.

## Architekturentscheidung

**Ein GitHub-Projekt und langfristig eine gemeinsame DDB-Bridge-Oberfläche.** Map Library wird das Karten-/Szenen-Subsystem; Book Library verarbeitet die Buchinhalte. Die Verantwortung für Originaldatenspeicherung und Scenen-Import bleibt bei der bereits vorhandenen Map-Library-Service-Schicht. Die Book Library darf keinen zweiten konkurrierenden Szenenspeicher aufbauen.

Die Zusammenführung ist eine **schrittweise Integration**, nicht das Kopieren zweier ZIPs in ein Verzeichnis. Eine neue Modul-ID `ddb-bridge` wird **erst nach** geklärter Migration und Tests freigegeben.

## Phasen
1. **Feature-Branch**: Dokumentation, Buchidentität, Dry-Run-Planer und Tests; Map-Library-Code vollständig unverändert.
2. **Book Library als Subsystem**: UI und reine Adapter; geladene Quellinformationen zunächst nur validieren und zur Vorschau anbieten; keine echten Daten ohne bestätigte Zugriffsquelle.
3. **Foundry-Kompendien**: Eigene modulbasierte Packs für Items/Actors/JournalEntries; kein Schreiben in bestehende Kaufmodule.
4. **Integration**: Karten aus importierten Abenteuerquellen über die Map-Library-Service-API archivieren, sofern tatsächliche Karten-Assets und Rechte vorliegen.
5. **Migration / ein Modul**: Backup → lesbarer Legacy-Katalog → überprüfter Import in neuen Namespace → Hash-Abgleich → Rollback. Bis erfolgreiche Abnahme Legacy-Version nicht deaktivieren/löschen.
6. **Repo umbenennen und Release**: Repository-Slug `ddb-bridge`; neue Manifest-/Download-URLs erst nach veröffentlichten Dateien und getesteten Release-Assets. Alte Releases und Verweise nicht unbemerkt zerstören.

## Harte Regeln
- Alte v14-Scene-Originale inkl. Wänden, Lichtern, Tiles, Regions und Drittanbieter-Flags bleiben unangetastet.
- Neue Bibliotheksübersicht ist nicht gleichbedeutend mit Materialisierung aller Kompendieneinträge in einer Welt.
- Jeder Format-/Storage-Wechsel benötigt Migrationstest und Rückweg.
- Keine Doppelung des bestehenden Map-Library-UI-/ZIP-/Cloud-Codes; Wiederverwendung durch explizite Services.
- Kein Export importierter kostenpflichtiger D&D-Bücher in öffentliche Repo-Releases oder Demo-Daten.
