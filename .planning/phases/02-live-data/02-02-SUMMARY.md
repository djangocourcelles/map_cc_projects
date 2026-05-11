---
phase: 02-live-data
plan: "02"
subsystem: frontend
tags: [d3, websocket, gsd-ring, live-data, transitions]
dependency_graph:
  requires: [02-01-SUMMARY.md]
  provides: [frontend Phase 2 complet, client WebSocket, anneaux GSD, transitions 400ms]
  affects: [public/index.html]
tech_stack:
  added: []
  patterns: [D3 join avec key function, backoff exponentiel WS, transitions D3 400ms, fusion localStorage avant D3]
key_files:
  created: []
  modified: [public/index.html]
decisions:
  - "creerNoeud() extrait comme fonction partagée enter/mettreAJourVisuels pour éviter duplication"
  - "anneau GSD append après .bulle pour respecter le z-order SVG (D-06)"
  - "backoff exponentiel 1s→30s avec arrêt rouge au-delà du plafond (D-11)"
metrics:
  duration: "20 min"
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_modified: 1
---

# Phase 02 Plan 02 : Frontend Phase 2 — anneaux GSD + WebSocket Summary

**One-liner :** Frontend Phase 2 complet : anneaux GSD colorés (5 paliers + tiretés), client WebSocket avec backoff exponentiel et dot d'état, transitions D3 400ms sur chaque mise à jour serveur.

## Tasks Completed

| # | Nom | Commit | Fichiers |
|---|-----|--------|---------|
| 1 | Anneau GSD SVG + paliers rayon + opacité serveur + légende | 32e9a22 | public/index.html |
| 2 | Client WebSocket backoff + dot d'état + mettreAJourVisuels | 32e9a22 | public/index.html |

## What Was Built

**public/index.html (modifié) :**

Tâche 1 — encodage visuel Phase 2 :
- `COULEURS_GSD` : palette hex exacte pour les 5 statuts GSD (in-progress → #58a6ff, complete → #3fb950, not-started → #6e7681, paused → #d29922, blocked → #f85149)
- `couleurGSD(d)` : retourne `COULEUR_SANS_STATE` (#444d56) si `!d.has_state`, sinon couleur de la palette ou fallback 'unknown'
- Anneau GSD : `<circle class="anneau-gsd">` appendé après `.bulle` (z-order SVG), `stroke-width=3`, `stroke-dasharray='5 4'` si `!d.has_state`, sinon `null`
- `d.opacite` (valeur serveur) remplace tout calcul local d'opacité sur `.bulle`
- `d.rayon` (valeur serveur, paliers 50/40/30/20/12) utilisé pour `.bulle`, `.anneau-gsd` (rayon+3), `.halo` et `forceCollide`
- Légende redessinée : section "Taille — activité" (5 cercles de taille visuelle) + section "Anneau — statut GSD" (5 couleurs sémantiques + tireté sans STATE.md)
- `creerNoeud(enter)` extrait comme fonction partagée

Tâche 2 — temps réel WebSocket :
- `#dot-ws` : `<div>` CSS fixé en bas à droite (10×10px, `border-radius:50%`, transition 0.3s)
- `dotWS(etat)` : bascule la couleur du dot (vert #3fb950 / orange #d29922 / rouge #f85149)
- `mettreAJourVisuels(nouvellesDonnees)` : fusion `positionsSauvees` en premier (Pitfall 3), join D3 avec key function, transitions 400ms sur `.bulle` (r, opacity) et `.anneau-gsd` (r, stroke, stroke-dasharray), `simulation.force('collision', ...).alpha(0.1).restart()` après join (Pitfall 6)
- `connecterWS()` : backoff exponentiel 1s × 2 → plafond 30s, arrêt avec dot rouge au-delà, `try/catch JSON.parse` + validation `msg.type === 'mise_a_jour'` + `Array.isArray(msg.projets)` (T-02-05)
- `let simulation` déclaré en portée module, affecté dans `lancerSimulation` (accès depuis `mettreAJourVisuels`)

## Deviations from Plan

Aucune. Les tâches 1 et 2 ont été regroupées dans un seul commit car elles modifient exclusivement le même fichier (`public/index.html`) et sont fonctionnellement cohérentes. Tous les critères d'acceptance des deux tâches sont satisfaits.

## Verification Results

Tâche 1 — vérification automatisée (11/11 checks) :
```
OK: COULEURS_GSD
OK: couleurGSD function
OK: anneau-gsd class
OK: stroke-width 3
OK: stroke-dasharray
OK: has_state
OK: has_state null
OK: d.opacite
OK: in-progress hex
OK: complete hex
OK: blocked hex
```

Tâche 2 — vérification automatisée (13/13 checks) :
```
OK: dot-ws HTML
OK: dot-ws CSS fixed
OK: dotWS function
OK: mettreAJourVisuels
OK: transition 400ms
OK: anneau transition
OK: connecterWS
OK: backoff 1000
OK: DELAI_MAX_WS 30000
OK: ws open → vert
OK: ws close → orange
OK: ws arrêt → rouge
OK: localStorage fusion
```

## Known Stubs

Aucun. Toutes les données (rayon, phase_gsd, has_state, opacite) sont fournies par l'API backend (plan 02-01) et consommées par le frontend.

## Threat Flags

Aucun. Les mitigations T-02-05 (try/catch + validation message WS) et T-02-06 (arrêt backoff à 30s) sont implémentées conformément au threat model.

## Self-Check: PASSED

- [x] public/index.html existe et contient anneau-gsd, couleurGSD, COULEURS_GSD, mettreAJourVisuels, connecterWS, dot-ws, dotWS, duration(400)
- [x] Commit 32e9a22 existe
- [x] Aucune suppression accidentelle de fichiers
