# ADR 0001 — Native Originale und Arbeitskopien

Status: **vorläufig für die Alpha**, endgültige Exportentscheidung nach echter v14-Abnahme.

## Problem

Eine manuelle Feld-Whitelist wie im Altprototyp verliert native Daten. Die genaue exportseitige Bereinigung von `Scene.toCompendium()` wurde noch nicht an einer echten v14-Installation verglichen. `exportToJSON()` liefert dem Modul keine einfache JSON-Rückgabe.

## Entscheidung für diesen überprüfbaren Zwischenstand

`toObject()` wird als unveränderliche native Quelle gespeichert. Weltimport erzeugt daraus eine eigene Kopie, entfernt Tokens und weltgebundene Stammattribute, setzt erkannte Assetpfade um und fragt Drittanbieter-Daten/Automatisierungen ab. Originale enthalten gegebenenfalls Tokens; die Importvorschau, README und Sicherheitshinweise erläutern das. Fortschritts-Fog wird als separates Dokument nicht archiviert.

## Konsequenzen

Keine unbekannten Level-/Regionsdaten durch eine eigene Szenenrepräsentation verlieren. Dafür ist das Archiv nicht ohne Sichtprüfung veröffentlichbar und nicht vertraulich abgesichert. Vor einer stabilen Version müssen Roh-/Compendium-/Exportdaten praktisch verglichen und gegebenenfalls originale und exportbereinigte Native-Fassungen sauber getrennt werden. Eine Änderung der Archivierungsstrategie benötigt Formatmigration, dokumentierte Transformationen und eine explizite Entscheidung.
