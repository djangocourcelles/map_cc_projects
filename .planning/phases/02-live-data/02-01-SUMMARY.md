---
phase: 02-live-data
plan: "01"
subsystem: backend
tags: [scanner, websocket, watcher, live-data]
dependency_graph:
  requires: [01-01-SUMMARY.md, 01-02-SUMMARY.md]
  provides: [données enrichies Phase 2, pipeline WebSocket bout en bout]
  affects: [scanner.js, watcher.js, server.js]
tech_stack:
  added: [ws v8 WebSocketServer, chokidar v5]
  patterns: [debounce 500ms, broadcast WS, paliers taille bulle, scan depth 2]
key_files:
  created: [watcher.js]
  modified: [scanner.js, server.js]
decisions:
  - "5 paliers discrets pour le rayon (50/40/30/20/12) au lieu de formule linéaire — D-02"
  - "opacité binaire : 1.0 avec git, 0.4 sans git — D-01"
  - "WebSocket sur le même port HTTP via WebSocketServer({ server }) — INT-04"
  - "chokidar ciblé sur STATE.md et COMMIT_EDITMSG uniquement — D-07"
metrics:
  duration: "25 min"
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_modified: 3
---

# Phase 02 Plan 01 : Backend live-data — scanner enrichi + WebSocket Summary

**One-liner :** Pipeline backend complet Phase 2 : paliers D-02 pour le rayon, statut GSD depuis STATE.md, scan depth 2, et WebSocket avec chokidar ciblé sur STATE.md + COMMIT_EDITMSG.

## Tasks Completed

| # | Nom | Commit | Fichiers |
|---|-----|--------|---------|
| 1 | Étendre scanner.js — paliers D-02, statut GSD, sous-projets depth 2 | f4220dc | scanner.js |
| 2 | Créer watcher.js et brancher le WebSocket dans server.js | 5bf517a | watcher.js (créé), server.js |

## What Was Built

**scanner.js (modifié) :**
- `calculerRayon()` remplacée : 5 paliers discrets (0j → 50, <7j → 40, <30j → 30, <90j → 20, ≥90j → 12, null → 12)
- `calculerOpacite()` simplifiée : 1.0 pour tous les projets avec git, 0.4 sans git
- `lireStatutGSD()` ajoutée : lit le champ `status:` du STATE.md via regex, retourne string|null
- `construireRecord()` extrait pour factoriser la logique de construction d'un ProjectRecord
- `scannerWorkspace()` étendue : itère les sous-dossiers (depth 2), inclut ceux ayant au moins une sentinelle, labelisés `parent/sous-projet`
- Champs `phase_gsd` (string|null) et `has_state` (boolean) ajoutés à chaque ProjectRecord
- `module.exports` étendu : `lireStatutGSD` exportée en plus de `scannerWorkspace`
- 35 projets détectés (contre 25 en Phase 1 — sous-projets avec sentinelle inclus)

**watcher.js (créé) :**
- Surveillance chokidar ciblée sur `**/.planning/STATE.md` et `**/.git/COMMIT_EDITMSG`
- Regex `ignored` avec lookahead négatif `/\.git[/\\](?!COMMIT_EDITMSG)/` pour garder COMMIT_EDITMSG accessible
- Debounce 500ms via `setTimeout(rescanEtBroadcast, 500)`
- Rescan total `scannerWorkspace()` à chaque déclenchement (D-08)
- Broadcast JSON `{ type: 'mise_a_jour', projets }` sur tous les clients `readyState === WebSocket.OPEN`
- Export : `{ demarrerWatcher }`

**server.js (modifié) :**
- Import `WebSocketServer` depuis `ws` et `demarrerWatcher` depuis `./watcher`
- `WebSocketServer({ server })` attaché au même port HTTP (INT-04, partage de port)
- Gestion d'erreur client WS : `ws.on('error', ...)`
- `demarrerWatcher(wss)` appelé dans le callback de `server.listen()`
- Log `[watcher] Surveillance active — STATE.md + COMMIT_EDITMSG` au démarrage

## Deviations from Plan

Aucune. Le plan a été exécuté exactement tel qu'écrit.

## Verification Results

Tâche 1 — vérification automatisée :
```
OK — paliers, phase_gsd, has_state, opacite valides
Projets totaux: 35 (dont sous-projets si sentinelle trouvée)
```

Tâche 2 — vérification structurelle (11/11 checks) :
```
OK: demarrerWatcher, debounce 500, STATE.md pattern, COMMIT_EDITMSG, ignored regex,
    readyState OPEN, module.exports, server imports ws, server imports watcher,
    server crée wss, server démarre watcher
```

## Known Stubs

Aucun. Les données enrichies (rayon, phase_gsd, has_state, opacite) sont calculées et retournées par l'API. Le frontend Phase 1 continue de tourner sans modification — il n'exploite pas encore phase_gsd/has_state (prévu plan 02-02).

## Threat Flags

| Flag | Fichier | Description |
|------|---------|-------------|
| threat_flag: DoS (mitigé) | scanner.js | Scan depth 2 : DOSSIERS_EXCLUS appliqué en depth 2 (D-16), try/catch sur readdirSync sous-dossiers |

T-02-03 (DoS scan depth 2) : mitigé par DOSSIERS_EXCLUS en depth 2 et bloc try/catch isolant les erreurs de lecture.

## Self-Check: PASSED

- [x] scanner.js existe et contient les 5 paliers, lireStatutGSD, phase_gsd, has_state
- [x] watcher.js existe avec demarrerWatcher, debounce 500ms, patterns ciblés
- [x] server.js contient WebSocketServer, demarrerWatcher(wss)
- [x] Commit f4220dc existe (tâche 1)
- [x] Commit 5bf517a existe (tâche 2)
