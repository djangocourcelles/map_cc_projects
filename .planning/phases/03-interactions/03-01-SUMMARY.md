---
phase: "03-interactions"
plan: "01"
subsystem: "backend"
tags: ["scanner", "server", "last_commit", "open-in-vscode", "INT-01", "INT-02"]
dependency_graph:
  requires: []
  provides: ["ProjectRecord.last_commit", "GET /open"]
  affects: ["public/index.html (plan 02 consomme last_commit et /open)"]
tech_stack:
  added: []
  patterns: ["git log --format=%s pour dernier message commit", "route HTTP avec validation chemin workspace"]
key_files:
  created: []
  modified:
    - "scanner.js"
    - "server.js"
decisions:
  - "Constante WORKSPACE_ROOT hardcodée dans server.js (chaîne littérale) — évite une dépendance circulaire avec scanner.js et correspond à D-05/D-07 de l'UI-SPEC"
  - "Troncature last_commit : slice(0,60) + '…' si length > 60 (longueur maximale 61 chars avec ellipse)"
  - "Erreur exec VS Code loguée côté serveur uniquement — le client reçoit 204 même si VS Code est absent (T-03-03 accept)"
metrics:
  duration: "8 min"
  completed_date: "2026-05-14"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 3 Plan 01 : Données backend pour Phase 3 (last_commit + route /open)

**One-liner :** Extension backend avec champ `last_commit` dans ProjectRecord et route `GET /open` avec validation workspace pour ouverture VS Code.

## Champs ajoutés à ProjectRecord

| Champ | Type | Valeur |
|-------|------|--------|
| `last_commit` | `string \| null` | Message du dernier commit git, tronqué à 60 chars + '…' si dépassement ; `null` si projet sans git |

Implémentation dans `scanner.js::construireRecord()` via `gitExec('git log -1 --format=%s', chemin)`.

## Pattern exact de la route /open (pour plan 02)

```
GET /open?path=/Users/laurent/Documents/CLAUDE_PROJETS/MonProjet
```

Réponses :
– `204 No Content` : chemin dans le workspace, `code "chemin"` exécuté
– `400 Chemin invalide` : chemin absent, vide, ou hors de `/Users/laurent/Documents/CLAUDE_PROJETS/`

Appel depuis le frontend :
```js
fetch(`/open?path=${encodeURIComponent(projet.chemin)}`);
```

## Décisions prises durant l'exécution

1. **Constante workspace dans server.js** : chaîne littérale `/Users/laurent/Documents/CLAUDE_PROJETS/` au lieu d'importer `WORKSPACE` de scanner.js — évite la dépendance circulaire et correspond aux décisions D-05/D-07 de l'UI-SPEC.
2. **Longueur last_commit** : `slice(0,60)` + `'…'` conditionnel — résultat max 61 caractères (60 + ellipse Unicode).
3. **204 même si VS Code absent** : l'erreur exec est loguée côté serveur uniquement. Le client n'a pas besoin de gérer l'absence de VS Code (T-03-03 accept dans le threat model).

## Deviations from Plan

None — plan exécuté exactement comme écrit.

## Self-Check: PASSED

- scanner.js modifié : `last_commit` présent dans `construireRecord()` via `git log -1 --format=%s`
- server.js modifié : route `GET /open` ajoutée avec validation workspace
- Commits : `0d462b2` (scanner.js), `8c6a8cd` (server.js)
- Vérification automatique : 12 projets avec git testés, 23 sans git, assertions OK
