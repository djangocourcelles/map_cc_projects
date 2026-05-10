# Map CC Projects — CLAUDE.md

Application web locale : carte interactive spatiale de tous les projets Claude Code du workspace.

## Stack

- **Serveur :** Node.js natif (http + ws), zéro framework
- **Visualisation :** D3.js v7 (force simulation, zoom, drag)
- **File watching :** chokidar v5 (Node ≥ 20 requis)
- **WebSocket :** bibliothèque `ws` v8
- **Frontend :** HTML/CSS/JS vanilla, pas de build step, D3 vendorisé localement
- **Persistence :** localStorage (positions des bulles)

## Lancer le projet

```bash
node server.js
# Ouvre automatiquement le browser sur http://localhost:3000
```

## Structure cible

```
map_project/
├── server.js          # Point d'entrée : HTTP + WebSocket + file watching
├── scanner.js         # Scanne /CLAUDE_PROJETS/, retourne ProjectRecord[]
├── watcher.js         # chokidar + debounce 300ms + broadcast WS
├── public/
│   ├── index.html     # Frontend complet (HTML + CSS + JS inline)
│   └── lib/
│       └── d3.min.js  # D3 vendorisé
└── .planning/         # GSD workflow docs
```

## GSD Workflow

Ce projet suit le workflow GSD (Get Shit Done) :

- **Roadmap :** `.planning/ROADMAP.md` — 3 phases coarse, vertical MVP
- **Requirements :** `.planning/REQUIREMENTS.md` — 16 requirements v1
- **State :** `.planning/STATE.md` — phase courante et statut

### Phases

| # | Nom | Goal |
|---|-----|------|
| 1 | Core Graph | Carte D3.js statique, données git, drag/zoom |
| 2 | Live Data | Encodage visuel activité, phase GSD, WebSocket auto-refresh |
| 3 | Interactions | Tooltip, clic VS Code, filtrage |

### Prochaine commande

```
/gsd-plan-phase 1
```

## Pitfalls critiques (depuis la recherche)

1. **EMFILE macOS** : chokidar doit ignorer `node_modules`, `.git`, `dist` et limiter `depth: 2`
2. **Zoom/drag D3** : zoom sur `<rect>` de fond, nœuds dans `<g class="viewport">`, `stopPropagation()` sur mousedown des nœuds
3. **Positions écrasées** : fusionner localStorage dans les données WS entrantes AVANT de passer à D3
4. **Simulation jamais stable** : `alphaTarget(0).stop()` après layout initial ; `alphaTarget(0.3).restart()` sur drag start
5. **Memory leak D3** : toujours `.data(nodes, d => d.id)` avec key function + `.exit().remove()`

## Conventions

- Tout le code, commentaires et messages de commit en français
- Pas de framework JS côté client
- Pas de build step (pas de Webpack, Vite, etc.)
- Le frontend-design skill s'applique à Phase 3 (UI) : typographie distinctive, animations soignées

## GitHub

Remote cible : `https://github.com/djangocourcelles/map_cc_projects`
