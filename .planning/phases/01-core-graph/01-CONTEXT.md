# Phase 1: Core Graph — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 livre une carte interactive D3.js statique : une seule commande (`node server.js`) ouvre le browser, affiche toutes les bulles de projets du workspace avec leurs données git (nom, stack, branche, date relative), avec zoom/pan/drag et persistance des positions en localStorage. Pas de WebSocket en Phase 1 (live data = Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Détection de stack (DATA-04)

- **D-01 :** Stacks à détecter (et leurs fichiers sentinelles) : Node.js (`package.json`), Python (`requirements.txt` ou `pyproject.toml`), Rust (`Cargo.toml`), Go (`go.mod`), et toute autre stack identifiable par fichier sentinelle.
- **D-02 :** Si un projet contient plusieurs fichiers sentinelles (multi-stack), afficher **toutes** les stacks détectées (pas d'heuristique de priorité).
- **D-03 :** Fallback si aucun fichier reconnu : afficher le nom du dossier racine du projet comme label de stack.
- **D-04 :** Icône de stack : emoji (ex. 🐍 Python, 🟢 Node.js, 🦀 Rust, 🐹 Go). Zéro dépendance externe, instantanément reconnaissable.

### Opacité / activité (DATA-01)

- **D-05 :** Variation par **paliers discrets** :
  - < 7 jours depuis dernier commit → opacité 1.0 (actif)
  - 7 à 30 jours → opacité 0.6 (semi-actif)
  - > 30 jours → opacité 0.3 (inactif)
- **D-06 :** Projet sans repo git initialisé → bulle marquée « sans git » (label explicite), pas de données git affichées.

### Layout initial

- **D-07 :** Au premier lancement (localStorage vide) : positionnement initial en **cercle centré** autour du centre du canvas. La force simulation affine ensuite les positions.
- **D-08 :** La simulation D3 **s'arrête après stabilisation** (`alphaTarget(0).stop()` quand alpha < seuil). Les positions deviennent fixes jusqu'au prochain drag.

### Contenu visible sur la bulle

- **D-09 :** Chaque bulle affiche : nom du projet (pas de troncature — la bulle s'adapte), emoji(s) stack, branche git courante et date relative en texte plus petit sous/autour de la bulle.
- **D-10 :** La **taille de la bulle est variable dès Phase 1** — rayon proportionnel à l'activité (anticipe VIS-04 / Phase 2). Même formule que l'opacité (jours depuis dernier commit).

### Claude's Discretion

- **Métrique d'activité précise :** Le planificateur choisit la métrique (probablement jours depuis dernier commit, déjà calculé pour DATA-02 — réutiliser le même appel `git log`).
- **Merge localStorage :** Le planificateur choisit le moment de fusion localStorage/données serveur. Contrainte CLAUDE.md à respecter : fusionner AVANT de passer les données à D3 (pitfall #3).
- **Présence has_gsd :** Le scanner peut exposer `has_gsd = true` si `.planning/` existe — utile pour Phase 2 (anneau de couleur VIS-05). Le planificateur décide d'inclure ou non ce champ dans l'API Phase 1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning et requirements
- `.planning/ROADMAP.md` — objectif Phase 1, critères de succès, requirements mappés
- `.planning/REQUIREMENTS.md` — 16 requirements v1 (INFRA-01/02/03, VIS-01/02/03, DATA-01/02/03/04 en Phase 1)

### Contraintes techniques critiques (CLAUDE.md)
- `CLAUDE.md` (racine du projet) — section « Pitfalls critiques » : 5 pièges D3/Node documentés :
  1. EMFILE macOS — chokidar doit ignorer `node_modules`, `.git`, `depth: 2` (Phase 2, mais architecture Phase 1 doit l'anticiper)
  2. Zoom/drag D3 — zoom sur `<rect>` de fond, nœuds dans `<g class="viewport">`, `stopPropagation()` sur mousedown des nœuds
  3. Positions écrasées — fusionner localStorage AVANT de passer à D3
  4. Simulation jamais stable — `alphaTarget(0).stop()` après layout initial ; `alphaTarget(0.3).restart()` sur drag start
  5. Memory leak D3 — `.data(nodes, d => d.id)` avec key function + `.exit().remove()`

### Aucune spec externe supplémentaire
No external ADRs — requirements fully captured in decisions above and ROADMAP.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Aucun fichier de code existant — projet vide (seulement `.planning/` et `CLAUDE.md`). Tout est à créer.

### Established Patterns
- Stack cible définie dans STATE.md et CLAUDE.md : Node.js natif (`http` + `ws`) + D3.js v7 + chokidar v5 (Phase 2)
- Structure de fichiers cible (depuis CLAUDE.md) :
  - `server.js` — HTTP + WebSocket + file watching
  - `scanner.js` — scanne `/CLAUDE_PROJETS/`, retourne `ProjectRecord[]`
  - `watcher.js` — chokidar + debounce 300ms + broadcast WS (Phase 2)
  - `public/index.html` — frontend complet inline
  - `public/lib/d3.min.js` — D3 vendorisé

### Integration Points
- Le scanner lit `/Users/laurent/Documents/CLAUDE_PROJETS/` (chemin absolu sur la machine de dev)
- Chaque projet expose : nom (dossier), stack(s) détectées, branche git, date dernier commit, opacité/taille calculées
- L'API `GET /api/projects` retourne un tableau de `ProjectRecord`

</code_context>

<specifics>
## Specific Ideas

- Emojis de stack à utiliser : 🐍 Python, 🟢 Node.js (ou 📦), 🦀 Rust, 🐹 Go, 💎 Ruby, ☕ Java/Kotlin. Le planificateur peut compléter la liste.
- Workspace racine : `/Users/laurent/Documents/CLAUDE_PROJETS/` — hardcodé ou configurable via variable d'env.
- Projets connus dans le workspace actuel : Projet_BotAVV (Python), projetA, SCC, Formations, GitHub, jupyter_notebook, map_project (Node.js — le projet lui-même).

</specifics>

<deferred>
## Deferred Ideas

- **Anneau de couleur par phase GSD** → Phase 2 (VIS-05)
- **Taille bulle proportionnelle à l'activité (formel)** → partiellement anticipé en Phase 1 (D-10), mais VIS-04 reste Phase 2
- **WebSocket / auto-refresh** → Phase 2 (INT-04)
- **Tooltip au survol** → Phase 3 (INT-01)
- **Clic → ouvrir VS Code** → Phase 3 (INT-02)
- **Champ de recherche** → Phase 3 (INT-03)

</deferred>

---

*Phase: 1-Core Graph*
*Context gathered: 2026-05-11*
