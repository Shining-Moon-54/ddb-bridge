# ADR 0003 — Unveränderliche Katalogsnapshots

Status: angenommen für die Alpha; Kompaktierung und Recovery-UI offen.

Ein einzelnes per Upload ersetztes `catalog.json` bietet ohne Server-CAS keine sichere Konfliktkontrolle zwischen Geräten. Ein lokales Lock allein reicht dafür nicht aus.

Jede Katalogänderung schreibt deshalb einen neuen vollständigen Snapshot mit Vorgänger-ID. Das Dateiverzeichnis bildet die Kette. Konkurrierende Nachfolger sind mehrere Köpfe, werden erkannt und nicht still überschrieben. Die Galerie liest nur den einzigen aktuellen Metadatensnapshot und lädt keine vollständigen Szenen zum Start.

Nachteil: zusätzlicher Platzbedarf über die Zeit, O(Anzahl Snapshots) beim Dateilisting und derzeit manuelle Konfliktauflösung. Keine Behauptung einer echten atomaren serverseitigen Datenbanktransaktion. Explizite Kompaktierung und ein geprüfter Merge-Dialog folgen, bevor großer Mehrbenutzerbetrieb empfohlen wird.
