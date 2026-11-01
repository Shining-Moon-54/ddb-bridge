# Foundry-v14-API-Prüfung

Stand: 24.10.2026. Geprüft gegen die offiziellen öffentlichen v14-Dokumentationsseiten. Diese Seiten bezeichnen ihren Stand als 14.368 Stable. Eine lizenzierte Foundry-Laufzeit stand in der Entwicklungsumgebung nicht zur Verfügung. „Dokumentiert“ bedeutet hier **nicht** „praktisch abgenommen“.

## Verwendete, dokumentierte Schnittstellen

| API | Einsatz / Befund |
| --- | --- |
| `Scene.toObject(source=true)` | Native Datenkopie statt Feld-Whitelist; in dieser Alpha Archivquelle |
| `Scene.toCompendium(pack, options)` | Exportorientierter Alternativpfad; genaue Feldverluste noch praktisch zu vergleichen, keine garantierte Tokenbereinigung behauptet |
| `Scene.create(data, operation)` | Neue World-Scene, nicht Aktualisierung einer vorhandenen Szene |
| `DatabaseCreateOperation.keepEmbeddedIds` | Erhält eingebettete Kennungen; wichtig für native Level und Regionen |
| `DatabaseCreateOperation.keepId` | Übernimmt eine vorher neu erzeugte Stammkennung; keine Archiv-ID-Kollision |
| `SceneData.levels` / `LevelData` | Native Level sind eingebettete Daten, einschließlich Texturen, Elevation und Sichtbeziehungen |
| `Scene.createThumbnail({level,...})` | Vorschau pro Level dokumentiert; aktuelle Alpha nutzt nur eigenes Thumbnail des ersten Hintergrundbildes |
| `FilePicker.implementation` | Konfigurierbare FilePicker-Implementierung |
| `FilePicker.browse("data", path)` | Verzeichnisinhalt; Grundlage für Katalogköpfe |
| `FilePicker.createDirectory(source,target,options)` | Modulunterordner anlegen; Fehler anschließend mit Browse verifizieren |
| `FilePicker.uploadPersistent(packageId,path,file,body,options)` | Dokumentierter Upload in persistenten System-/Modulspeicher; keine selbst erfundene Server-API |
| `ApplicationV2._renderHTML` / `_replaceHTML` | DOM-basierte Benutzeroberfläche ohne HTML-Einfügen fremder Namen |
| `game.modules` / `Collection.values()` | Foundrys Collection iteriert standardmäßig Werte statt Map-Einträgen. Aktive Modulkennungen werden aus `values()` gelesen; Vorschau und Importprüfung verwenden dieselbe Auswertung |
| `renderSceneDirectory(application, element, ...)` | Spezialisierter `renderApplicationV2`-Hook; HTMLElement um den Bibliotheksbutton ergänzen, einschließlich erneutem Rendern und Popout |
| `getSceneContextOptions(application, menuItems)` | Spezialisierter `getDocumentContextOptions`-Hook; zusätzlicher Eintrag zum Sichern einer angeklickten Welt-Szene. Bedingungen und Callback erhalten DOM-Elemente |

`ClientDocument.exportToJSON()` ist eine Downloadaktion; es wird nicht als JSON-Rückgabefunktion verwendet. `importFromJSON()` ist kein Ersatz für das Erstellen einer neuen Szene. Foundry-Szenenexporte bündeln die Medienbytes nicht automatisch; diese Aufgabe erledigt das Paketformat des Moduls.

Lokale Szenenreferenzen können bereits URI-kodierte Dateinamen enthalten. `localURL()` prüft zuerst den Pfad, dekodiert jeden Pfadbestandteil genau einmal mit `decodeURIComponent()` und kodiert ihn mit `encodeURIComponent()` für die HTTP-Anfrage. Dadurch bleiben `%20` und UTF-8-Sequenzen korrekt, statt `%` erneut zu kodieren. Die Archivoriginale und Dateien werden dabei nicht umbenannt oder verändert. [JavaScript-Referenz: encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent), [decodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent).

SVG-Abhängigkeiten werden über den nativen Browser-`DOMParser` als XML geprüft, ohne den Dokumentbaum in die Seite einzufügen. Gültige SVG-Namensräume, Parserfehler und ein begrenztes statisches Profil werden vor dem Upload geprüft; keine zusätzliche Foundry-Server-API wird vorausgesetzt. Die Node-Tests verwenden einen separaten XML-Parser. [SVG-Profil](SVG.md), [DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString).

## Offizielle Quellen

- [Scene](https://foundryvtt.com/api/v14/classes/foundry.documents.Scene.html)
- [SceneData](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.SceneData.html)
- [LevelData](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.LevelData.html)
- [DatabaseCreateOperation](https://foundryvtt.com/api/v14/interfaces/foundry.abstract.types.DatabaseCreateOperation.html)
- [FilePicker](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.FilePicker.html)
- [ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html)
- [SceneDirectory](https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.SceneDirectory.html)
- [renderApplicationV2](https://foundryvtt.com/api/v14/functions/hookEvents.renderApplicationV2.html)
- [getDocumentContextOptions](https://foundryvtt.com/api/v14/functions/hookEvents.getDocumentContextOptions.html)
- [ContextMenuEntry](https://foundryvtt.com/api/v14/interfaces/foundry.ContextMenuEntry.html)
- [Module](https://foundryvtt.com/api/v14/classes/foundry.packages.Module.html)
- [Collection](https://foundryvtt.com/api/v14/classes/foundry.utils.Collection.html)
- [Game](https://foundryvtt.com/api/v14/classes/foundry.Game.html)
- [GridData](https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.GridData.html)
- [v14-Rastertypen](https://foundryvtt.com/api/variables/CONST.GRID_TYPES.html)
- [BaseGrid](https://foundryvtt.com/api/classes/foundry.grid.BaseGrid.html)

## Noch zwingend praktisch zu prüfen

1. Tatsächliche Dokumente in `toObject()`, `toCompendium()` und manuellem JSON-Export vergleichen: Tokens, Levels, Flags, Regionen, `_stats`, Inhalte und Kennungen.
2. `keepEmbeddedIds` an einer echten 32-Level-Szene einschließlich Regionen, Levelsichtbarkeit und Levelübergängen verifizieren. Hooks/Systeme können Create-Daten verändern.
3. UploadPersistent-Rückgabe, automatische Storageanlage und Update-Erhalt auf realer v14-Installation prüfen. Unterpfad-Reverseproxy und Dateiberechtigungen einbeziehen.
4. Spielerclient: direkte Modul-API und direkte Foundry-Uploadanfrage müssen den vorgesehenen Grenzen entsprechend abgelehnt werden. Keine zusätzliche GM-only-Lesesicherheit des statischen Speichers behaupten.
5. Fehlende Journal-, Playlist-, Region-, Level- und Fremdmodulziele vollständig inventarisieren. Derzeitige Prüfer erkennen nicht alle Referenzformen.
6. Rasterursprung und Texturtransformationen praktisch vermessen. Keine imaginären `grid.offsetX/offsetY`-Felder einführen: die dokumentierte `GridData` enthält sie nicht.
7. Keine offiziell dokumentierte, vom Modul frei registrierbare Server-Fetch-API aus den geprüften Client-Seiten ableiten. Direkter serverseitiger URL-Import bleibt bis zu einer belastbaren Lösung gesperrt.

## Freiwillige Diagnose in Foundry

In einer aktiven v14-Testwelt eine Szene ansehen und als GM in der Browserkonsole ausführen:

```js
const report = await game.modules.get("map-library").api.diagnoseScene();
console.table(report.counts);
console.log(report);
```

Die Diagnose liest die Szene, vergleicht Original und `toCompendium(null)`, zeigt Feldnamen und Mengen und prüft, ob das Original unverändert blieb. Sie lädt nichts öffentlich hoch und legt keine Szene an. Fehler beim dokumentierten Compendium-Aufruf werden im Bericht ausgewiesen. Private Szenenwerte werden nicht in den Bericht übernommen. Dieser Bericht ist noch keine vollständige Abnahme.

## Papierkorb ohne erfundene Datei-API

Die geprüfte öffentliche v14-FilePicker-Schnittstelle bietet keinen allgemeinen Dateilösch-Endpunkt. Der Löschbutton verwendet deshalb eine neue Katalogrevision und bewahrt Medien, die vorhandene Welt-Szenen referenzieren können. Eine endgültige Dateibereinigung ist nicht implementiert. Cloudaktionen verwenden ausschließlich direkte dokumentierte Google-/Dropbox-Browser-APIs, keine erfundene Foundry-Server-Erweiterung; [Anbieterprüfung und Einrichtung](CLOUD.md).
