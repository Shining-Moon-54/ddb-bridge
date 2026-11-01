# ADR 0002 — Keine erfundene Server-Fetch- oder Cloudschnittstelle

Status: angenommen als Sicherheitsgrenze.

Ein reines Foundry-Modul besitzt nicht automatisch Zugriff auf Node-Dateisystem, DNS-Auflösung, SSH oder einen beliebig registrierbaren Serverendpunkt. Die geprüften v14-Client-APIs belegen lokale Datei-Uploads und native Dokumentoperationen, aber keinen beliebigen sicheren serverseitigen URL-Proxy.

Deshalb werden externe URLs nicht automatisch angefordert und keine Cloudpasswörter im statischen Katalog gespeichert. Der direkte HTTPS-Import und Cloudadapter bleiben sichtbar offen. Ein Browserfetch mit anschließendem Upload wird nicht als der geforderte serverseitige Direktimport ausgegeben. Externe Shellskripte sind keine Installationsvoraussetzung.

Künftige Implementierungen müssen Provider-/Foundry-Primärquellen, tatsächliche Laufzeitunterstützung, Rechte und DNS-/Redirect-SSRF-Schutz nachweisen. Wenn Anforderungen in einem reinen Modul technisch nicht zugleich erfüllbar sind, konkrete Alternativen erläutern und den Zielkonflikt vom Projektinitiator entscheiden lassen.
