# Statische SVG-Szenenassets

Seit 0.4.0-alpha.5 können SVG-Dateien als Abhängigkeiten einer nativen Szene archiviert, exportiert, manuell nachgereicht und in einer Weltkopie verwendet werden. Der eigenständige Bildimport bietet weiterhin PNG/JPG/WebP an. Die SVG-Datei und die native Originalszene werden nicht umgeschrieben oder rasterisiert. Das Assetinventar verbindet ursprüngliche Referenz, kopierten Pfad, MIME-Typ `image/svg+xml` und SHA-256.

## Begrenztes statisches Profil

Vor einem Upload prüft `scripts/core/svg.js` gültiges UTF-8 und wohlgeformtes XML mit einem SVG-Wurzelelement im SVG-Namensraum. Erlaubt sind die im Code aufgeführten grafischen SVG-Elemente einschließlich Pfaden, Formen, Gruppen, Text, Verläufen, Clipping, Masken und ausgewählten Filtern. Bekannte Inkscape-, Sodipodi-, RDF-, Dublin-Core- und Creative-Commons-Namensräume dürfen inerte Metadaten enthalten.

Nicht übernommen werden unter anderem Skripte, Ereignisattribute, `foreignObject`, Animationen, Stylesheet-Elemente, eingebettete Bilder, `use`, aktive HTML-Elemente, externe Ressourcen, `xml:base`, DTDs, eigene Entitäten und Verarbeitungsanweisungen außer einer normalen XML-Deklaration. Inline-Stile sind auf die im Code aufgeführten grafischen Eigenschaften begrenzt; CSS-Escapes, Kommentare, At-Regeln und dynamische `attr()`-Werte werden abgewiesen. Ressourcenverweise dürfen ausschließlich einfache lokale Fragmente wie `#gradient1` oder `url(#gradient1)` verwenden.

Seit 0.4.0-alpha.6 sind außerdem `touch-action`, `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height` sowie die Geometrie-Eigenschaften `x`, `y`, `cx`, `cy`, `r`, `rx` und `ry` in Inline-Stilen erlaubt. So bleiben beispielsweise `style="touch-action: none"` an einem Icon und `style="height:100%;width:100%"` an einer Tile-Grafik erhalten, ohne die Datei fälschlich abzulehnen. Dieselbe Wertprüfung gegen aktive und externe Inhalte gilt auch für diese Eigenschaften; unbekannte CSS-Eigenschaften werden nicht pauschal durchgelassen.

Grenzen pro Datei: 2 MiB, 10.000 Elemente, 100 Attribute pro Element und 80 Verschachtelungsebenen. SVGs außerhalb dieses Profils werden mit dem konkreten Grund als nicht gesichert angezeigt. Das ist bewusst keine vollständige SVG-Unterstützung und kein Sanitizer, der aktive Dateien verändert oder repariert.

Die Prüfung fügt SVG-Markup niemals in die Benutzeroberfläche ein. Akzeptierte Bytes werden unverändert kopiert. Der Browser verwendet dafür seinen nativen `DOMParser`; `@xmldom/xmldom` 0.9.12 wird ausschließlich in Node-Tests eingesetzt und nicht in Foundry mitgeliefert. Die echte Foundry-/Canvas-Darstellung bleibt ein Abnahmepunkt.

## Modulflags

Ein Flagwert wird nur als Asset behandelt, wenn er einen eindeutigen einzelnen lokalen Pfad oder eine einzelne HTTP(S)-Adresse beschreibt. Texte, Ausdrücke oder Auswahllisten wie `IA: icons/svg/sun.svg|icons/svg/sleep.svg` werden nicht als eine Datei gelesen. Sie bleiben im Original erhalten. Inhalte beliebiger Modulausdrücke werden nicht automatisch in einzelne Abhängigkeiten zerlegt; unbekannte dynamische Medienabhängigkeiten sind weiterhin eine dokumentierte Grenze.

## Referenzen

- [DOMParser und XML-Fehlerbehandlung](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString)
- [SVG als Bild und Unterschied zum Einbetten als Dokument](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)
- [SVG-Geometrie und CSS-Größen](https://www.w3.org/TR/SVG2/geometry.html)
- [CSS touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)

Bildkontext-Beschränkungen allein ersetzen die Eingangsprüfung nicht, weil SVG-Dateien auch direkt über eine statische URL geöffnet werden können.
