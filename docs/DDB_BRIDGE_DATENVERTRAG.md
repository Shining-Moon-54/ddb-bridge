# DDB Bridge — Buchimport-Datenvertrag (Entwurf v0.1)

Dieses Dokument beschreibt unser **eigenes internes Zwischenformat**. Es ist **kein offizielles D&D-Beyond-API-Schema**.

## Buchquelle
```json
{
  "provider": "dndbeyond",
  "bookId": "book-123",
  "title": "Example Licensed Sourcebook",
  "edition": "2024",
  "access": "confirmed",
  "entries": [
    {
      "sourceId": "creature-7",
      "kind": "monster",
      "edition": "2024",
      "variant": "default",
      "dependencies": [],
      "payload": { "example": "Non-copyrighted dummy fixture only" }
    }
  ]
}
```

- `access: confirmed` muss von einem **autorisierten Quellenadapter** kommen, niemals nur aus einer Checkbox. Der reine Importplaner kann die Berechtigung selbst nicht beweisen.
- Für echte Umwandlung sind geprüfte Parser, dnd5e-Dokument-Builder und Referenzauflösung nötig.
- `payload` darf nicht in öffentlichen Debugreports, Commit-Dateien oder Fehlerlogs landen.
- Fehlt ein Feld, wird der Inhalt als fehlerhaft/teilweise markiert, nicht stillschweigend ergänzt.
- `sourceKey` verwendet `[provider, bookId, kind, sourceId, edition, variant]`; Namen sind nicht identitätsstiftend.
- Bekannte `kind`-Werte: `class`, `subclass`, `species`, `background`, `feat`, `feature`, `spell`, `item`, `monster`, `npc`, `journal`, `rolltable`, `scene`.
- Zielkategorien sind nur Vorschläge. Erst der Foundry-Adapter und seine Schema-Tests bestätigen eine erfolgreiche Konvertierung.
- Report-Zustände: `planned`, `partial`, `unsupported`, `failed`, `verified`; `verified` wird **erst nach** echter Foundry-Validierung vergeben.

## Vorläufige Bibliotheksordner

```text
DDB Bridge
├── Books (Metadaten, Status, Herkunft)
├── Character Options 2014 / 2024
├── Spells & Items
├── Monsters & NPCs
├── Journals & Tables
└── Maps & Scenes (via Map Library Service)
```

Buchkapitel dürfen direkt in Foundry-Journale verlinken, **wenn** die Inhalte und Linkziele tatsächlich importiert wurden. Premium-Pack-Äquivalenz ist das angestrebte UX-Ziel, keine vorweggenommene Funktionsgarantie.
