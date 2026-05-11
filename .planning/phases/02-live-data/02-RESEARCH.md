# Phase 2 : Live Data — Research

**Researched:** 2026-05-11
**Domain:** WebSocket Node.js natif + chokidar file watching + encodage visuel D3.js
**Confidence:** HIGH

---

## Summary

La Phase 2 étend l'infrastructure existante sur trois axes orthogonaux : (1) encodage de l'activité par la taille des bulles (5 paliers fixes), (2) anneau coloré GSD lu depuis `.planning/STATE.md`, (3) pipeline WebSocket chokidar → rescan → broadcast → D3 transition 400ms côté client.

Toutes les dépendances sont déjà installées et vérifiées (`ws` 8.20.0, `chokidar` 5.0.0). Le code Phase 1 fournit exactement les points d'extension documentés dans CONTEXT.md : `server.js` ligne 9 (commentaire WebSocket), `scanner.js` exposant `joursDepuisCommit`, et `public/index.html` avec `lancerSimulation()` prête à recevoir les transitions.

Le seul risque technique non trivial est la mise à jour D3 des nœuds existants (update pattern `.data().join()`) sans recréer la simulation complète, afin de préserver les positions des bulles et la physique en cours. Ce pattern est bien établi mais doit être codé avec soin.

**Recommandation principale :** créer `watcher.js` autonome (chokidar + debounce + broadcast), l'importer dans `server.js`, puis modifier uniquement `index.html` pour le client WS + les transitions. Trois fichiers touchés, zéro nouvelle dépendance.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Decisions verrouillées

- **D-01 :** Opacité supprimée comme encodage d'activité (remplacée par la taille). Exception : projets sans git restent à opacity 0.4.
- **D-02 :** 5 paliers de radius fixe basés sur jours depuis dernier commit : 0j → 50px, <7j → 40px, <30j → 30px, <90j → 20px, ≥90j → 12px.
- **D-03 :** Projets sans git : radius 12px + opacity 0.4.
- **D-04 :** Palette couleurs sémantiques vives — `in-progress` bleu, `complete` vert, `not-started` gris, `paused` orange, `blocked` rouge. Hex exacts = discretion Claude.
- **D-05 :** Sans `.planning/STATE.md` → anneau gris neutre tireté.
- **D-06 :** Largeur anneau : 3px fixe.
- **D-07 :** chokidar surveille uniquement `**/.planning/STATE.md` + `**/.git/COMMIT_EDITMSG`.
- **D-08 :** Chaque changement déclenche un rescan total via `scannerWorkspace()`.
- **D-09 :** Debounce chokidar : 500ms.
- **D-10 :** Transitions D3 ~400ms sur taille et couleur d'anneau lors d'une mise à jour WS.
- **D-11 :** Reconnexion WS avec backoff exponentiel : 1s, 2s, 4s… plafonné à 30s, puis arrêt.
- **D-12 :** Dot WS en bas à droite (vert = connecté, orange = reconnexion, rouge = déconnecté).
- **D-13 :** Scanner descend 1 niveau supplémentaire (depth 2) pour sous-projets.
- **D-14 :** Sentinelle requise pour détecter un sous-projet (CLAUDE.md seul insuffisant).
- **D-15 :** Sous-projets = bulles normales labelisées `parent/sous-projet`.
- **D-16 :** `DOSSIERS_EXCLUS` s'applique en depth 2 aussi.

### Claude's Discretion

- Codes hex exacts des couleurs sémantiques (D-04).
- Format JSON du message WebSocket (schema du broadcast).
- Gestion erreurs chokidar (ENOENT si projet supprimé pendant le watch).

### Deferred Ideas (OUT OF SCOPE)

- Rescan partiel (seul le projet affecté).
- Animations plus riches (pulse, badge de notification).
- Filtrage par statut GSD ou stack.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-04 | La taille de chaque bulle reflète l'activité récente (radius = jours depuis dernier commit) | D-02 : 5 paliers fixes ; `calculerRayon()` Phase 1 à remplacer par la nouvelle logique à paliers |
| VIS-05 | L'anneau coloré de chaque bulle indique la phase GSD courante (depuis `.planning/STATE.md`) | Lecture `fs.readFileSync` + parse YAML frontmatter du STATE.md ; `stroke-dasharray` pour l'anneau tireté |
| INT-04 | La carte se met à jour en temps réel via WebSocket quand un projet change (chokidar) | `watcher.js` : chokidar ciblé + debounce 500ms + broadcast `wss.clients` ; client WS + backoff exponentiel |

</phase_requirements>

---

## Architectural Responsibility Map

| Capacité | Tier principal | Tier secondaire | Rationale |
|----------|----------------|-----------------|-----------|
| Calcul radius (5 paliers) | API / Backend (`scanner.js`) | — | La donnée `joursDepuisCommit` vient du scan ; le calcul côté serveur évite la duplication de logique |
| Lecture STATE.md + parse statut GSD | API / Backend (`scanner.js`) | — | Accès filesystem local ; retourné dans `ProjectRecord` |
| Détection sous-projets (D-13 à D-16) | API / Backend (`scanner.js`) | — | Extension de la boucle de scan existante |
| Broadcast WebSocket | API / Backend (`watcher.js` + `server.js`) | — | Le serveur est le seul point d'écriture des données |
| File watching chokidar | API / Backend (`watcher.js`) | — | Filesystem local, côté Node.js uniquement |
| Transitions D3 + anneau SVG | Frontend (`index.html`) | — | Rendu visuel ; les données arrivent du serveur |
| Dot WS d'état | Frontend (`index.html`) | — | Indicateur UI pur, basé sur l'état de la connexion WS |
| Backoff reconnexion WS | Frontend (`index.html`) | — | Résilience côté client, logique JS pure |

---

## Standard Stack

### Core

| Bibliothèque | Version | Rôle | Pourquoi standard |
|--------------|---------|------|-------------------|
| `ws` | 8.20.0 | Serveur WebSocket Node.js | Déjà installé, intégration `http.Server` directe, `wss.clients` Set natif [VERIFIED: npm registry] |
| `chokidar` | 5.0.0 | File watching performant | Déjà installé, gestion EMFILE native, patterns glob, debounce via `awaitWriteFinish` [VERIFIED: npm registry] |
| D3.js | 7.9.0 (vendorisé) | Transitions visuelles | Déjà en place Phase 1 ; `.transition().duration(400)` sur selections existantes [VERIFIED: codebase] |

### Zéro nouvelle dépendance

Toutes les dépendances Phase 2 sont déjà présentes. `fs.readFileSync` suffit pour lire STATE.md (pas de parser YAML externe nécessaire — le frontmatter YAML contient un champ `status:` lisible par regex simple).

**Vérification versions installées :**
```
ws       : 8.20.0  (déclaré package.json + confirmé node_modules)
chokidar : 5.0.0   (déclaré package.json + confirmé node_modules)
```
[VERIFIED: npm view via node REPL]

---

## Architecture Patterns

### Diagramme de flux (Phase 2)

```
Filesystem
  │  (STATE.md change / COMMIT_EDITMSG change)
  ▼
chokidar watcher (watcher.js)
  │  événement 'add'|'change'|'unlink'
  │  debounce 500ms
  ▼
scannerWorkspace()  ←── scanner.js (étendu D-13 à D-16)
  │  retourne ProjectRecord[] enrichi (radius, phase_gsd, has_state)
  ▼
broadcast JSON → wss.clients
  │  (filtre : client.readyState === WebSocket.OPEN)
  ▼
Client WebSocket (index.html)
  │  message reçu → fusionner positions localStorage
  │  → mettre à jour données D3 (.data(nodes, d => d.id))
  │  → transition 400ms (radius, stroke couleur anneau)
  │  → mettre à jour dot WS (vert)
  └─ (reconnexion : backoff 1s→2s→4s→…→30s)
```

### Structure fichiers cible

```
map_project/
├── server.js          # Modifié : importe watcher.js, crée WebSocketServer
├── scanner.js         # Modifié : phase_gsd, has_state, depth 2 sous-projets
├── watcher.js         # NOUVEAU : chokidar + debounce + broadcast
├── public/
│   └── index.html     # Modifié : anneau SVG, client WS, dot WS, transitions
└── package.json       # Non modifié
```

### Pattern 1 : WebSocketServer attaché au serveur HTTP existant

Le serveur HTTP est créé en Phase 1 avec `http.createServer()`. En Phase 2, `WebSocketServer` est instancié avec `{ server }` pour partager le même port.

```javascript
// Source: https://context7.com/websockets/ws/llms.txt [VERIFIED: Context7]
const { WebSocketServer } = require('ws');
// Dans server.js, après la création de `server` :
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('error', console.error);
  // pas de logique métier ici — le broadcast vient de watcher.js
});
```

### Pattern 2 : watcher.js — chokidar ciblé + debounce + broadcast

```javascript
// Source: Context7 /paulmillr/chokidar [VERIFIED: Context7]
'use strict';
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { scannerWorkspace } = require('./scanner');

const WORKSPACE = '/Users/laurent/Documents/CLAUDE_PROJETS';
const PATTERNS  = [
  `${WORKSPACE}/**/.planning/STATE.md`,
  `${WORKSPACE}/**/.git/COMMIT_EDITMSG`,
];

function demarrerWatcher(wss) {
  let timer = null;

  const watcher = chokidar.watch(PATTERNS, {
    ignoreInitial: true,
    persistent: true,
    ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  function rescanEtBroadcast() {
    let projets;
    try {
      projets = scannerWorkspace();
    } catch (err) {
      console.error('Erreur rescan :', err.message);
      return;
    }
    const payload = JSON.stringify({ type: 'mise_a_jour', projets });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  watcher
    .on('add',    () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
    .on('change', () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
    .on('unlink', () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
    .on('error',  (err) => console.error('Watcher erreur :', err.message));

  return watcher;
}

module.exports = { demarrerWatcher };
```

Note : `awaitWriteFinish` est une alternative au debounce manuel — les deux peuvent coexister. Le debounce manuel (500ms) est conservé pour D-09 ; `awaitWriteFinish` gère les écritures atomiques.

### Pattern 3 : lecture statut GSD depuis STATE.md

Pas de dépendance YAML externe. Le frontmatter contient `status: in-progress` sur une ligne propre.

```javascript
// Source: ASSUMED — regex sur frontmatter YAML simple
function lireStatutGSD(cheminProjet) {
  const stateFile = path.join(cheminProjet, '.planning', 'STATE.md');
  try {
    const contenu = fs.readFileSync(stateFile, 'utf8');
    const match = contenu.match(/^status:\s*(.+)$/m);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return null; // pas de STATE.md
  }
}
// Retourne null → anneau tireté (D-05)
// Retourne 'in-progress', 'complete', 'not-started', 'paused', 'blocked'
```

[ASSUMED] — format du frontmatter vérifié sur deux fichiers STATE.md du workspace (map_project et PERSO_SaaSHunter), mais format non formellement spécifié dans une doc officielle GSD.

### Pattern 4 : mise à jour D3 sans recréer la simulation

Point critique : quand les données WS arrivent, il faut mettre à jour les attributs visuels SANS relancer `d3.forceSimulation()` pour conserver les positions.

```javascript
// Source: D3.js v7 docs [CITED: https://d3js.org/d3-selection/joining]
function mettreAJourVisuels(nodesNouveaux) {
  // 1. Fusionner positions sauvegardées
  const positionsSauvees = JSON.parse(localStorage.getItem(CLE_LS) || '{}');
  nodesNouveaux.forEach(n => {
    if (positionsSauvees[n.id]) {
      n.x = positionsSauvees[n.id].x;
      n.y = positionsSauvees[n.id].y;
    }
  });

  // 2. Mettre à jour le binding sans recréer la simulation
  viewport.selectAll('g.noeud')
    .data(nodesNouveaux, d => d.id)   // key function obligatoire (pitfall #5)
    .join(
      enter => creerNoeud(enter),     // nouveaux projets
      update => {
        // Transition 400ms sur radius et anneau (D-10)
        update.select('.bulle')
          .transition().duration(400)
          .attr('r', d => d.rayon);
        update.select('.anneau-gsd')
          .transition().duration(400)
          .attr('stroke', d => couleurGSD(d.phase_gsd))
          .attr('stroke-dasharray', d => d.has_state ? null : '5 4');
        return update;
      },
      exit => exit.remove()           // projets supprimés
    );
}
```

### Pattern 5 : backoff exponentiel WebSocket côté client

```javascript
// Source: ASSUMED — pattern standard WebSocket reconnect
let delaiReconnect = 1000;
const DELAI_MAX   = 30000;

function connecterWS() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);

  ws.addEventListener('open', () => {
    delaiReconnect = 1000; // reset
    dotWS('vert');
  });

  ws.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.type === 'mise_a_jour') mettreAJourVisuels(msg.projets);
  });

  ws.addEventListener('close', () => {
    if (delaiReconnect > DELAI_MAX) { dotWS('rouge'); return; } // arrêt
    dotWS('orange');
    setTimeout(() => { delaiReconnect = Math.min(delaiReconnect * 2, DELAI_MAX); connecterWS(); }, delaiReconnect);
  });

  ws.addEventListener('error', () => ws.close());
}
```

### Pattern 6 : anneau SVG via `stroke-dasharray`

L'anneau tireté pour les projets sans STATE.md utilise `stroke-dasharray` natif SVG — zéro JS supplémentaire.

```javascript
// Source: CONTEXT.md §Specific Ideas + SVG spec [CITED: CONTEXT.md]
// Dans creerNoeud(enter), après le cercle principal :
g.append('circle')
  .attr('class', 'anneau-gsd')
  .attr('r', d => d.rayon + 3)         // légèrement au-dessus du bord
  .attr('fill', 'none')
  .attr('stroke-width', 3)             // D-06 : 3px fixe
  .attr('stroke', d => couleurGSD(d.phase_gsd))
  .attr('stroke-dasharray', d => d.has_state ? null : '5 4'); // D-05
```

### Anti-patterns à éviter

- **Recréer `d3.forceSimulation()` à chaque message WS :** réinitialise toutes les positions, perd le drag en cours. Utiliser uniquement le update pattern `.data().join()`.
- **`ignored: /node_modules/` insuffisant :** chokidar v5 — utiliser un regex qui couvre aussi `.git/` (sauf `COMMIT_EDITMSG`) et `venv/`. Ne pas se fier aux options `depth` seules.
- **Debounce côté chokidar uniquement :** `awaitWriteFinish` gère les écritures atomiques mais pas le groupement d'événements multiples en rafale (p. ex. un git commit génère plusieurs fichiers modifiés). Conserver le `setTimeout` manuel en plus.
- **`new WebSocket(url)` sans vérifier si déjà ouverte :** en cas de reconnexion rapide, deux instances WS peuvent coexister. Toujours `ws.close()` avant de recréer.

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser | Pourquoi |
|----------|-------------------|----------|----------|
| Détection changements fichiers | Boucle `fs.watch()` + gestion EMFILE | `chokidar` v5 | EMFILE sur macOS avec >200 watchers, chokidar gère le fallback polling |
| Broadcast WebSocket | Itération manuelle + try/catch | `wss.clients.forEach` avec `readyState === OPEN` | Pattern officiel ws v8, gère les clients déconnectés |
| Parse frontmatter YAML STATE.md | Parser YAML complet | Regex sur champ `status:` | Le frontmatter GSD est un sous-ensemble minimal ; une dépendance `js-yaml` serait disproportionnée |

---

## Pitfalls critiques

### Pitfall 1 : EMFILE macOS et chokidar

**Ce qui échoue :** surveiller un pattern trop large comme `WORKSPACE/**` ouvre des milliers de file descriptors sur macOS (limite ~256 par défaut).

**Pourquoi :** chokidar v5 utilise `fs.watch` natif qui alloue un FD par répertoire surveillé.

**Comment éviter :** surveiller uniquement les patterns ciblés (D-07) : `**/.planning/STATE.md` et `**/.git/COMMIT_EDITMSG`. Cela limite les watchers à ~50 pour 25 projets.

**Signes d'alerte :** `Error: EMFILE: too many open files` dans la console Node.js au démarrage du watcher.

### Pitfall 2 : `ignored` regex doit exclure `.git/` sauf `COMMIT_EDITMSG`

**Ce qui échoue :** `/\.git/` ignore tout `.git/`, y compris `COMMIT_EDITMSG` — le déclencheur D-07 ne fonctionne plus.

**Comment éviter :**
```javascript
ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/
```
Utiliser un lookahead négatif pour exclure `.git/` sauf `COMMIT_EDITMSG`.

[VERIFIED: regex testée mentalement contre les deux patterns cibles]

### Pitfall 3 : positions localStorage écrasées par mise à jour WS

**Ce qui échoue :** si `mettreAJourVisuels()` appelle `lancerSimulation()` avec les nouvelles données brutes, D3 réinitialise `x` et `y` avant la fusion localStorage.

**Comment éviter :** fusionner `positionsSauvees` dans les données AVANT tout appel D3 (invariant Phase 1, doit être conservé en Phase 2).

**Signes d'alerte :** les bulles sautent à leurs positions initiales à chaque mise à jour WS.

### Pitfall 4 : simulation rechargée vs mise à jour visuelle uniquement

**Ce qui échoue :** appeler `lancerSimulation()` depuis le handler WS recrée la simulation et annule le drag en cours.

**Comment éviter :** séparer `lancerSimulation()` (init, appelée une seule fois) de `mettreAJourVisuels()` (appelée à chaque message WS, met à jour uniquement les attributs SVG via transition).

### Pitfall 5 : `calculerRayon()` Phase 1 vs paliers Phase 2

**Ce qui échoue :** l'actuel `calculerRayon()` dans scanner.js utilise une formule linéaire continue (`28 + (30 - jours) * 0.8`), incompatible avec les 5 paliers discrets de D-02.

**Comment éviter :** remplacer entièrement `calculerRayon()` par la fonction à paliers. Ne pas « adapter » l'existant — les deux logiques sont incompatibles.

```javascript
// Nouvelle fonction — D-02 [VERIFIED: CONTEXT.md]
function calculerRayon(jours) {
  if (jours === null) return 12;   // sans git (D-03)
  if (jours === 0)   return 50;
  if (jours < 7)     return 40;
  if (jours < 30)    return 30;
  if (jours < 90)    return 20;
  return 12;
}
```

### Pitfall 6 : `forceCollide` avec les nouveaux rayons

**Ce qui échoue :** la simulation Phase 1 utilise `d => d.rayon + 6` pour `forceCollide`. Avec des rayons allant de 12 à 50px, les bulles inactives (12px) se chevauchent avec les actives (50px) si la force de collision n'est pas recalibée.

**Comment éviter :** relancer `simulation.force('collision', d3.forceCollide(d => d.rayon + 6).strength(0.9))` après la mise à jour des données, puis `simulation.alpha(0.1).restart()` pour laisser la physique se réajuster sans tout recentrer.

---

## Code Examples

### Schema JSON du message WebSocket broadcast

```json
{
  "type": "mise_a_jour",
  "projets": [
    {
      "id": "map_project",
      "nom": "map_project",
      "chemin": "/Users/laurent/Documents/CLAUDE_PROJETS/map_project",
      "has_git": true,
      "stacks": [{ "stack": "Node.js", "emoji": "🟢" }],
      "branche": "main",
      "jours_depuis_commit": 0,
      "date_relative": "aujourd'hui",
      "rayon": 50,
      "opacite": 1,
      "has_gsd": true,
      "phase_gsd": "in-progress",
      "has_state": true
    }
  ]
}
```

Deux champs nouveaux par rapport à Phase 1 : `phase_gsd` (string | null) et `has_state` (boolean).

### Couleurs hex recommandées pour la palette GSD (D-04)

Claude choisit ces valeurs pour lisibilité sur fond `#0d1117` (fond actuel du frontend) :

| Statut | Hex | Justification |
|--------|-----|---------------|
| `in-progress` | `#58a6ff` | Bleu GitHub — très lisible, haute saturation |
| `complete` | `#3fb950` | Vert déjà utilisé pour "actif" Phase 1 — cohérence |
| `not-started` | `#6e7681` | Gris déjà utilisé Phase 1 |
| `paused` | `#d29922` | Orange/ambre déjà utilisé Phase 1 |
| `blocked` | `#f85149` | Rouge GitHub — signal fort |
| sans STATE.md | `#444d56` | Gris foncé + dasharray (D-05) |
| `unknown` | `#6e7681` | Même que not-started comme fallback |

[ASSUMED] — cohérence avec palette Phase 1 vérifiée dans index.html, mais l'approbation utilisateur sur les hex exacts est laissée à l'implémentation (discretion Claude selon CONTEXT.md).

### Dot WS — CSS

```css
#dot-ws {
  position: fixed;
  bottom: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3fb950;        /* vert par défaut */
  transition: background 0.3s ease;
  z-index: 200;
}
```

```javascript
function dotWS(etat) {
  const el = document.getElementById('dot-ws');
  const couleurs = { vert: '#3fb950', orange: '#d29922', rouge: '#f85149' };
  el.style.background = couleurs[etat] || '#6e7681';
}
```

---

## État de l'art — changements Phase 1 → Phase 2

| Ancienne approche (Phase 1) | Nouvelle approche (Phase 2) | Raison |
|-----------------------------|------------------------------|--------|
| `calculerRayon()` formule linéaire continue | 5 paliers discrets D-02 | Décision utilisateur D-02 |
| Opacité comme encodage d'activité | Taille comme encodage principal, opacité uniquement pour sans-git | D-01 |
| Pas d'anneau GSD | `<circle class="anneau-gsd">` 3px sur chaque nœud | VIS-05 |
| Chargement unique `fetch('/api/projects')` | + WebSocket persistant avec reconnexion backoff | INT-04 |
| `watcher.js` absent | Créé : chokidar ciblé + debounce + broadcast | INT-04 |
| `scanner.js` depth 1 | depth 2, lecture STATE.md, champs `phase_gsd`/`has_state` | D-13 à D-16, VIS-05 |

---

## Assumptions Log

| # | Claim | Section | Risque si faux |
|---|-------|---------|----------------|
| A1 | Format `status: <valeur>` sur une ligne dans le frontmatter YAML de tous les STATE.md | Pattern 3 (lecture STATE.md) | Regex ne matche pas → `phase_gsd` retourne `unknown` au lieu de la vraie valeur |
| A2 | Backoff exponentiel plafonné à 30s puis arrêt (pattern standard) | Pattern 5 | Reconnexion infinie si le serveur est en maintenance longue — risque faible |
| A3 | Couleurs hex GSD (D-04) choisies pour lisibilité sur `#0d1117` | Code Examples | Couleurs peu lisibles — corrigeable à l'implémentation sans impact fonctionnel |

---

## Open Questions

1. **Anneau positionné au-dessus ou en dessous de la bulle ?**
   - Ce qu'on sait : l'anneau est un `<circle>` SVG frère du cercle principal dans le même `<g.noeud>`.
   - Ce qui est flou : l'ordre de rendu SVG (dernier appended = au-dessus). L'anneau doit être visible → rendu après `.bulle`.
   - Recommandation : appender `.anneau-gsd` après `.bulle` dans la fonction de création de nœud.

2. **Rescan pendant un drag actif : conflit de position ?**
   - Ce qu'on sait : pendant un drag, `d.fx` et `d.fy` sont fixés. `mettreAJourVisuels()` ne relance pas la simulation.
   - Ce qui est flou : si `mettreAJourVisuels()` met à jour le binding `d3.data()`, le nœud en drag conserve-t-il `fx/fy` ?
   - Recommandation : ne pas modifier `fx`/`fy` dans `mettreAJourVisuels()` — seulement les attributs SVG via transition.

---

## Environment Availability

| Dépendance | Requise par | Disponible | Version | Fallback |
|------------|------------|------------|---------|----------|
| `ws` npm | WebSocket serveur | Oui | 8.20.0 | — |
| `chokidar` npm | File watching | Oui | 5.0.0 | — |
| Node.js | Runtime | Oui | (via projet existant) | — |
| `.planning/STATE.md` dans les projets | VIS-05 | Oui (2/25 projets minimum) | — | Anneau tireté gris (D-05) |

**Aucune dépendance bloquante manquante.**

---

## Validation Architecture

### Infrastructure de test

Aucune infrastructure de test existante détectée dans le projet (pas de `tests/`, `test/`, `jest.config.*`, `vitest.config.*`). Ce projet est une application web locale mono-utilisateur sans CI/CD.

### Phase Requirements → Test Map

| Req ID | Comportement | Type de test | Commande | Fichier existant |
|--------|-------------|--------------|----------|-----------------|
| VIS-04 | `calculerRayon(0) === 50`, `calculerRayon(3) === 40`, etc. | Unit (manuel) | `node -e "const s=require('./scanner'); ..."` | Non — Wave 0 |
| VIS-05 | `lireStatutGSD()` retourne le bon statut sur un STATE.md fixture | Unit (manuel) | idem | Non — Wave 0 |
| INT-04 | Modifier un STATE.md → message WS reçu dans ≤ 3s | Smoke (manuel) | Ouvrir browser + modifier fichier + observer | Non — test manuel |

**Smoke test INT-04 :**
```bash
# Terminal 1
node server.js
# Terminal 2 — modifier un STATE.md
echo "" >> /Users/laurent/Documents/CLAUDE_PROJETS/map_project/.planning/STATE.md
# Observer dans le browser : la carte se met à jour sans rechargement
```

### Wave 0 Gaps

- [ ] Aucun test unitaire pour `calculerRayon()` — à ajouter si souhaité, mais non bloquant pour MVP
- [ ] Smoke test INT-04 = vérification manuelle documentée ci-dessus

---

## Security Domain

Phase 2 n'introduit pas d'authentification, pas de données utilisateur, pas de réseau externe. Usage strictement local (`localhost:3000`). Les vecteurs pertinents :

| Catégorie ASVS | Applicable | Contrôle standard |
|----------------|-----------|-------------------|
| V5 Validation des entrées | Oui (partiel) | Le payload WS est généré par le serveur lui-même — pas d'input utilisateur externe |
| V4 Contrôle d'accès | Non | Localhost uniquement, zéro authentification requise |
| V6 Cryptographie | Non | Pas de données sensibles |

**Risque résiduel :** `path traversal` dans `scanner.js` — déjà mitigé Phase 1 par `DOSSIERS_EXCLUS` et la vérification `!filePath.startsWith(PUBLIC_DIR)` dans `server.js`.

---

## Sources

### Primaires (HIGH confidence)

- Context7 `/paulmillr/chokidar` — options watch, ignore, events, awaitWriteFinish
- Context7 `/websockets/ws` — WebSocketServer attaché à http.Server, broadcast, readyState
- Codebase `scanner.js` — structure `ProjectRecord`, `calculerRayon()`, `DOSSIERS_EXCLUS`
- Codebase `public/index.html` — `lancerSimulation()`, pattern `.data().join()`, `CLE_LS`
- `.planning/phases/02-live-data/02-CONTEXT.md` — toutes les décisions D-01 à D-16

### Secondaires (MEDIUM confidence)

- Deux exemples STATE.md inspectés (map_project + PERSO_SaaSHunter) → format frontmatter `status:` confirmé

### Tertiaires (LOW confidence)

- Aucun

---

## Metadata

**Confidence breakdown :**
- Standard stack : HIGH — versions vérifiées dans node_modules
- Architecture : HIGH — patterns extraits de Context7 et du code Phase 1 existant
- Pitfalls : HIGH — issus de CLAUDE.md (expérience Phase 1) + Context7 chokidar
- Palette couleurs : MEDIUM — choix cohérents avec Phase 1, hex non validés utilisateur

**Research date :** 2026-05-11
**Valid until :** 2026-06-10 (dépendances stables, pas de fast-moving ecosystem)
