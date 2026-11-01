# Migration des Altprototyps

## Tatsächlich geprüft

Das bestehende `RP_Map_Library_v0.3.0.zip` wurde aus den vorhandenen Dateien gelesen. Es enthält sieben Dateien, etwa 15 KiB: Manifest, README, CSS, ein Hauptskript, leeren/anfänglichen Katalog und zwei externe Hilfsskripte.

| Befund | Konsequenz |
| --- | --- |
| Alte ID `rp-map-library`, Mindestversion 13 | Neue Installation als `map-library`, v14 ausschließlich |
| Eigenes `sanitizeScene` lehnt mehr als ein natives Level ab | Kein Wiederverwenden dieser Einschränkung |
| Entfernt Tiles, Zeichnungen, Regionen, Geräusche, Tokens, Flags und Vordergrunddaten | Aus dem Altarchiv können bereits entfernte Daten nicht rekonstruiert werden |
| Beim Weltimport werden bestehende Flags ersetzt | Neue Implementierung erhält Archivoriginale und fragt optionale Weltkopieübernahme ab |
| Einzelnes überschriebenes `catalog.json` | Neue unveränderliche Snapshotketten mit Konflikterkennung |
| Cloudprofile sind Metadaten ohne API/Limitdurchsetzung | Keine Übernahme als angeblich funktionierende Cloudkonten |
| `cloud-sync.sh` verlangt externes rclone | Nicht als Modulvoraussetzung oder integrierte Cloudfunktion übernommen |

Die neue Implementierung ist bewusst neu gegliedert. Es erfolgte kein blindes Ersetzen aller alten Namen oder Pfade.

## Sicherer Übergang

1. Alten Modulordner inklusive `storage/` vollständig sichern. Alten und neuen Modulordner zunächst parallel aufbewahren.
2. Bevorzugt ursprüngliche vollständige Welt-Szenen in einer v14-Testwelt mit Map Library neu archivieren. Nur so lassen sich Daten zurückholen, die der Altprototyp bei der Aufnahme entfernt hat.
3. Falls nur der Altbestand vorhanden ist: Sicherungs-ZIP als Fremd-ZIP in Map Library öffnen. Szenen-JSON und Medien werden inventarisiert; alte Skripte bleiben ungenutzt.
4. Bei mehrfachen `map.webp`-/`map.jpg`-Namen jedes Hintergrund-/Tile-Asset ausdrücklich richtig zuordnen. Name, Quelle, Autor, Lizenz und Kategorie im Import ergänzen.
5. Neue World-Scene testen und Inhalte/Medien mit dem Altbestand vergleichen. Die ursprünglichen Vollszenen sind, soweit vorhanden, die bessere Referenz.
6. Erst nach erfolgreicher Prüfung entscheiden, ob das alte Modul deaktiviert wird. Keine automatischen Umbenennungen, Originaldatei-Löschungen oder Migration fremder Cloudzugangsdaten.

Alte Kategorie- und Profileinstellungen werden derzeit nicht automatisch übernommen. Eigenes ZIP-Kategorieformat des neuen Moduls ist unabhängig. Ein künftiger geführter Altbestandsimport muss pro Eintrag berichten, was erhalten war, fehlte und neu zugeordnet wurde.

Die Alt-ZIPs werden nicht als installierbare neue Version veröffentlicht. Der neue Installer enthält weder alte Cloudskripte noch Alt-Speicherdaten.
