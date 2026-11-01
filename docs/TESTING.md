# Tests und Abnahme

Stand 24.10.2026, Version 0.4.0-alpha.7: **86 automatisierte Tests bestanden**. Ausgeführt mit Node 24.22.1. Kein realer Foundry-v14-Server war in der Entwicklungsumgebung verfügbar. Die synthetischen Fixtures sind selbst erzeugt; sie sind keine von Foundry validierten Exportbeispiele.

28 zusätzliche Tests für Papierkorb und Cloudexport: bestätigte Einzel-/Mehrfachlöschung, Abbruch, veraltete Auswahlen, Wiederherstellung und unveränderte Mediendateien; UI-Anbieterauswahl ohne fremde Einstellungsfelder; öffentliche Profile ohne Tokenpersistenz; getrennte Konten, Rollenwechsel, erneute Kontobindung, Limits und konkurrierende Exporte; Google-Popupkonfiguration und Dropbox-PKCE; Netzwerkgrenzen, Fehlerredaktion, Pagination, Uploadblöcke und Hashabweichungen. Je ein vollständiger Google-/Dropbox-HTTP-Adapter-Roundtrip verbindet Sitzung, echtes Exportpaket, simulierten Anbieter und unabhängige Wiederaufnahme. Dies sind HTTP-Doubles, keine echten Cloudkonten.

Drei neue Regressionstests prüfen Inline-Stile für `touch-action`, Größen und SVG-Geometrie einschließlich Groß-/Kleinschreibung, Leerzeichen und `!important`; aktive/externe Werte und unbekannte Eigenschaften bleiben abgewiesen. Eine synthetische Vier-Ebenen-Szene verwendet die gemeldeten Pfade `icons/svg/{book,daze,sun,explosion}.svg` und `modules/tychmaps-dotmm/assets/tiles/rope-coil.svg` mit den Stilmustern aus der Fehlermeldung. Vorschau ohne Assetwarnungen, unveränderte Medienbytes, Archivierung, ZIP-Export, Wiederaufnahme in einer unabhängigen Storage-Simulation und Weltkopie werden geprüft. Vor der Codekorrektur scheiterten Stilakzeptanz und Szenen-Roundtrip mit dem gemeldeten Ablehnungsgrund. Die tatsächlichen Foundry- und Moduldateien sind keine Testfixtures und wurden hier nicht geprüft.

Sieben neue Tests prüfen statische SVG-Assets einschließlich Verläufen und inerten Editormetadaten, Ablehnung aktiver/externer Inhalte und CSS-Umgehungsversuche, XML-/UTF-8-Fehler und Grenzen für Größe/Elemente/Attribute/Tiefe. Der Roundtrip umfasst Foundry- und Modul-Iconpfade, unveränderte SVG-Bytes im Archiv/ZIP und angepasste Referenzen in einer neuen Weltkopie. Ein separater Test verhindert den Upload eines abgelehnten SVGs. Die gemeldete Zeichenfolge `IA: icons/svg/sun.svg|icons/svg/sleep.svg` wird als Modultext bewahrt und nicht als Einzeldatei gelesen. Als XML-Testparser dient `@xmldom/xmldom` 0.9.12 im strikten XML-Modus; die native Browser-/Foundry-Abnahme bleibt offen.

Fünf neue Tests prüfen die v14-Menüintegration: ein einzelner Bibliotheksbutton nach erneutem Rendern und in separaten Fenstern, Erhalt fremder Buttons, kontextabhängige Szenenkennung (`entryId`, `documentId`, `sceneId`), Ausschluss von Ordnern/Kompendien, GM-Prüfung auch nach Rollenwechsel, Fehlermeldungen bei gelöschten Szenen und Registrierung während `init`. Der direkte Vorschauweg wird mit dem tatsächlichen Service und Storage-Double geprüft; dabei entstehen keine Archiveinträge und die Quellszene bleibt unverändert. Eine echte Foundry-Menüabnahme bleibt offen.

Der falsche 404-Fehler bei kodierten Leerzeichen wurde vor der Korrektur reproduziert: Die URL enthielt `%2520` statt `%20`, und die simulierte Serverdatei wurde nicht gefunden. Die neuen Tests prüfen rohe, kodierte und gemischte Pfade, Umlaute, reservierte Dateinamenzeichen, genau eine Dekodierung und weiterhin abgewiesene unsichere Pfade. Ein Integrationstest führt Archivierung, portablen Export und Weltimport über den FoundryStorage-Adapter und einen statischen Server-Double aus; die native Originalreferenz bleibt unverändert. Er prüft außerdem Unterstriche im Namen der Archiv- und Exportkopie sowie die neu zugeordnete Medienreferenz in der Weltkopie. Zwei zusätzliche Tests prüfen den Ersatz jedes einzelnen Leerzeichens, kodierte Namen, Umlaute, Namenslängen und getrennte Namen für unterschiedliche Prüfsummen. Der bestehende Roundtrip prüft weiterhin die Deduplizierung identischer PNG-Bytes.

Der gemeldete Vorschaufehler „(destructured parameter) is not iterable“ wurde mit einem nichtleeren, gemäß der offiziellen API über Werte iterierenden Collection-Double reproduziert. Der Regressionstest schlug mit dem alten Service an der Modulauswertung fehl und prüft nach der Korrektur Vorschau, Archivierung und Importprüfung einschließlich aktiver, deaktivierter und fehlender Fremdmodule. Alle bestehenden Service-Tests verwenden ebenfalls eine nichtleere Modulsammlung. Die Prüfung in der tatsächlichen Installation des Nutzers steht noch aus.

## Automatisch geprüft

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

| Testgruppe | Inhalt |
| --- | --- |
| Szene | 32 Level, eingebettete Kennungen, native Daten unverändert, Wände/Licht/Tiles/Dächer/Regionen, optionale Flags, Tokens nur aus Arbeitskopie entfernt |
| Medien/Referenzen | Levelhintergründe, Dachbilder, Zeichnungen, Tile-/Flag-Medien, Audio bei tatsächlicher Referenz, fehlende Szenenziele |
| SVG | Statisches Profil einschließlich Inline-Geometrie/-Größen und touch-action, unveränderte Bytes, aktive/externe Inhalte abgelehnt, XML-/UTF-8-/Komplexitätsgrenzen, Archiv-/ZIP-/Weltkopie-Roundtrip |
| JSON/Pfade | Prototype-Schlüssel, Tiefenlimit, Dokumenttyp, erkennbare Secrets, Traversal und kodierte Pfade |
| Papierkorb | Bestätigungsdialog, Einzel-/Mehrfachlöschung, kein Medienverlust, Wiederherstellung, veraltete Auswahl, Abbruch und GM-Rechte |
| Cloud | Google-/Dropbox-Sitzung, PKCE/Tokenmodell, Profil-/Kontogrenzen, Quoten, Pagination, Adapter-HTTP-Roundtrips, Uploadhash und Fehlerfälle; ausschließlich Doubles |
| Katalog | Hierarchie, Umbenennen/Verschieben, Zyklusfehler, Suche und Paging mit 5.000 Metadaten |
| ZIP | Stored/Deflate, CRC32, Headerabweichungen, Verschlüsselung, Größen-/Dateianzahl-/Expansionsschutz, Fremdzuordnung und Abbruch |
| Roundtrip | Archiv → ZIP → zweite simulierte Bibliothek → neue simulierte World-Scene |
| Datenverlust | Uploadfehler, Dublettenbestätigung, unveränderliche alte Revision, veraltete Update-Anforderung, Hashmanipulation |
| Rechte/Speicher | GM-Prüfung direkt am Service, Modulpfadgrenze, Unterpfadproxy, Streaminglimits, Snapshotidentität, zwei Katalogköpfe |
| DOM | Maximal 48 Karten, Text statt Ausführung fremder HTML-Namen; mit linkedom ohne echten Browserrender |

Diese Tests verwenden API-Doubles für Foundry. Sie prüfen **nicht** die native Szenevalidierung, die Canvasdarstellung, tatsächlich serverseitige Uploadrechte oder Foundrys Modulupdateverhalten.

## Echte v14-Abnahme — noch offen

Einträge erst nach tatsächlicher Durchführung mit Version, Datum, Betriebssystem und Ergebnis ergänzen. Keine Häkchen allein aufgrund isolierter Tests setzen.

| ID | Durchführung | Erwartetes Ergebnis | Stand |
| --- | --- | --- | --- |
| V14-01 | Über die Manifest-URL installieren und in separater v14-Testwelt aktivieren | Init/Ready ohne Konsolefehler; „Map Library öffnen“ im Szenenverzeichnis und „In Map Library sichern“ im Szenen-Rechtsklickmenü funktionieren; keine Dopplung nach Rendern oder Popout | Offen |
| V14-02 | Bild mit bekanntem Raster importieren | Richtige Maße; natives Level; Rasterdaten bleiben unangetastet | Offen |
| V14-03 | Echte Szene mit 32 Leveln, unterschiedlichen Höhen/Sichtbarkeiten, Tiles und Dächern archivieren | Vollständige native Daten, Assets und Warnungen; Original unverändert | Offen |
| V14-04 | `toObject`, `toCompendium`, manuelles `exportToJSON` vergleichen | Tatsächliche Bereinigung dokumentiert; keine Mutationen am Original | Offen |
| V14-05 | Aus Archiv neue Szene in zweiter Welt auf demselben Server erstellen | Keine Tokens; keine Actors; alle eingebetteten Level/Regionen/IDs korrekt | Offen |
| V14-06 | ZIP auf zweiter Foundry-Installation importieren | Keine alten absoluten Serverpfade nötig; alle Medien nutzbar | Offen |
| V14-07 | Regionen mit Level-/Szenenzielen, fehlendem Journal und Fremdflags | Warnungen konkret; keine vorsorgliche Regionslöschung; optionale Übernahme funktioniert | Offen |
| V14-08 | Verdächtige/ungewöhnliche Regionsbehaviors und Modulflags | Ohne Prüfbestätigung kein unbeabsichtigtes Ausführen | Offen |
| V14-09 | Fehlende Datei, ersetzte Mediendatei, beschädigte Szene | Sichtbarer Fehler bzw. bewusstes Trotzdem; Szenenhashfehler blockiert | Offen |
| V14-10 | Spielerclient, Rollenwechsel während Upload, direkte Uploadanfrage | Modul-GM-Prüfung und reale Foundry-Serverberechtigungen wirksam | Offen |
| V14-11 | Unterpfad-Reverseproxy, Dateinamen mit Leerzeichen, Hostupdate | Pfade korrekt; persistente Daten nach gewöhnlichem Update noch da | Offen |
| V14-12 | Gleichzeitige GMs / zwei Geräte | Keine stillen überschriebenen Kataloge; Konflikt erkannt und Quellen erhalten | Offen |
| V14-13 | 10.000 Metadaten, große Karte, Pi-Hosting | Ladezeit/RAM/CPU messen, keine Tausende aktiven World-Scenes | Offen |
| V14-14 | Abbruch und Fehler während Medienupload / Katalogabschluss | Alte Bibliothek intakt; eventuell unverknüpfte Dateien dokumentiert | Offen |
| V14-15 | Veröffentlichtes Manifest und ZIP ohne Anmeldung laden | Korrekte anonyme Antworten, vollständiges ZIP, Manifestversion identisch | Release-Workflow führt Prüfung aus; Erfolg erst danach eintragen |

## Echte neue Funktionsabnahme — noch offen

| ID | Durchführung | Erwartetes Ergebnis | Stand |
| --- | --- | --- | --- |
| DEL-01 | Karte in realer Welt importieren; Archivkarte löschen; Papierkorb und Wiederherstellen prüfen | Bestätigung, korrekte Filter, Welt-Szene behält Medien, Wiederherstellung ohne neue Assetkopien | Offen |
| CLD-01 | Google-Web-App für eigene Foundry-Herkunft einrichten und verbinden | Kontoauswahl, nur drive.file, richtige Kontozuordnung | Offen |
| CLD-02 | Dropbox-App-Folder mit drei Scopes einrichten; Code-Anmeldung | PKCE-Freigabe, richtige Kontoidentität, keine Tokens in Storage/ZIP | Offen |
| CLD-03 | Je Anbieter zwei Konten als getrennte Profile; Neuverbinden mit falschem Konto | Profile unabhängig, falsches Konto blockiert | Offen |
| CLD-04 | Kleine und >4-MiB-Karte exportieren; Cloudpaket herunterladen und in zweiter Welt importieren | SHA-256/Content-Hash, Vollständigkeit, richtige Medien und Ebenen | Offen |
| CLD-05 | Kleines Limit, erschöpftes Anbieterkontingent, Rollenwechsel, Netzabbruch, Tokenablauf | Keine falsche Erfolgsmeldung; lokale Originale vollständig erhalten | Offen |
| CLD-06 | Zwei Tabs und zwei Geräte, Reverseproxy, Firefox/Chromium, blockierte Popups/CORS | Verständliche Meldungen, Geräte-Quotengrenze dokumentiert, keine automatischen Löschungen | Offen |

## Echte Testszene vorbereiten

In einer Testwelt selbst eine Karte mit deutlichem Raster und mehreren sichtbaren markierten Ebenen erstellen. Je Ebene mindestens eine andere Höhenlage und eine andere Bildzuordnung. Dazu verschlossene Tür, Licht, transparentes Dachtile, Zeichnung, mehrere Regionsformen, einen Levelübergang und einen absichtlich fehlenden Szenenverweis. Einige Tokens zur Kontrolle des Ausschlusses setzen. Falls Fremdmodulflags getestet werden, Anbieter und Version nennen.

Hash/Export des Originals vor und nach Archivieren sowie vor und nach abgebrochenem Weltimport vergleichen. Neue Szenen zunächst nur ansehen und kontrollieren; erst nach erfolgreicher Prüfung aktivieren. Testweltartefakte nicht ungeprüft öffentlich committen.

## Releasekriterium

Eine experimentelle Alpha darf mit offenen Runtimepunkten klar gekennzeichnet werden. Für einen stabilen Release sind V14-01 bis V14-14, das anonyme Installationskriterium sowie die relevante Funktionsabnahme der jeweiligen Etappe erforderlich. `compatibility.verified` wird erst nach dokumentierter echter Laufzeitprüfung gesetzt.
