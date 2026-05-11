# Phase 2: Live Data - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 fait passer la carte d'une photo statique à un tableau de bord vivant : la taille de chaque bulle encode l'activité récente (5 paliers basés sur les jours depuis le dernier commit), un anneau coloré indique la phase GSD lue depuis `.planning/STATE.md`, et le WebSocket pousse automatiquement les mises à jour dans les 3 secondes quand un fichier surveille change. Pas d'interactions avancées (tooltip, clic VS Code, filtrage = Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Taille des bulles — encodage activité (VIS-04)

- **D-01 :** L'opacité est supprimée comme encodage d'activité (remplacée par la taille). Exception : projets sans git restent à opacity 0.4.
- **D-02 :** Courbe **linéaire à paliers** — 5 paliers basés sur les jours depuis le dernier commit :
  - aujourd'hui (0j) → radius **50 px**
  - < 7j → radius **40 px**
  - < 30j → radius **30 px**
  - < 90j → radius **20 px**
  - ≥ 90j → radius **12 px**
- **D-03 :** Projets sans git (pas de dépôt détecté) : radius **12 px** + opacity **0.4**. Distingue visuellement de "projet GSD non actif mais avec git".

### Palette GSD / anneaux (VIS-05)

- **D-04 :** Palette **couleurs sémantiques vives** pour les statuts GSD :
  - `in-progress` → bleu
  - `complete` → vert
  - `not-started` → gris
  - `paused` → orange
  - `blocked` → rouge
  - (Claude choisit les hex exacts au moment de l'implémentation pour lisibilité)
- **D-05 :** Projets sans `.planning/STATE.md` : anneau **gris neutre tireté** (distingue de `not-started` qui possède un STATE.md).
- **D-06 :** Largeur de l'anneau : **3 px fixe**, quelle que soit la taille de la bulle.

### Déclencheurs de rescan (INT-04)

- **D-07 :** chokidar surveille de façon **ciblée** : `**/.planning/STATE.md` + `**/.git/COMMIT_EDITMSG` uniquement. Évite les EMFILE et le bruit sur node_modules/venv.
- **D-08 :** Chaque changement détecté déclenche un **rescan total du workspace** (scannerWorkspace() complet). Acceptable pour ~25 projets, plus simple qu'un diff partiel.
- **D-09 :** Debounce chokidar : **500ms** (au lieu des 300ms de CLAUDE.md — plus conservateur contre les auto-save agressifs).

### Transitions D3 + robustesse WebSocket

- **D-10 :** Quand de nouvelles données arrivent via WS, taille et couleur d'anneau s'animent via une **transition D3 de ~400ms**. Attire l'attention sur ce qui a changé.
- **D-11 :** Reconnexion WS avec **backoff exponentiel** : retry après 1s, 2s, 4s… plafonné à 30s, puis arrêt.
- **D-12 :** Indicateur d'état WS : **petit dot coloré en bas à droite** de l'interface (vert = connecté, orange = reconnexion en cours, rouge = déconnecté).

### Détection des sous-projets imbriqués (scanner)

- **D-13 :** Le scanner descend **1 niveau supplémentaire** (depth 2 total) dans chaque projet racine pour détecter des sous-projets.
- **D-14 :** Un sous-dossier est un sous-projet s'il contient un **fichier sentinelle** (même liste que les projets racine : `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, etc.). CLAUDE.md seul ne suffit pas.
- **D-15 :** Les sous-projets apparaissent comme des **bulles normales** avec un label préfixé : `parent/sous-projet` (p. ex. `Projet_BotAVV/app`). Même taille/couleur selon leur activité git.
- **D-16 :** `DOSSIERS_EXCLUS` s'applique aussi en depth 2 : `node_modules`, `venv`, `.git`, `dist`, `__pycache__` ne sont jamais scannés.

### Claude's Discretion

- Codes hex exacts des couleurs sémantiques (D-04) — à calibrer pour lisibilité sur fond sombre/clair.
- Format du message WebSocket (JSON schema) — structure interne du broadcast.
- Gestion d'erreurs chokidar (ENOENT si un projet est supprimé pendant le watch).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning et requirements

- `.planning/ROADMAP.md` — Goal Phase 2, requirements VIS-04, VIS-05, INT-04, success criteria (≤ 3s de mise à jour)
- `.planning/REQUIREMENTS.md` — Détail des requirements v1 et traceabilité phase
- `.planning/phases/01-core-graph/01-CONTEXT.md` — Décisions Phase 1 (patterns D3, scanner, localStorage, opacité supprimée en Phase 2)

### Code existant à étendre

- `server.js` — Commentaire ligne 6 `// WebSocket : Phase 2 (watcher.js)` — point d'extension pour intégrer `ws` et `watcher.js`
- `scanner.js` — `scannerWorkspace()` retourne `ProjectRecord[]` avec `joursDepuisCommit` et `branche` — base du calcul de taille
- `public/index.html` — Frontend D3 complet inline — à modifier pour ajouter l'anneau SVG, la transition et le dot WS

### Contraintes techniques critiques (CLAUDE.md)

- `CLAUDE.md` §Pitfalls critiques — EMFILE prévention chokidar (ignorer node_modules, .git, dist, depth:2) — adapté en D-07 (watch ciblé)
- `CLAUDE.md` §Pitfalls — positions localStorage fusionnées AVANT lancerSimulation() — invariant à conserver en Phase 2
- `CLAUDE.md` §Pitfalls — reconnect backoff WebSocket côté client — implémenté en D-11

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `scannerWorkspace()` dans `scanner.js` — expose déjà `joursDepuisCommit` (calculé par `calculerJours()`) et les stacks. Base directe pour les paliers de taille (D-02).
- `gitExec()` dans `scanner.js` — wrapper sécurisé pour les commandes git, retourne null si pas de repo (gère D-03).
- Simulation D3 dans `public/index.html` — `lancerSimulation()` et gestion du drag déjà en place. Phase 2 ajoute les transitions sans refactorer.

### Established Patterns

- `ws` v8 et `chokidar` v5 déjà dans les dépendances prévues (CLAUDE.md, STATE.md tech notes).
- Structure fichiers cible : `watcher.js` = chokidar + debounce + broadcast WS (à créer en Phase 2).
- `server.js` reste le point d'entrée unique — `watcher.js` est importé par `server.js`, pas un processus séparé.
- Opacité gérée actuellement via `opacity` CSS / D3 attr — à remplacer par calcul de radius (D-01, D-03).

### Integration Points

- `server.js` ligne 6 : remplacer le commentaire par `const { demarrerWatcher } = require('./watcher')` et appeler `demarrerWatcher(wss)` après `server.listen()`.
- `public/index.html` : ajouter `<circle>` d'anneau dans le groupe SVG de chaque nœud, connecter WebSocket côté client, animer via `d3.transition()`.

</code_context>

<specifics>
## Specific Ideas

- L'anneau tireté pour les projets sans STATE.md peut être rendu via `stroke-dasharray` SVG — pattern natif, zero JS supplémentaire.
- Le dot WS en bas à droite : un simple `<div>` CSS positionné en `position: fixed; bottom: 12px; right: 12px` avec `border-radius: 50%` et transition de couleur CSS.
- La transition D3 de 400ms s'applique avec `.transition().duration(400)` sur les sélections existantes (radius et stroke).

</specifics>

<deferred>
## Deferred Ideas

- Rescan partiel (seulement le projet affecté) — mentionné mais écarté au profit du rescan total (plus simple, D-08). À reconsidérer en Phase 3 si performance insuffisante.
- Animations plus riches (pulse sur changement, badge de notification) — Phase 3.
- Filtrage par statut GSD ou stack — Phase 3 (Interactions).

</deferred>

---

*Phase: 2-live-data*
*Context gathered: 2026-05-11*
