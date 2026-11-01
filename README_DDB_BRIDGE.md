> **AI Development Notice / Hinweis zur KI-Entwicklung**  
> Dieses Projekt wird mithilfe von OpenAI ChatGPT konzipiert und entwickelt. Quellcode und Dokumentation können KI-generiert sein. Ungeprüfte Funktionen werden nicht als fertig dargestellt.  
> This project is designed and developed with AI assistance; generated code requires independent validation.

# DDB Bridge

**Geplantes gemeinsames Projekt:** D&D-Beyond-Buchimport und die bestehende **Map Library** in einer Foundry-VTT-Lösung.

**Status: Architekturphase / Alpha-Grundlage.** Dieser Branch enthält **noch keinen funktionierenden D&D-Beyond-Zugang** und importiert noch keine gekauften Bücher. Das bestehende Modul `ddb-bridge` bleibt vorerst eigenständig und funktionsgleich.

## Zielbild

Ein auf D&D Beyond erworbenes bzw. berechtigt zugängliches Buch soll nach ausdrücklicher Benutzeraktion in Foundry **als Buchbibliothek** erscheinen: mit eigenen Kompendien für Monster, Klassen, Unterklassen, Spezies, Hintergründe, Talente, Zauber und Ausrüstung, mit Journalen und — soweit verfügbar — dazugehörigen Karten/Szenen. Wo möglich, sollen diese Daten mit denselben nativen Foundry-Dokumenttypen arbeiten wie offizielle Foundry-Quellenbücher. Vollständig handgefertigte Premium-Funktionen, Wände, Beleuchtung, Effekte oder automatische Stufenaufstiege dürfen nur als vorhanden angezeigt werden, wenn sie tatsächlich erzeugt und getestet wurden.

**Schwerpunkt 1:** vollständige Buchimports, **nicht** zunächst Einzelcharakter-Synchronisation.

## Projektstruktur und Übergang

- **Map Library:** Bewährte Szenenarchivierung, Medienzuordnung, Kategorien, Prüfsummen und portable Exporte erhalten.
- **Book Library:** Quellbuch-Inventar, Quellenadapter, Parser, Abhängigkeitsresolver, Foundry-Konverter, Kompendien, Importwarteschlange und Qualitätsbericht.
- **Gemeinsame Bibliothek:** Übersicht mit Buch-/Kartenbereichen; Bücher dürfen Szenen in die Map Library zur Wiederverwendung übernehmen.
- **Übergang:** Bestehende `ddb-bridge`-Modul-ID und `Data/modules/ddb-bridge/storage/` niemals blind umbenennen. Vor endgültiger Zusammenführung einen gesicherten und getesteten Migrationsweg bereitstellen.

**Noch keine D&D-Beyond-API oder Zugangsart als garantiert verfügbar voraussetzen.** Der spätere Quellenadapter muss die Zugriffsberechtigung prüfen und nur zulässig zugängliche Inhalte verarbeiten; er darf keine Paywalls, DRM oder Kontrollen umgehen. **Keine DDB-Session-Cookies, Quellenbuchtexte, Bilder, importierten Compendiums oder privaten Daten in das öffentliche GitHub-Repository committen.**

Weitere Dokumente:
- [DDB Bridge: Projektmanifest](docs/DDB_BRIDGE_PROJEKTMANIFEST.md)
- [Fusion und sichere Migration](docs/DDB_BRIDGE_FUSION.md)
- [Buchimport-Datenvertrag](docs/DDB_BRIDGE_DATENVERTRAG.md)
- [Bestehende Map-Library-Dokumentation](README.md)

## Umsetzungsstand

| Funktion | Status |
| --- | --- |
| Map Library v0.4.0-alpha.7 | Bestehender Code unverändert |
| Stabile Buch-/Quellschlüssel und Importplanung | Erste testbare Grundlage auf diesem Branch |
| Import gekaufter D&D-Beyond-Bücher | **Nicht implementiert** |
| Native Monster-/Zauber-/Klassen-Kompendien | **Nicht implementiert** |
| Buch-Journale/Karten-Integration | **Nicht implementiert** |
| Wiederaufnehmbare Importwarteschlange | **Nicht implementiert** |
| Einzelnes neues installierbares Modul `ddb-bridge` | **Nicht implementiert** |

**Lizenz:** Der bestehende Eigen-Code hat derzeit noch keine allgemeine Open-Source-Lizenz; `LICENSE` und vorhandene Drittanbieter-Lizenzen beachten. Öffentlich sichtbar bedeutet nicht automatisch frei nachnutzbar.
