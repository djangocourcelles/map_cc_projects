---
phase: 3
slug: interactions
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-12
---

# Phase 3 — UI Design Contract : Interactions

> Contrat visuel et d'interaction pour INT-01 (tooltip), INT-02 (ouverture VS Code), INT-03 (filtrage).
> Généré par gsd-ui-researcher. À valider par gsd-ui-checker.

---

## Design System

| Propriété | Valeur |
|-----------|--------|
| Outil | none — vanilla HTML/CSS/JS |
| Preset | non applicable |
| Bibliothèque de composants | none |
| Bibliothèque d'icônes | Unicode / caractères CSS uniquement (loupe : U+1F50D ou SVG inline) |
| Police | system-ui, -apple-system, sans-serif (héritée de Phase 1) |

Pas de build step. Pas de framework. D3.js v7 vendorisé dans `public/lib/d3.min.js`.

---

## Thème : double palette dark / light

Phase 3 introduit `prefers-color-scheme`. Les deux jeux de variables CSS sont définis dans `:root`
(dark par défaut) et surchargés dans `@media (prefers-color-scheme: light)`.

### Variables CSS canoniques

```css
:root {
  /* Dark (par défaut) */
  --bg:            #0d1117;   /* fond canvas */
  --surface:       #161b22;   /* fond tooltip, légende, overlay recherche */
  --border:        #30363d;   /* bordures tooltip, séparateurs */
  --text-primary:  #e6edf3;   /* texte principal */
  --text-muted:    #8b949e;   /* labels secondaires, placeholders */
  --text-code:     #a5d6ff;   /* branche (monospace) */
  --accent-gsd:    #3fb950;   /* ligne GSD active dans tooltip */
  --shadow:        rgba(0, 0, 0, 0.55);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg:            #f6f8fa;
    --surface:       #ffffff;
    --border:        #d0d7de;
    --text-primary:  #1f2328;
    --text-muted:    #656d76;
    --text-code:     #0969da;
    --accent-gsd:    #1a7f37;
    --shadow:        rgba(0, 0, 0, 0.12);
  }
}
```

Les couleurs GSD (anneaux, dot WS) ne changent pas entre dark et light — elles sont sémantiques
et déjà établies en Phase 2 :

| Statut GSD | Couleur | Usage |
|------------|---------|-------|
| in-progress | `#58a6ff` | Anneau + label tooltip |
| complete | `#3fb950` | Anneau + label tooltip |
| not-started | `#6e7681` | Anneau + label tooltip |
| paused | `#d29922` | Anneau + label tooltip |
| blocked | `#f85149` | Anneau + label tooltip |
| sans STATE.md | `#444d56` | Anneau tireté |

---

## Espacement

Multiples de 4 uniquement.

| Token | Valeur | Usage Phase 3 |
|-------|--------|---------------|
| xs | 4px | Gap entre dot de couleur et texte dans tooltip |
| sm | 8px | Padding horizontal interne tooltip, gap entre lignes tooltip |
| md | 12px | Padding vertical tooltip, offset curseur tooltip |
| lg | 16px | Padding du champ de recherche, marge overlay |
| xl | 20px | Offset vertical tooltip depuis curseur (valeur cible : -20px) |
| 2xl | 48px | Non utilisé en Phase 3 |

Exceptions : offset exact du tooltip = `+12px horizontal, -20px vertical` depuis le pointeur
(D-01 CONTEXT.md). Valeur -20px est intentionnellement hors grille pour placer le tooltip
légèrement au-dessus du curseur.

---

## Typographie

Toutes les tailles sont en pixels absolus — pas de rem — pour isoler les éléments SVG/overlay
du zoom navigateur éventuel.

| Rôle | Taille | Poids | Line-height | Usage |
|------|--------|-------|-------------|-------|
| Tooltip titre | 13px | 600 (semibold) | 1.2 | Nom du projet (`.tt-nom`) |
| Tooltip corps | 12px | 400 (regular) | 1.4 | Branche, date, stack (`.tt-row`) |
| Tooltip badge GSD | 11px | 500 (medium) | 1.0 | Phase GSD en bas du tooltip (`.tt-gsd`) |
| Branche monospace | 11px | 400 (regular) | 1.0 | Valeur branche dans `.tt-row` |
| Recherche placeholder | 13px | 400 (regular) | 1.0 | Placeholder input filtre |
| Recherche valeur | 13px | 400 (regular) | 1.0 | Texte saisi dans input filtre |

Police monospace pour la branche : `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace`.
Toutes les autres valeurs : `system-ui, -apple-system, sans-serif`.

Poids utilisés : **2 seulement** — 400 (regular) et 600 (semibold).
Exception : 500 pour le badge GSD (un seul élément accentué).

---

## Couleur — règle 60/30/10

| Rôle | Valeur dark | Valeur light | Usage |
|------|-------------|--------------|-------|
| Dominant 60 % | `#0d1117` (`--bg`) | `#f6f8fa` | Fond canvas SVG, arrière-plan page |
| Secondaire 30 % | `#161b22` (`--surface`) | `#ffffff` | Fond tooltip, fond overlay recherche, légende |
| Accent 10 % | `#58a6ff` (in-progress) / `#3fb950` (complete) | identiques | Réservé aux anneaux GSD + badge GSD tooltip |

Accent réservé exclusivement à :
- Anneau GSD des bulles (SVG stroke)
- Ligne de phase GSD dans le tooltip (`.tt-gsd`)
- Dot WebSocket (existant Phase 2)

Pas d'accent sur : boutons, bordures du champ de recherche, fond du tooltip.

Couleur destructive : `#f85149` — réservée au statut GSD « blocked » uniquement. Pas d'action
destructive en Phase 3.

---

## Traitement du fond canvas

### Dark
Fond uni `#0d1117`. Pas de grille, pas de grain — les anneaux guides en tiretés SVG (opacité 0.18,
déjà présents Phase 2) fournissent la structure visuelle suffisante.

### Light
Fond uni `#f6f8fa`. Même principe. Les anneaux guides gardent leur opacité 0.18 — la teinte claire
de leurs couleurs (`#3fb950`, `#d29922`, `#6e7681`) reste lisible sur fond clair.

Pas de gradient radial, pas de texture — le canvas doit rester neutre pour que les bulles colorées
dominent.

---

## Tooltip — INT-01

### Structure HTML

```html
<div id="tooltip">
  <div class="tt-nom">{nom_projet}</div>
  <div class="tt-stack">{emojis stack}</div>       <!-- omis si vide -->
  <div class="tt-row">
    <div class="tt-dot" style="background:{couleur_activite}"></div>
    <span class="tt-date">{date_relative}</span>
    <span class="tt-sep">·</span>
    <code class="tt-branche">{branche}</code>      <!-- omis si sans git -->
  </div>
  <div class="tt-row tt-commit">{message_commit_tronqué}</div>  <!-- omis si absent -->
  <div class="tt-gsd">
    <span class="tt-gsd-dot" style="background:{couleur_gsd}"></span>
    <span class="tt-gsd-label">{phase_gsd_label}</span>         <!-- omis si has_state=false -->
  </div>
</div>
```

Contenu exact (D-02 CONTEXT.md) :
1. Nom du projet — titre, toujours présent
2. Stack — emojis tech détectés (existant dans `labelStack()`)
3. Date relative + branche — sur une ligne
4. Message du dernier commit tronqué à 60 chars — nouvelle donnée (nécessite ajout dans `scanner.js`)
5. Phase GSD — libellé textuel + point de couleur

### CSS

```css
#tooltip {
  position: fixed;
  z-index: 100;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  max-width: 240px;
  pointer-events: none;
  box-shadow: 0 4px 20px var(--shadow);
  /* Animation */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 160ms ease, transform 160ms ease;
}

#tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Timing animation tooltip

- Délai d'apparition : 0ms (immédiat au mouseenter — l'animation CSS de 160ms suffit)
- Fade-in : 160ms ease (opacity + translateY(4px) → 0)
- Fade-out : masquage immédiat par retrait de `.visible` (display passé via transition opacity)
- Cohérence : 160ms < 400ms des anneaux — le tooltip est plus vif que les transitions de données

### Positionnement

```js
// Offset cible (D-01)
const OFFSET_X = +12;  // px à droite du curseur
const OFFSET_Y = -20;  // px au-dessus du curseur

function deplacerTooltip(event) {
  const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
  let x = event.clientX + OFFSET_X;
  let y = event.clientY + OFFSET_Y - th;  // ancré par le bas
  // Clamp bords
  if (x + tw > window.innerWidth  - 8) x = event.clientX - tw - OFFSET_X;
  if (y < 8)                           y = event.clientY + 8;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}
```

### Labels phase GSD pour le tooltip

| `phase_gsd` | Label affiché |
|-------------|--------------|
| `in-progress` | En cours |
| `complete` | Terminé |
| `not-started` | Non démarré |
| `paused` | En pause |
| `blocked` | Bloqué |
| `unknown` | GSD actif |
| `null` (has_state=false) | *(ligne absente)* |

---

## Champ de recherche — INT-03

### Structure HTML

```html
<div id="recherche-overlay">
  <span class="loupe" aria-hidden="true">⌕</span>
  <input id="recherche-input"
         type="search"
         placeholder="Filtrer les projets…"
         autocomplete="off"
         spellcheck="false" />
</div>
```

### CSS

```css
#recherche-overlay {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 12px;
  box-shadow: 0 2px 8px var(--shadow);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

#recherche-overlay:focus-within {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15), 0 2px 8px var(--shadow);
}

.loupe {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1;
  user-select: none;
}

#recherche-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  width: 160px;
  caret-color: #58a6ff;
}

#recherche-input::placeholder {
  color: var(--text-muted);
}

/* Masquer le bouton natif 'x' de type=search */
#recherche-input::-webkit-search-cancel-button { display: none; }
```

Icône loupe : caractère Unicode `⌕` (U+2315, TELEPHONE RECORDER) ou `⌕`. Fallback si rendu
insuffisant : SVG inline 14×14px avec `viewBox="0 0 24 24"`, stroke `currentColor`.

### Comportement

- `input` event → filtrage immédiat (pas de debounce — liste locale, pas de réseau)
- Portée : `d.nom` uniquement (D-09 CONTEXT.md), comparaison case-insensitive, sans diacritiques (`normalize('NFD').replace(...)`)
- Bulles non-matchées : `opacity` D3 transition à `0.15`, durée `200ms ease`
- Bulles matchées ou champ vide : `opacity` à `1`, durée `200ms ease`
- Echap : vider `input.value` + déclencher `input` event + `blur()` sur l'input
- La simulation D3 ne redémarre PAS lors du filtrage — uniquement `transition().attr('opacity', ...)`

---

## Animation pulse VS Code — INT-02

Le pulse confirme que le clic a été reçu et la requête `/open` émise. Il ne bloque pas le drag.

### Implémentation D3

```js
function pulserBulle(noeudG) {
  d3.select(noeudG).select('.bulle')
    .transition()
      .duration(120)
      .attr('transform', 'scale(1.15)')
      .attr('transform-origin', 'center')     // SVG 2 — fallback transform-box: fill-box
    .transition()
      .duration(180)
      .attr('transform', 'scale(1)');
}
```

Spec temporelle :
- Phase montée : 120ms (scale 1 → 1.15)
- Phase descente : 180ms (scale 1.15 → 1)
- Durée totale : 300ms (D-06 CONTEXT.md)
- Easing : D3 par défaut (`easeCubic`) pour les deux phases

Attributs SVG concernés : `transform` sur l'élément `<circle class="bulle">` uniquement.
L'anneau GSD (`<circle class="anneau-gsd">`) n'est pas affecté.

CSS fallback pour `transform-box: fill-box` (requis sur Safari < 16) :
```css
.bulle {
  transform-box: fill-box;
  transform-origin: center;
}
```

### Gestion clic / drag

Le clic sur une bulle déclenche le pulse ET la requête fetch. Le drag existant appelle déjà
`stopPropagation()` sur `mousedown` — le `click` event se déclenche uniquement si la distance
de drag est nulle (comportement natif du navigateur). Pas de conflit.

```js
noeud.on('click', (event, d) => {
  pulserBulle(event.currentTarget);
  fetch(`/open?path=${encodeURIComponent(d.chemin)}`).catch(() => {});
});
```

---

## Données nécessaires dans scanner.js

Le tooltip INT-01 requiert `lastCommit` (message du dernier commit, 60 chars max). Ce champ
n'existe pas encore dans `ProjectRecord`. Le planner doit prévoir son ajout dans `scanner.js` :

```js
// Dans construireRecord(), après la ligne du brancheRaw :
const commitMsgRaw = hasGit
  ? gitExec('git log -1 --format=%s', chemin)
  : null;
const lastCommit = commitMsgRaw
  ? commitMsgRaw.slice(0, 60) + (commitMsgRaw.length > 60 ? '…' : '')
  : null;

// Dans le return :
last_commit: lastCommit,
```

Champ ajouté au `ProjectRecord` : `last_commit` (string | null).

---

## Route serveur — INT-02

À ajouter dans `server.js`, en suivant le pattern existant des routes HTTP :

```js
if (req.url.startsWith('/open') && req.method === 'GET') {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const chemin = params.get('path') || '';
  // Validation : chemin doit commencer par le workspace root
  if (!chemin.startsWith('/Users/laurent/Documents/CLAUDE_PROJETS/')) {
    res.writeHead(400); res.end('Chemin invalide'); return;
  }
  require('child_process').exec(`code "${chemin}"`, err => {
    if (err) console.error('[open] Erreur VS Code :', err.message);
  });
  res.writeHead(204); res.end();
  return;
}
```

Réponse HTTP : `204 No Content` (succès silencieux côté client, D-07 CONTEXT.md).

---

## Copywriting

| Élément | Texte |
|---------|-------|
| Placeholder recherche | `Filtrer les projets…` |
| Tooltip — date sans git | `sans git` (existant, maintenu) |
| Tooltip — commit absent | *(ligne omise, pas de texte de substitution)* |
| Tooltip — sans STATE.md | *(ligne GSD omise, pas de texte de substitution)* |
| État vide (existant) | `Aucun projet trouvé dans le workspace.` |
| Erreur chargement (existant) | `Erreur de chargement — serveur démarré ?` |
| Action destructive | aucune en Phase 3 |

Pas de toast, pas de notification d'erreur côté client pour `/open` (D-07 CONTEXT.md).

---

## Contraintes d'intégration

| Contrainte | Règle |
|------------|-------|
| Drag D3 | `click` ne se déclenche pas si `mousemove` a eu lieu (natif) — pas de `stopPropagation` supplémentaire |
| localStorage | Ne pas toucher — positions gérées par Phase 1 |
| Simulation | Ne jamais relancer `alphaTarget` lors du filtrage ou du tooltip |
| `prefers-color-scheme` | Géré en CSS pur — pas de JS pour détecter le thème |
| Zoom/pan | L'overlay recherche est `position: fixed` — ne zoome pas avec le canvas SVG |
| Tooltip + zoom | Le tooltip suit `event.clientX/Y` (coordonnées viewport, pas SVG) — pas de transformation à inverser |

---

## Registry Safety

| Registre | Blocs utilisés | Résultat du contrôle |
|----------|---------------|----------------------|
| shadcn officiel | aucun | non applicable — pas de shadcn |
| tiers | aucun | non applicable |

Aucune dépendance externe ajoutée en Phase 3. Tout le code est vanilla.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting : PASS
- [ ] Dimension 2 Visuals : PASS
- [ ] Dimension 3 Color : PASS
- [ ] Dimension 4 Typography : PASS
- [ ] Dimension 5 Spacing : PASS
- [ ] Dimension 6 Registry Safety : PASS

**Approbation :** en attente

---

## Sources des décisions

| Section | Source |
|---------|--------|
| Offset tooltip +12 / -20 | CONTEXT.md D-01 |
| Contenu tooltip | CONTEXT.md D-02 |
| Style visuel tooltip | CONTEXT.md D-03 (délégué ici) |
| Pulse scale 1→1.15→1, 300ms | CONTEXT.md D-06 |
| Position overlay recherche | CONTEXT.md D-10 |
| Opacité 0.15 non-matchés | CONTEXT.md D-08 |
| Filtre nom uniquement | CONTEXT.md D-09 |
| prefers-color-scheme | CONTEXT.md D-12 |
| Direction esthétique libre | CONTEXT.md D-13 |
| Transitions 400ms anneaux | index.html Phase 2 |
| Couleurs GSD existantes | index.html `COULEURS_GSD` |
| Fond canvas `#0d1117` | index.html `background` body |
| Surface `#161b22`, border `#30363d` | index.html styles tooltip existants |
