# Google Drive und Dropbox einrichten

Stand **0.4.0-alpha.7**: Manuelle Kartenexporte für Google Drive und Dropbox sind implementiert. Profile, Anmeldung, Kontoabgleich, Uploads, Größen-/Prüfsummenprüfung und Fehlerfälle sind mit HTTP-/Browser-API-Doubles getestet. **Ein echter Kontoupload und die Foundry-/Popup-/CORS-Abnahme stehen noch aus.** Dies ist ein erster Exportbaustein, nicht die vollständige Cloud-Etappe aus der Projektübergabe.

## Funktionsumfang

- An der einzelnen Karte **In Cloud exportieren**; für eine Auswahl **Auswahl in Cloud exportieren**.
- Vollständiges portables ZIP mit den gewählten aktuellen Szenenrevisionen, Medien, Metadaten, Kategorien und SHA-256-Prüfsummen.
- Mehrere Profile, auch für mehrere Konten desselben Anbieters. Ein verbundenes Profil ist an die tatsächliche Konto-ID gebunden; ein anderes Konto wird nicht still übernommen.
- Manuelle Speichernutzungsprüfung und Exportlimit pro Profil in GB; `0` bedeutet kein Modullimit. Das Anbieterkontingent gilt zusätzlich.
- Neue eindeutige Dateinamen ohne Leerzeichen. Keine vorhandenen Cloud-Dateien werden überschrieben oder automatisch gelöscht.

Das Archiv bleibt vollständig lokal. Cloud-only-Originale, bedarfsgesteuerter Download, Cachebereinigung, Kategoriezuordnung/Fallback, bidirektionaler Sync und integrierte Cloud-Wiederherstellung sind noch offen. Cloud-ZIP mit der Anbieteroberfläche herunterladen und über **Dateien / ZIP importieren** wieder aufnehmen. Cloudexport sichert aktuelle Revisionen; für die vollständige Historie den persistenten Modulordner separat sichern.

## Einmalige Voraussetzung: eigene Appkennung

Diese Alpha enthält keine registrierte gemeinsame Anbieter-App. Für Google Drive wird eine eigene OAuth-Client-ID und für Dropbox ein eigener App-Key benötigt. Beides sind öffentliche Kennungen, **keine Client-Secrets oder Kontopasswörter**. Nach dieser Einrichtung genügen die Verbindungsbuttons. Kein zusätzlicher Serverprozess erforderlich.

Cloudanmeldung über die **HTTPS-Adresse deines Foundry-Servers** öffnen; `localhost` ist für lokale Entwicklung möglich. Eine unverschlüsselte LAN-IP erfüllt Googles Herkunftsregeln üblicherweise nicht. Die Google-Herkunft muss genau zur verwendeten Adresse einschließlich Port passen. Popups und Anbieteranmeldung im Browser erlauben.

Profile bleiben im lokalen Speicher dieses Browsers unter derselben Foundry-Herkunft erhalten. Sie werden nicht zwischen Geräten/Browsern synchronisiert und nicht in Foundry-Dateien, Katalog oder ZIP abgelegt. Andere Foundry-Adressen haben getrennten Browserspeicher. Zugangstokens bleiben ausschließlich im Arbeitsspeicher; nach Neuladen, Sitzungsende oder Ablauf erneut verbinden.

## Google Drive

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein eigenes Projekt wählen/anlegen und die **Google Drive API** aktivieren.
2. In der Google Auth Platform bzw. OAuth-Konfiguration die App und Zielgruppe einrichten. Falls die App im externen Testmodus läuft, das eigene Konto als Testnutzer zulassen.
3. Einen **OAuth-Client vom Typ Webanwendung** erstellen. Unter **Autorisierte JavaScript-Quellen** die Herkunft der Foundry-Adresse eintragen, z. B. `https://foundry.example.org` oder `https://foundry.example.org:8443`. **Kein `/game` und keinen anderen Pfad** anhängen. Der Popup-Tokenflow benötigt keine Modul-Callback-URL.
4. Als benötigten Drive-Zugriff nur `https://www.googleapis.com/auth/drive.file` verwenden. Das Modul fragt genau diesen Scope an; kein allgemeiner Vollzugriff auf das Drive-Konto.
5. In Foundry **Map Library → Cloud-Konten → Cloud hinzufügen → Google Drive** öffnen. Profilname, **Client-ID mit Endung `.apps.googleusercontent.com`** und optionales Exportlimit eintragen. Kein Client-Secret verwenden.
6. **Verbinden → Google-Anmeldung starten** wählen, Konto auswählen und Dateizugriff erlauben. Ein weiteres Konto bekommt ein eigenes Profil mit derselben oder einer anderen eigenen Client-ID.
7. Karte(n) exportieren. Der erste Export legt im eigenen Drive den Ordner **Map Library – Profilname** an. Spätere Exporte nutzen dessen Anbieter-Markierung. Der Ordner wird über Metadaten identifiziert, nicht allein über seinen frei änderbaren Namen.

Die begrenzte `drive.file`-Freigabe sieht die von dieser App angelegten/freigegebenen Dateien. Ein beliebiger bestehender Ordner kann in dieser Alpha nicht per Ordner-ID gewählt werden. Geteilte Laufwerke sind nicht gesondert unterstützt. Vorhandene Freigaben eines später manuell geteilten Zielordners gelten auch für neue Dateien; das Modul ändert keine Freigaben.

Google Identity Services wird erst bei angefordertem Verbinden von Googles offizieller Adresse geladen. Uploads verwenden resumable Sitzungen und 4-MiB-Blöcke; jede bestätigte Zwischenposition, finale Dateigröße und SHA-256 werden geprüft. Automatisches Fortsetzen nach Netzabbruch ist noch nicht implementiert.

## Dropbox

1. In der [Dropbox App Console](https://www.dropbox.com/developers/apps) eine eigene App mit **Scoped access** und **App folder** erstellen. Dadurch ist der Dateizugriff auf den Appordner begrenzt. Keine Full-Dropbox-App für diese Einrichtung verwenden.
2. **`account_info.read`**, **`files.metadata.read`** und **`files.content.write`** aktivieren und speichern. Weitere Dateilese-/Löschberechtigungen sind für diesen Export nicht erforderlich.
3. Den öffentlichen **App key** kopieren. Das **App secret** wird nicht benötigt. Für diesen Codeflow ohne Redirect muss keine Foundry-Callback-URL registriert werden.
4. In Foundry **Map Library → Cloud-Konten → Cloud hinzufügen → Dropbox** öffnen. Profilname, App-Key und optionales Exportlimit eintragen.
5. **Verbinden → Dropbox-Anmeldung öffnen** wählen. Bei Dropbox anmelden, die eigene App bestätigen und den angezeigten **einmaligen Autorisierungscode** in den Foundry-Dialog übernehmen. **Dropbox-Verbindung abschließen** wählen. Der Code ist nur für diesen vorbereiteten Dialog verwendbar; nach Schließen einen neuen Dialog öffnen.
6. Karte(n) exportieren. Im Dropbox-Appordner entsteht ein Unterordner `Map_Library_<Profilkennung>`. Ein weiteres Konto bekommt ein zusätzliches Profil. Kontoidentität wird bei Verbindung und vor Export geprüft.

PKCE/S256 und kurzlebige Zugriffstokens ohne Client-Secret und Refresh-Token. Uploads liegen unter dem Modulpaketlimit von 128 MiB und damit unter Dropboxs Einzelrequestlimit. `mode=add`, `autorename=false` und `strict_conflict=true` verhindern unbemerkte Ersetzung; der Inhaltsabgleich erfolgt mit Dropboxs eigenem 4-MiB-Content-Hash.

## Export und Speicherlimit

1. Karte(n) wählen und Cloudexport öffnen.
2. Zielprofil auswählen. Falls nötig **Zielprofil verbinden** ausführen.
3. **Jetzt in Cloud exportieren** wählen. Vor Upload werden Auswahl, lokale Integrität, Konto und aktuelle Cloudnutzung geprüft. Fehler stoppen den Vorgang.
4. Erst nach bestätigter Dateigröße und Prüfsumme meldet das Modul Erfolg. Dateiname und SHA-256 erscheinen im Dialog.

Das Profil-Limit zählt bei Google die für dieses Profil markierten, nicht gelöschten Exportdateien; bei Dropbox alle erreichbaren Dateien im Profil-Unterordner einschließlich Unterordnern. Das ist **kein Gesamtlimit für alle Dateien des Cloudkontos**. Zwei Profile desselben Kontos haben getrennte Exportbereiche. Das Anbieterkontingent kann Uploads zusätzlich ablehnen. `GB` bedeutet 1.000.000.000 Bytes.

Paginierte Dateilisten werden vollständig gelesen; unzuverlässige Größen oder wiederholte Seiten führen zum Stopp. Ein Nutzungsscan ist kein Sync und importiert keine externen Karten. Profiländerungen verschieben keine Bestandsdateien. Fallback erfolgt manuell durch Wahl eines anderen Profils.

Exporte desselben Profils werden innerhalb eines Clients gesperrt und, soweit verfügbar, mit Web Locks über Tabs derselben Herkunft serialisiert. **Über verschiedene Geräte gibt es keine atomare Quotenreservierung.** Limits sind keine harte serverseitige Kontosperre. Remoteänderungen anderer Geräte können während des Uploads stattfinden.

## Abbruch, Fehler und Sicherheit

- Schließen/Abbrechen signalisiert Vorgängen und Netzwerkanfragen den Abbruch. Ein bereits vom Anbieter abgeschlossener Upload kann trotzdem vorhanden sein. Vor erneutem Export das Ziel prüfen; keine automatische Wiederholung oder Remote-Löschung.
- Bei Tokenablauf erneut verbinden. Für ein anderes Konto ein neues Profil anlegen. Anbieter und Kontobindung bestehender Profile bleiben fest.
- Profil entfernen löscht nur Browserkonfiguration und Sitzung, keine Anbieterdateien. Ein später neues Profil hat eine neue Kennung und übernimmt alte Exportbereiche nicht automatisch.
- Keine Tokens/Passwörter in Katalog, ZIP, Logs oder Repository. Anbieterfehlertexte werden nicht ungeprüft angezeigt. Cloud-Dateianfragen gehen an feste Anbieter-Origins, ohne Foundry-Cookies und ohne Weiterleitung von Bearer-Tokens an fremde Hosts.
- Andere Module derselben Foundry-Seite teilen die Browser-Vertrauenszone. Sitzungsspeicherung ist kein Tresor gegen bösartige Module oder Browsererweiterungen.
- Lokales Löschen setzt den Papierkorbstatus und löst **keine** Cloud-Löschung aus.

## Primärquellen und offene Abnahme

API-Abgleich am 24.10.2026:

- [Google: Tokenmodell](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Client-ID/Herkunft](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid), [JavaScript-Referenz](https://developers.google.com/identity/oauth2/web/reference/js-reference)
- [Google: Drive-Scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Metadaten/SHA-256](https://developers.google.com/workspace/drive/api/reference/rest/v3/files), [Ordner](https://developers.google.com/workspace/drive/api/guides/folder)
- [Dropbox: OAuth/PKCE](https://docs.dropboxapi.com/dropbox-api/docs/oauth), [offizielle API-Spezifikation](https://github.com/dropbox/dropbox-api-spec/blob/main/files.stone), [Content-Hash](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash)
- [Foundry v14: FilePicker](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.FilePicker.html)

Automatisierte Nachweise: `tests/cloud.test.mjs`, `tests/cloud-delete-ui.test.mjs`. Echte Abnahme: [TESTING.md, CLD-01 bis CLD-06](TESTING.md). Offen sind echte private Appregistrierungen, zwei Konten je Anbieter, Browser-CORS/Popups, reale Kontingentfehler/Tokenablauf und Download/Wiederherstellung vom echten Anbieter. Weitere Anbieter, Cache, Remote-Originale, Kategorieprofile und manuelle Synchronisierung folgen in späteren Meilensteinen.
