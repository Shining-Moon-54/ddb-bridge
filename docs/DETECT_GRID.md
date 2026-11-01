# Detect Grid — verbindlicher Umsetzungsentwurf

**Noch nicht implementiert.** Dieses Dokument ist die konkrete Spezifikation für Etappe C, keine Beschreibung einer fertigen Funktion.

## Einstieg und Schreibgrenze

- Importcheckbox standardmäßig aus.
- Kontextmenüpunkt „Detect Grid“ als letzter Eintrag jeder Foundry-Szene und jedes Bibliothekseintrags; Zugriff als berechtigter GM.
- Eigenes ApplicationV2-Fenster mit tatsächlichem Bild, Ebenenwahl, Zoom, Grid-Overlay und numerischen Korrekturen.
- Analyse, Vorschläge und manuelles Zeichnen ändern nur einen temporären Entwurf. Escape, Schließen und Abbrechen erzeugen **keinen** Dokumentupdate.
- Ausschließlich „Raster übernehmen“ schreibt: in einer Welt per bestätigtem Scene-Update, in der Bibliothek als neue Revision. Bei Bibliotheksvorlagen nie die Originaldatei überschreiben.

## Detektionsablauf

1. Sichtbares gedrucktes Raster im Bild suchen. Grauwert-/Gradientenprofile, Autokorrelation und Peakabstände kombinieren; verdeckte Bereiche und unterbrochene Linien über mehrere Bildausschnitte ausgleichen. Helligkeits-/Kontrastvarianten vergleichen.
2. Mehrere Kandidaten mit Rastergeometrie, Zellgröße, Phase/Versatz, Evidenz und Unsicherheit anzeigen. Harmonische Verwechslungen (halbe/doppelte Zellgröße) sichtbar anbieten.
3. Ohne belastbare sichtbare Linien: Bildmaße, explizite Metadaten und strukturelle Wiederholungen zu **unsicheren Schätzungen** kombinieren. Keine tatsächliche Zellzahl behaupten.
4. Eine Zelle oder einen 3×3-Bereich manuell zeichnen. Für Hex muss die Auswahlgeometrie dazu passen; kein Quadratmaß unbemerkt auf Hex anwenden.
5. Overlay prüfen und gegebenenfalls Typ, Größe und X/Y-Versatz korrigieren. Änderungen erst übernehmen lassen.

Keine Funktion „rasterlose Karte erkennen“; ein schwacher oder fehlender Linienbefund ist Unsicherheit, kein separater Detektionsmodus.

## Native Geometrie und Transformation

Die geprüften v14-Konstanten enthalten Quadrat sowie vier Hexvarianten (`HEXODDR`, `HEXEVENR`, `HEXODDQ`, `HEXEVENQ`). Kein frei erfundener rechteckiger Rastertyp. Verfügbare Typen zur Laufzeit aus `CONST.GRID_TYPES` beziehen, beim Detektionsdialog keinen Gridless-Modus als Erkennung anbieten.

Für Vorschaupolygone Foundrys `BaseGrid.getVertices()` bzw. die tatsächlichen SquareGrid-/HexagonalGrid-Klassen verwenden. Pixeleinheiten müssen unter Beachtung von Bildskalierung, Leveltextur, Padding und Rasterursprung in echte Szenenkoordinaten überführt werden. `GridData` hat keine dokumentierten freien Offsetfelder. Vor Speicherung echte v14-Grid-/Texturtransformationen anhand von Testbildern messen; kein Update auf unbewiesene Felder.

## Abnahme

| Fall | Erwartung |
| --- | --- |
| Starkes Quadratgitter, Linien teilweise durch Möbel verdeckt | Plausible Kandidaten, richtige Zellgröße im Overlay |
| Schwache Linien, Rasterphase ungleich null | Versatz korrigierbar, Analyse behauptet keine Sicherheit ohne Evidenz |
| Mehrdeutige 50-/100-Pixel-Abstände | Beide Kandidaten; explizite Nutzerwahl |
| Hex pointy/flat, gerade/ungerade Offsets | Native Geometrie stimmt nach Übernahme mit Vorschau überein |
| Karte ohne sichtbare Rasterlinien | Unsichere Schätzung oder manuelle Kalibrierung |
| 3×3-Kalibrierung und einzelne Zelle | Maße und Versatz stimmen; sensible Toleranz dokumentiert |
| Vorschau öffnen, ändern, schließen | JSON und Dokumenthash unverändert |
| 30+ Level mit unterschiedlichen Texturtransformationen | Richtige Ebene, kein stilles Verschieben anderer Ebenen |

Analyse in Worker/gekachelten Bildpyramiden planen; maximale Decodergröße und Abbruchpunkte festlegen. Eine zusätzliche Bildanalysebibliothek erst nach Lizenz- und Performanceprüfung wählen.
