# Anforderungsabdeckung

Quelle: vollständige Projektübergabe, Abschnitte 1–14. Status: **I** implementiert/isoliert getestet, **T** echte v14-/Integrationstests ausstehend, **O** offen. Keine Zeile erklärt allein eine Etappe für abgenommen.

| Anforderung | Status | Nachweis / verbleibende Arbeit |
| --- | --- | --- |
| Eine Modulinstallation, v14, Deutsch, kein externer Dienst | I/T | Manifest, ES-Module, gebündelte ZIP-Bibliothek; Setup-Abnahme offen |
| Öffentliches Repository + deutscher/englischer KI-Hinweis | I | README-Einstieg und Repository-Metadaten bei Anlage |
| Native Szenendaten als Autorität, beliebig viele Level | I/T | Datenkopie ohne Level-Limit; 32-Level-Tests; echtes Rendering offen |
| Tiles, Dächer, Regionen, Zeichnungen, Flags erhalten | I/T | Original unverändert; optionale Flagübernahme auf Weltkopie; dynamische Fremdabhängigkeiten offen |
| Keine neuen Spieltokens/Actors oder FogExploration | I/T | Tokens aus jeder Weltkopie entfernt; Actors/Fog-Dokumente nie gelesen/erstellt |
| Portable Medienbytes und Pfadumbiegung | I/T | Lokale bekannte Referenzen, Hashes, neue Modulpfade; vollständige native Feldabdeckung und Remotequellen offen |
| Statische SVG-Szenenassets, keine Modultexte als Einzeldateien | I/T | Begrenztes SVG-Profil, unveränderte Bytes, Roundtrip- und Ablehnungstests; echte Foundry-Darstellung offen |
| Kategorien mit Unterkategorien und Verschieben | I | Zyklusprüfung und logische Pfade ohne Medienverschiebung |
| Löschen / Papierkorb | I/T | Einzel-/Mehrfachbestätigung, erwartete Revision/Metadaten, Wiederherstellung; Medien bleiben für Weltkopien erhalten |
| Metadaten, Suche, Filter, Sortieren, Favoriten | I | Datenmodell/Galerie; 5.000-Metadaten-Test |
| Thumbnail je Ebene | O | Nur erste Hintergrundvorschau; API pro Level dokumentiert |
| Kachel/Liste, Paging, Lazy Loading | I/T | 48 Karten pro Seite; DOM-Test; reale Pi-Performance offen |
| Mehrfachauswahl/-verschieben/-export | I | Auswahl aller Treffer / Seite, ZIP-Auswahl |
| Vollständiger Massenimport mit Report/Abbruch | I/O | Gemeinsames Inventar und einzelne Prüfungen; Ein-Klick-Batch, resumierbarer Report offen |
| SHA-256, Dubletten, fehlende Assets, Integrität | I | Bytegleiche Szenen, SHA aller Assets, CRC ZIP, UI-Bericht; semantische Duplikate offen |
| Original unverändert, Update explizit, Historie | I/T | Neue Revisionen, erwartete Vorgängerrevision; Wiederherstellungs-UI offen |
| GM-Prüfung auch an wirksamen Aktionen | I/T | Service-/Storageprüfung; Foundry-Serverautorisierung praktisch offen |
| Bild, Welt-Szene, native JSON | I/T | PNG/JPG/WebP plus selektierte Medienabhängigkeiten |
| Bibliotheksbutton im Szenenverzeichnis, Sichern per Szenen-Rechtsklick | I/T | v14-Hooks, direkter Vorschauweg, GM-Prüfung und DOM-/Hook-Tests; echte Menüabnahme offen |
| UVTT/DD2VTT | O | Primärformat-/v14-Tests und Konvertierung fehlen |
| Eigenes ZIP und Fremdstrukturen | I/T | Inventar, eindeutige Zuordnung oder manuelle Auswahl, Limits; große reale Archive offen |
| Direktes öffentliches HTTPS → Foundry-Server | O | Sichere reine Modularchitektur nicht belegt; kein Browserdownload als Erfüllung ausgegeben |
| Detect Grid inkl. Kontextmenüs, Schwachlinien, Hex, Kalibrierung | O | Verbindlich, vollständig beschrieben in DETECT_GRID.md |
| Anbieterprofile, mehrere Konten, manueller Cloudexport | I/T | Google Drive und Dropbox, eigene Appkennung, Sitzungsanmeldung, Kontobindung, Uploads und Prüfsummen; echte Browser-/Kontoabnahme offen |
| Cloudlimits, Cache, Fallback | I/O | Exportlimit je Profil inkl. vollständiger sichtbarer Exportliste geprüft; Quoten über mehrere Geräte, Cache und Fallback offen |
| Nur manuelle Cloudaktion, keine automatische Cloudlöschung | I/O | Nur explizite Uploads und Nutzungsscan; kein Remote-Delete-Endpunkt. Bidirektionaler Sync offen |
| Alle Referenzen/Abhängigkeiten vor Weltimport prüfen | I/O | Szenen-UUIDs, Flagscopes und Automatisierungen teilweise erkannt; Journal-/Region-/Leveldetailprüfung offen |
| GitHub-Release, anonymes Manifest und ZIP | I/T | Reproduzierbarer Paketbau + manueller Release-Workflow; erst nach erfolgreichem Lauf als publiziert behaupten |
| Lizenzentscheidung | O | LICENSE dokumentiert ausstehende Entscheidung; fflate separat MIT |
| Altdatenmigration | I/O | Fremd-ZIP als sicherer manueller Pfad; irreversible Altverluste dokumentiert; kein blindes Umbenennen |
