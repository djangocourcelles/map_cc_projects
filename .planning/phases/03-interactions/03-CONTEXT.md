# Phase 3: Interactions - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Rendre la carte interactive : tooltip informatif au survol, ouverture VS Code au clic, filtrage temps réel par nom. L'interface passe de « vue passive » à « outil actif ». L'esthétique globale est confiée au frontend-design skill (UI hint actif).

</domain>

<decisions>
## Implementation Decisions

### Tooltip (INT-01)

- **D-01:** Le tooltip suit le curseur avec un offset (+12px, -20px) depuis le pointeur — positionnement dynamique via `mousemove`, jamais ancré à la bulle.
- **D-02:** Contenu : nom du projet en titre principal (gros, en haut), puis branche git, message du dernier commit (tronqué à 60 chars), stack détectée, phase GSD — exactement INT-01 plus le titre. Rien d'autre.
- **D-03:** Fond, style visuel, délai d'apparition et animation d'entrée/sortie : délégués au frontend-design skill (cohérence avec les transitions 400ms des anneaux GSD de Phase 2).

### Ouverture VS Code (INT-02)

- **D-04:** Mécanisme : clic sur une bulle → requête `GET /open?path=<chemin_absolu>` au serveur Node.js → `child_process.exec('code /path')` côté serveur.
- **D-05:** Route : `GET /open` avec paramètre `path` dans la query string.
- **D-06:** Feedback visuel : pulse bref sur la bulle (scale 1 → 1.15 → 1, durée ~300ms) pour confirmer l'action.
- **D-07:** Gestion d'erreur : `console.error` côté serveur, silencieux côté client — outil local, l'utilisateur sait si VS Code est absent.

### Filtrage (INT-03)

- **D-08:** Bulles non-matchées : estompage à `opacity: 0.15` via transition D3 — la carte reste visible et le contexte spatial est préservé.
- **D-09:** Portée du filtre : nom du projet uniquement (exactement INT-03). Pas de recherche sur stack ou phase GSD.
- **D-10:** Position du champ de recherche : coin supérieur gauche, overlay flottant, `position: fixed`, icône loupe.
- **D-11:** Champ vidé (ou Escape) : toutes les bulles reviennent à `opacity: 1`.

### Thème visuel global

- **D-12:** Mode couleurs : s'adapte au système via `prefers-color-scheme` — dark ET light supportés.
- **D-13:** Direction esthétique (tooltip, champ de recherche, fond carte) : entièrement déléguée au frontend-design skill. Aucune référence imposée. Liberté totale pour une identité visuelle distinctive.

### Claude's Discretion

- Style exact du tooltip (fond, rayon, ombre, typographie, padding) — frontend-design skill décide.
- Timing précis du délai d'apparition et de la durée du fade-in du tooltip — calibrer en cohérence avec les 400ms des anneaux (Phase 2).
- Style du champ de recherche (couleur, bordure, focus state, placeholder) — frontend-design skill décide.
- Fond de la carte (uni, grille de points, gradient radial) — frontend-design skill décide, dark ET light.
- Valeurs exactes des deux jeux de couleurs CSS (dark/light) pour `prefers-color-scheme`.

</decisions>

<canonical_refs>
## Canonical References

**Les agents en aval DOIVENT lire ces fichiers avant de planifier ou d'implémenter.**

### Planning et requirements

- `.planning/ROADMAP.md` — Goal Phase 3, requirements INT-01, INT-02, INT-03, success criteria
- `.planning/REQUIREMENTS.md` — Détail des requirements v1 et traçabilité par phase
- `.planning/phases/01-core-graph/01-CONTEXT.md` — Décisions Phase 1 (patterns D3, scanner, localStorage, structure fichiers)
- `.planning/phases/02-live-data/02-CONTEXT.md` — Décisions Phase 2 (anneaux GSD, taille bulles, WebSocket, transitions 400ms)

### Code existant à étendre

- `public/index.html` — Frontend complet Phase 2 : D3 force simulation, update pattern, client WebSocket, localStorage positions — **base à étendre**
- `server.js` — Serveur HTTP + WebSocket existant — **ajouter la route GET /open**
- `scanner.js` — Produit les `ProjectRecord[]` avec `path`, `name`, `branch`, `lastCommit`, `stack`, `gsdPhase` — vérifier que tous les champs du tooltip sont disponibles

### Contraintes techniques critiques (CLAUDE.md)

- Node.js natif (`http`) — pas de framework serveur
- HTML/CSS/JS vanilla — pas de build step, pas de framework JS côté client
- D3.js v7 vendorisé dans `public/lib/d3.min.js`
- frontend-design skill DOIT être invoqué pour la Phase 3 UI (mentionné explicitement dans CLAUDE.md et PROJECT.md)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **D3 nodes selection** (`public/index.html`) — pattern `.data(nodes, d => d.id).join(...)` existant depuis Phase 1, étendre avec les event listeners `mouseover`, `mousemove`, `mouseout`, `click`.
- **WebSocket message handler** (`public/index.html`) — handler `onmessage` déjà présent ; les données projet arrivent déjà avec tous les champs.
- **server.js route handler** — pattern `if (req.url.startsWith('/api/...'))` existant ; ajouter `/open` en suivant le même pattern.

### Established Patterns

- Transitions D3 à 400ms (Phase 2) — le tooltip et le pulse de clic doivent être cohérents avec ce timing.
- `localStorage` pour positions des bulles — pas toucher en Phase 3, ne pas casser la persistance.
- Pas de `stopPropagation()` sur les nœuds pour le drag (Phase 1 pitfall) — vérifier que les event listeners tooltip/clic n'interfèrent pas avec le drag D3.
- Simulation `alphaTarget(0).stop()` après layout — pas relancer la simulation lors du filtrage, seulement modifier opacity.

### Integration Points

- **Tooltip ↔ D3 nodes** : `mouseenter`/`mousemove`/`mouseleave` sur les éléments `<g>` ou `<circle>` des nœuds.
- **Clic ↔ server.js** : `fetch('/open?path=' + encodeURIComponent(d.path))` depuis le frontend.
- **Filtrage ↔ D3 nodes** : `input` event sur le champ → `node.transition().attr('opacity', d => match(d) ? 1 : 0.15)`.
- **`prefers-color-scheme` ↔ CSS variables** : définir `--bg`, `--text`, `--surface` dans `:root` et `@media (prefers-color-scheme: light)`.

</code_context>

<specifics>
## Specific Ideas

- Le champ de recherche est un overlay `position: fixed` en haut à gauche — il ne défile pas avec la carte et ne perturbe pas le zoom/drag D3.
- Le pulse de clic (D-06) est une animation CSS ou D3 `transition` sur `transform: scale(...)` — ne pas utiliser `setTimeout` brut.
- La route `/open` doit URL-décoder le paramètre `path` avant de passer à `exec` (sécurité basique : valider que le chemin commence bien par le workspace root).

</specifics>

<deferred>
## Deferred Ideas

- Filtre multi-champs (stack, phase GSD) — hors-scope INT-03, à noter pour une v2 éventuelle.
- Toast d'erreur si VS Code absent — non retenu, outil local, user sait.
- Shortcut Escape pour vider le filtre — non discuté explicitement, laissé à la discrétion du planner (comportement attendu standard).

</deferred>

---

*Phase: 3-Interactions*
*Context gathered: 2026-05-12*
