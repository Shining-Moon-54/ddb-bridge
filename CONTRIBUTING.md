# Mitwirken

Vor Änderungen [Projektübergabe](docs/PROJEKTUEBERGABE.md), [API-Befunde](docs/API_V14.md) und [Sicherheitsmodell](SECURITY.md) lesen. Benutzerentscheidungen und die Kennzeichnung der KI-Entwicklung erhalten.

1. Kleine, unabhängig prüfbare Änderung auf einem eigenen Branch umsetzen.
2. Native Szenendaten nicht durch ein eigenes abgespecktes Format ersetzen.
3. Fehlende Funktionen im Funktionsstand offen benennen. Keine wirkungslosen Cloud-/Quota-Einstellungen oder funktionslosen Buttons als Umsetzung zählen.
4. Tests für echte Risiken ergänzen: Datenverlust, falsche Pfade, Rechte, Integrität, Konflikte, Formatkonvertierung. Für einfache Text-/CSS-Korrekturen keine spiegelbildlichen Tests hinzufügen.
5. `npm run check`, `npm test` und `npm run build` ausführen; bei Foundry-Änderungen den relevanten echten v14-Abnahmeschritt protokollieren.
6. Keine privaten Szenen oder Drittanbieter-Kaufkarten als Fixtures committen. Selbst erzeugte Testdaten verwenden. Keine Geheimnisse in Issues, Ausgaben oder ZIPs.

Die Lizenzentscheidung ist noch offen. Vor Übernahme fremden Codes dessen Nutzungsrechte und Attribution klären. fflate bleibt separat MIT-lizenziert.
