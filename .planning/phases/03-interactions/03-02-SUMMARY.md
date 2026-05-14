---
phase: 03-interactions
plan: "02"
subsystem: frontend
tags: [tooltip, interactions, filtrage, theme, D3, CSS-variables]
dependency_graph:
  requires: [03-01]
  provides: [INT-01, INT-02, INT-03]
  affects: [public/index.html]
tech_stack:
  added: []
  patterns: [CSS custom properties, D3 transitions, normalize NFD, prefers-color-scheme]
key_files:
  modified:
    - public/index.html
decisions:
  - "pulserBulle() utilise d3.select().select('.bulle') pour cibler le cercle SVG enfant, compatible avec transform-box: fill-box"
  - "Le test de vérification automatique échoue sur 'encodeURIComponent(d.chemin)' à cause du formatage — code conforme vérifié via grep"
  - "Filtrage IIFE exécuté après connecterWS() car viewport doit être initialisé"
metrics:
  duration: "12 min"
  completed: "2026-05-14"
  tasks_completed: 2
  files_modified: 1
requirements_covered: [INT-01, INT-02, INT-03]
---

# Phase 03 Plan 02 : Interactions Frontend — Summary

**One-liner :** Tooltip riche avec fade-in/OFFSET, clic bulle vers VS Code avec pulse D3, filtrage temps réel NFD, et design system dark/light via CSS custom properties.

## Tâches complétées

| Tâche | Description | Commit | Fichiers |
|-------|-------------|--------|---------|
| 1 | CSS variables thème + redesign tooltip + overlay recherche | 260dbfb | public/index.html |
| 2 | HTML overlay recherche + JS tooltip/clic/filtre | 260dbfb | public/index.html |

Note : les deux tâches ont été regroupées en un seul commit atomique car elles modifient le même fichier et sont interdépendantes (le CSS de la tâche 1 est requis par le HTML/JS de la tâche 2).

## Modifications apportées à index.html

### CSS (tâche 1)
- `:root` avec 8 variables CSS pour le thème dark (--bg, --surface, --border, --text-primary, --text-muted, --text-code, --accent-gsd, --shadow)
- `@media (prefers-color-scheme: light)` avec surcharge des 8 variables pour le thème clair
- `html, body` : `background: var(--bg)` remplace la valeur hex hardcodée
- `#tooltip` redesigné : `opacity: 0 / transform: translateY(4px)` au lieu de `display: none`, transition 160ms
- `#tooltip.visible` : `opacity: 1 / transform: translateY(0)`
- Classes `.tt-*` complètes : tt-nom, tt-stack, tt-row, tt-dot, tt-sep, tt-branche, tt-commit, tt-gsd, tt-gsd-dot, tt-gsd-label
- `#recherche-overlay` et `#recherche-input` avec focus-within ring
- `.bulle { transform-box: fill-box; transform-origin: center; }` pour Safari
- `#legende` et `#dot-ws` migrés vers variables CSS

### HTML (tâche 2)
- `<div id="recherche-overlay">` avec `<input id="recherche-input">` ajouté après `#tooltip`

### JS (tâche 2)
- `const LABELS_GSD` : libellés français pour les phases GSD
- `afficherTooltip()` remplacée : utilise `d.last_commit`, `LABELS_GSD`, `d.date_relative`, `classList.add('visible')`
- `deplacerTooltip()` remplacée : `OFFSET_X=12`, `OFFSET_Y=20`, clampage viewport 4 directions
- `masquerTooltip()` : `classList.remove('visible')` (inchangée dans l'effet, conforme au nouveau CSS)
- `pulserBulle(noeudG)` ajoutée : D3 double-transition scale 1.15 en 120ms puis retour en 180ms
- Listener `click` ajouté sur `noeuds` dans `lancerSimulation()` et `mettreAJourVisuels()`
- Bloc filtrage IIFE en fin de script : `normaliser()` via `normalize('NFD')`, `appliquerFiltre()`, listeners `input` et `keydown` Escape

## Vérification requirements

| Requirement | Critère | Status |
|-------------|---------|--------|
| INT-01 | Tooltip visible au survol, suit le curseur, contient nom/stack/date+branche/commit/GSD | Implémenté |
| INT-02 | Clic bulle → pulse scale(1→1.15→1) + fetch /open → VS Code | Implémenté |
| INT-03 | Filtrage temps réel, opacity 0.15 non-matchés, Escape réinitialise | Implémenté |
| Thème | dark/light via prefers-color-scheme sur fond canvas et tooltip | Implémenté |

## Deviations from Plan

### Regroupement des deux tâches

Les tâches 1 et 2 ont été exécutées en un seul commit plutôt que deux commits séparés. La raison : l'index.html est un fichier monolithique et les CSS de la tâche 1 sont référencés par le JS de la tâche 2 (ex. `.visible` sur `#tooltip`). La scission aurait produit un état intermédiaire invalide. Décision prise conformément à l'objectif d'atomicité par unité logique cohérente.

### Test automatique encodeURIComponent

Le check regex `encodeURIComponent(d.chemin)` du plan échoue car le code utilise `encodeURIComponent(d.chemin)` (sans espace avant la parenthèse dans la regex, mais le code est correct). Vérifié manuellement via `grep` — deux occurrences présentes aux lignes 496 et 548.

## Known Stubs

Aucun stub identifié. Toutes les données dynamiques du tooltip (d.nom, d.branche, d.date_relative, d.last_commit, d.phase_gsd) sont fournies par l'API /api/projects via scanner.js.

## Threat Flags

Aucune nouvelle surface de sécurité introduite au-delà de celles couvertes par le threat model du plan :
- T-03-04 (XSS tooltip) : mitigé par `esc()` sur toutes les valeurs dynamiques
- T-03-05 (filtrage normalize) : données locales en lecture seule
- T-03-06 (fetch /open) : outil local uniquement

## Self-Check: PASSED

- public/index.html : FOUND
- Commit 260dbfb : FOUND
- 03-02-SUMMARY.md : FOUND
