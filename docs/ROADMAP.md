# Umsetzungsplan und Meilensteine

Die Projektübergabe legt den Gesamtumfang fest. Eine Etappe gilt erst nach ihrem Abnahmekriterium als abgeschlossen, nicht bereits nach dem Anlegen einer Oberfläche. Diese Alpha implementiert einen großen Teil A und ausgewählte Teile B/E; die echte v14-Abnahme steht aus.

| Etappe | Liefergegenstand | Abnahme | Aktueller Stand |
| --- | --- | --- | --- |
| A1 | Neue Modul-ID, KI-Kennzeichnung, API-Abgleich, persistente Bibliothek und native Archivquelle | Installation lädt; Originaldaten werden nicht verändert | Code und isolierte Tests vorhanden; Runtime offen |
| A2 | Kategorien, Metadaten, Galerie, Suche, Paging, Weltkopie | Dieselbe archivierte reale v14-Szene in einer anderen Welt neu anlegen | Code/Tests vorhanden; reale Weltwechsel offen |
| B1 | Lokale Assetkopien, eigenes portables ZIP, Integrität | Andere Foundry-Installation zeigt Ebenen, Tiles und Dächer vollständig | Simulierter Roundtrip bestanden; reale zweite Installation offen |
| B2 | Fremd-ZIP-Inventar und manuelle Zuordnung | Uneindeutige Assets werden nie ungefragt gewählt | Code/Tests vorhanden; reale große Mischarchive offen |
| B3 | UVTT/DD2VTT und sichere HTTPS-Quellen | Wände/Licht/Raster richtig konvertiert; DNS/Redirect-SSRF-Tests bestanden | Offen |
| C | Detect Grid vollständig gemäß eigenem Entwurf | Sichtbare Linien, Unsicherheitskandidaten, Quadrat/Hex, Zelle/3×3; nur bestätigte Änderungen | Offen |
| D1 | Kontoprofile, Capability-Modell, erster echter Anbieter | Mehrere Konten desselben Anbieters, manuelle Sync, getestete Limits/Konflikte | Teilweise: Google-/Dropbox-Exportprofile, Anmeldung, Profilgrenzen und HTTP-Roundtriptests. Echte Konten, Sync, Cache und Fallback offen |
| D2 | Weitere Anbieter nach Machbarkeit | Jeder Anbieter separat Ende-zu-Ende geprüft | Offen |
| E1 | Rechte, Quoten, Konflikte, ZIP-Härtung, Prüfungen | Fehlversuche überschreiben/löschen keine Originale; echter Spielerclienttest | Isolierte Tests vorhanden; Rechte Runtime offen |
| E2 | Lasttests, öffentliche Installationsprüfung, Wiederherstellungsoberfläche | 10.000+ Metadaten, große Levelszene, Raspberry-Pi-Messwerte, vollständige Testprotokolle | Offen |

## Nächster konkreter Arbeitsblock

1. Alpha in separater v14-Testwelt installieren; API-Diagnose und Testmatrix protokollieren.
2. Erkannte v14-Schemadifferenzen und Upload-/Create-Probleme korrigieren, bevor weiteres UI ergänzt wird.
3. Native Level-/Regionsziele sowie alle relevanten Texturfelder mit echten Exportfixtures absichern. Fixtures selbst erzeugen; keine Kaufkarten ins Repository.
4. Snapshotwiederherstellung und explizite Vorlagenhistorie als UI ergänzen; danach Katalogkompaktierung und resumierbare große Imports planen.
5. Detect-Grid-Einstieg inklusive Kontextmenüs implementieren. Im selben Arbeitsblock Vorschau-/Apply-Semantik von echten v14-Daten abnehmen.

## Für Folgesitzungen

Eine gute Aufgabe enthält Ausgangsversion/Commit, genau ein überprüfbares Ziel, betroffene Anforderungen, primäre API-Quellen und Abnahmedaten. Beispiel:

> Prüfe Version 0.4.0-alpha.7 in Foundry v14 anhand docs/TESTING.md. Korrigiere nur Archivierung und Weltimport einer nativen 32-Level-Szene mit Regionen, statischen SVG-Icons sowie die beiden Szenenmenü-Zugriffe. Behalte Originale unverändert. Liefere reproduzierbaren Testbericht und eine neue Alpha; behauptete API-Kompatibilität nur nach dem tatsächlichen Test.

Keine Funktion wird durch Anbieterzwang oder künstliche Freischaltungen beschränkt. Implementierte lokale Funktionen bleiben unabhängig von der Cloud nutzbar.
