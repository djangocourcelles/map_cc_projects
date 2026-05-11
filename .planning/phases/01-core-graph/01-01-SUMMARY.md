---
phase: 01-core-graph
plan: 01
subsystem: infra
tags: [nodejs, d3, scanner, git, http]

requires: []
provides:
  - "package.json avec dépendances d3 7.9.0, ws 8.20.0, chokidar 5.0.0"
  - "scanner.js : scannerWorkspace() → ProjectRecord[] (25 projets détectés)"
  - "server.js : GET /api/projects + fichiers statiques + auto-open browser"
  - "public/lib/d3.min.js vendorisé (273 Ko)"
affects: [01-02, 02-live-data, 03-interactions]

tech-stack:
  added: [d3@7.9.0, ws@8.20.0, chokidar@5.0.0, node:http natif, node:child_process]
  patterns:
    - "CommonJS (require/module.exports) pour compatibilité Node.js sans build step"
    - "Scanner synchrone au démarrage (execSync git par projet)"
    - "Détection multi-stack via Map pour déduplication par nom de stack"
    - "child_process.exec('open http://...') pour ouverture browser macOS sans dépendance"

key-files:
  created:
    - package.json
    - scanner.js
    - server.js
    - public/lib/d3.min.js
    - .gitignore
  modified: []

key-decisions:
  - "Utiliser git log -1 --format=%ct (sans guillemets) pour éviter problèmes shell"
  - "Déduplication multi-stack via Map() plutôt que .filter() pour garantir unicité"
  - "Sécurité path traversal ajoutée dans server.js (Rule 2 : missing critical)"
  - ".gitignore créé pour exclure node_modules du repo"

patterns-established:
  - "Pattern scanner : fs.readdirSync → filter → map → ProjectRecord"
  - "Pattern server : route API first, puis static fallback"

requirements-completed: [INFRA-01, INFRA-02, DATA-01, DATA-02, DATA-03, DATA-04]

duration: 15min
completed: 2026-05-11
---

# Phase 1, Plan 1 : Backend Node.js — Scanner et serveur HTTP

**Serveur Node.js natif exposant GET /api/projects avec scan workspace, extraction git multi-stack et ouverture browser automatique**

## Performance

- **Durée :** 15 min
- **Démarré :** 2026-05-11T15:50:00Z
- **Terminé :** 2026-05-11T16:05:00Z
- **Tâches :** 2
- **Fichiers créés :** 5

## Accomplissements

- scanner.js retourne 25 projets depuis /CLAUDE_PROJETS/ avec extraction git (branche, jours, date relative), détection multi-stack (BotAVV : Node.js + Python), calculs rayon (28-56) et opacité (0.3/0.4/0.6/1.0)
- server.js : route GET /api/projects avec CORS, serveur statique public/, gestion EADDRINUSE, protection path traversal
- D3 v7.9.0 vendorisé dans public/lib/d3.min.js (273 Ko) — prêt pour Plan 02

## Commits par tâche

1. **Tâche 1 : Initialisation npm et scanner.js** - `5af02f5` (feat)
2. **Tâche 2 : Serveur HTTP + API + browser auto** - `83d7eda` (feat)

## Fichiers créés

- `package.json` — dépendances d3, ws, chokidar
- `scanner.js` — scannerWorkspace() : scan + git + stack + rayon/opacité
- `server.js` — HTTP natif, GET /api/projects, statique, auto-open
- `public/lib/d3.min.js` — D3 v7.9.0 vendorisé (273 Ko)
- `.gitignore` — exclut node_modules

## Décisions prises

- `git log -1 --format=%ct` sans guillemets (évite problèmes shell sur macOS)
- Déduplication multi-stack via `Map()` par nom de stack (D-02)
- Protection path traversal dans server.js même si usage local (Rule 2)
- `.gitignore` ajouté automatiquement (Rule 2 : fichiers générés non trackés)

## Déviations par rapport au plan

### Corrections automatiques

**1. [Rule 2 - Sécurité] Protection path traversal dans server.js**
- **Trouvé pendant :** Tâche 2 (écriture server.js)
- **Problème :** Le plan ne mentionnait pas de vérification que le chemin fichier reste dans PUBLIC_DIR
- **Correction :** Ajout du check `filePath.startsWith(PUBLIC_DIR)` avant fs.readFile
- **Fichiers modifiés :** server.js
- **Engagé dans :** 83d7eda

**2. [Rule 2 - Manquant critique] Création .gitignore**
- **Trouvé pendant :** Avant commit tâche 1
- **Problème :** node_modules/ non exclu du repo
- **Correction :** Création .gitignore avec `node_modules/`
- **Fichiers modifiés :** .gitignore
- **Engagé dans :** 5af02f5

---

**Total déviations :** 2 corrections automatiques (2 Rule 2 - manquant critique)
**Impact :** Corrections de sécurité et bonnes pratiques. Aucun écart de périmètre.

## Problèmes rencontrés

Aucun. npm install avait été lancé dans le contexte courant avant la vérification explicite — le répertoire était déjà correct.

## Résultat du test API

```
Projets retournés: 25
BotAVV stacks: 🟢Node.js, 🐍Python
Tous ont rayon: true
Toutes opacites valides: true
```

## Prêt pour la suite

- Plan 02 (01-02) peut immédiatement consommer GET /api/projects
- public/lib/d3.min.js disponible pour le frontend D3
- Extension point WebSocket Phase 2 commenté dans server.js

---
*Phase : 01-core-graph*
*Terminé : 2026-05-11*
