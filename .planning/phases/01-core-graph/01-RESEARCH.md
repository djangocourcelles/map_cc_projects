# Phase 1 : Core Graph - Recherche

**Recherché :** 2026-05-11
**Domaine :** Node.js HTTP server + D3.js force simulation + git CLI + localStorage
**Confiance globale :** HIGH

---

## Résumé

Phase 1 livre une application web locale à fichier unique : `node server.js` ouvre le browser, charge les données des projets du workspace via `GET /api/projects`, et affiche une carte D3.js interactive avec bulles draggables, zoom/pan et persistance localStorage. Pas de WebSocket en Phase 1 (Phase 2).

Le workspace `/Users/laurent/Documents/CLAUDE_PROJETS/` contient 26 sous-dossiers dont environ 12 avec un repo git ou des fichiers sentinelles de stack. Le scanner doit traiter **tous les sous-dossiers directs** (sauf `venv` et `node_modules`) pour ne rien masquer à l'utilisateur, en marquant ceux sans données git.

**Recommandation principale :** Utiliser `child_process.exec('open http://...')` pour l'auto-browser (macOS natif, zéro dépendance), et `child_process.execSync` pour les commandes git (synchrone dans le scanner). Le package `open` v11 est ESM-only et incompatible avec un `server.js` en CommonJS.

---

<user_constraints>
## Contraintes utilisateur (depuis CONTEXT.md)

### Décisions verrouillées

- D-01 : Stacks détectées et fichiers sentinelles : Node.js (`package.json`), Python (`requirements.txt` ou `pyproject.toml`), Rust (`Cargo.toml`), Go (`go.mod`), Ruby (`Gemfile`), Java/Kotlin (`pom.xml` ou `build.gradle`).
- D-02 : Multi-stack : afficher **toutes** les stacks détectées (pas d'heuristique de priorité).
- D-03 : Fallback si aucun fichier reconnu : afficher le nom du dossier racine comme label de stack.
- D-04 : Icône de stack : emoji (🐍 Python, 🟢 Node.js, 🦀 Rust, 🐹 Go, 💎 Ruby, ☕ Java/Kotlin). Zéro dépendance externe.
- D-05 : Opacité par paliers discrets : < 7 jours → 1.0 ; 7-30 jours → 0.6 ; > 30 jours → 0.3.
- D-06 : Projet sans repo git → bulle marquée « sans git », pas de données git.
- D-07 : Premier lancement (localStorage vide) : positionnement en cercle centré (rayon 200px). La simulation affine ensuite.
- D-08 : Simulation D3 s'arrête après stabilisation (`alpha < 0.01`, puis `alphaTarget(0).stop()`).
- D-09 : Bulle affiche : nom (pas de troncature), emoji(s) stack, branche git, date relative. La bulle s'adapte au nom.
- D-10 : Rayon bulle variable dès Phase 1 : `rayon = clamp(28, 28 + (30 - jours) * 0.8, 56)`.

### Liberté du planificateur

- Métrique d'activité précise : probablement jours depuis dernier commit (timestamp unix, réutiliser le même `git log`).
- Merge localStorage : moment de fusion choisi par le planificateur. Contrainte : fusionner AVANT de passer à D3 (pitfall #3).
- Champ `has_gsd` dans l'API : optionnel Phase 1 (utile Phase 2). Le planificateur décide.

### Idées différées (HORS SCOPE Phase 1)

- Anneau de couleur par phase GSD → Phase 2 (VIS-05).
- WebSocket / auto-refresh → Phase 2 (INT-04).
- Tooltip au survol → Phase 3 (INT-01).
- Clic → ouvrir VS Code → Phase 3 (INT-02).
- Champ de recherche → Phase 3 (INT-03).
</user_constraints>

---

<phase_requirements>
## Requirements de la phase

| ID | Description | Support de recherche |
|----|-------------|----------------------|
| INFRA-01 | Serveur Node.js scanne `/CLAUDE_PROJETS/` au démarrage et expose `GET /api/projects` | `node:http` + `child_process.execSync` pour git, lecture `fs.readdirSync` |
| INFRA-02 | `node server.js` ouvre le browser automatiquement | `child_process.exec('open http://localhost:PORT')` — macOS natif, zéro dépendance |
| INFRA-03 | Frontend : fichier HTML unique, sans build step, D3 vendorisé localement | `public/index.html` inline + `public/lib/d3.min.js` téléchargé une fois |
| VIS-01 | Tous les projets comme bulles dans un espace 2D (D3.js force simulation) | `d3.forceSimulation` + `forceCenter` + `forceManyBody` + `forceCollide` |
| VIS-02 | Zoom/pan molette + drag canvas | `d3.zoom().scaleExtent([0.2, 4])` sur `<rect class="zoom-surface">` |
| VIS-03 | Drag bulles + sauvegarde positions localStorage | `d3.drag()` + `localStorage.setItem('map_cc_positions', JSON.stringify(...))` |
| DATA-01 | Nom du projet affiché, opacité reflète l'activité | Paliers D-05 : < 7j → 1.0, 7-30j → 0.6, > 30j → 0.3 |
| DATA-02 | Date dernier commit en relatif | `git log -1 --format="%ct"` → timestamp → calcul jours → libellé français |
| DATA-03 | Branche git courante | `git rev-parse --abbrev-ref HEAD` |
| DATA-04 | Détection stack par fichiers sentinelles | `fs.existsSync()` sur chaque fichier sentinelle dans le dossier projet |
</phase_requirements>

---

## Carte de responsabilité architecturale

| Capacité | Tier principal | Tier secondaire | Justification |
|----------|---------------|-----------------|---------------|
| Scan workspace + extraction git | Node.js server (`scanner.js`) | — | `child_process` requis, pas d'accès FS côté browser |
| Exposition données API | Node.js server (`server.js`) | — | `GET /api/projects` → JSON |
| Rendu visuel force graph | Browser (`index.html` D3) | — | DOM manipulation, SVG, événements souris |
| Zoom / pan | Browser (D3 zoom behavior) | — | `d3.zoom` appliqué sur SVG |
| Drag bulles | Browser (D3 drag behavior) | — | `d3.drag` sur les nœuds |
| Persistance positions | Browser (localStorage) | — | Données client, pas besoin de persistence serveur |
| Ouverture browser auto | Node.js server (démarrage) | — | `child_process.exec` au `server.listen` callback |

---

## Stack standard

### Core

| Bibliothèque | Version | Rôle | Justification |
|-------------|---------|------|---------------|
| `d3` | 7.9.0 | Force simulation, zoom, drag, SVG | Standard de fait pour ce type de visualisation [VERIFIED: npm registry] |
| `node:http` | natif Node.js | Serveur HTTP statique + API JSON | Zéro dépendance, Node ≥ 20 suffisant [ASSUMED] |
| `node:fs` | natif Node.js | Lecture dossiers workspace, fichiers sentinelles | — |
| `node:child_process` | natif Node.js | Commandes git + ouverture browser macOS | `execSync` pour git (bloquant OK au démarrage), `exec` pour browser |

### Optionnel Phase 2 (à anticiper dans package.json)

| Bibliothèque | Version | Rôle | Quand |
|-------------|---------|------|-------|
| `ws` | 8.20.0 | WebSocket server | Phase 2 — Live Data [VERIFIED: npm registry] |
| `chokidar` | 5.0.0 | File watching avec debounce | Phase 2 — Live Data [VERIFIED: npm registry] |

### Alternatives écartées

| Option standard | Alternative | Pourquoi écarté |
|----------------|-------------|-----------------|
| `child_process.exec('open ...')` | package `open` v11 | ESM-only : incompatible avec `server.js` CommonJS [VERIFIED: npm view open type = "module"] |
| `open` v8.4.2 (CJS) | — | Viable mais dépendance inutile quand `open` macOS natif existe [VERIFIED: which open → /usr/bin/open] |
| D3 via CDN | D3 vendorisé local | Usage local offline, pas de CDN — décision CLAUDE.md |

### Installation

```bash
# Phase 1 uniquement
npm init -y
npm install d3

# Télécharger D3 UMD (pour vendorisation dans public/lib/)
mkdir -p public/lib
curl -L https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js -o public/lib/d3.min.js

# Préparer Phase 2 (optionnel dès maintenant)
npm install ws chokidar
```

### Versions vérifiées

| Package | Version actuelle | Date npm view |
|---------|-----------------|---------------|
| d3 | 7.9.0 | 2026-05-11 |
| ws | 8.20.0 | 2026-05-11 |
| chokidar | 5.0.0 | 2026-05-11 |

[VERIFIED: npm registry]

---

## Patterns d'architecture

### Diagramme de flux système

```
node server.js
      │
      ├─► scanner.js
      │     └─► fs.readdirSync(WORKSPACE_ROOT)
      │           └─► pour chaque dossier:
      │                 ├─► détection stack (fs.existsSync sentinelles)
      │                 ├─► git branch (execSync: git rev-parse)
      │                 └─► git last commit (execSync: git log -1 --format="%ct")
      │
      ├─► http.createServer()
      │     ├─► GET /api/projects → JSON (ProjectRecord[])
      │     └─► GET /* → static files (public/)
      │
      └─► server.listen(3000, cb)
            └─► child_process.exec('open http://localhost:3000')


Browser (index.html)
      │
      ├─► fetch('/api/projects')
      │     └─► données JSON → fusion localStorage (AVANT D3)
      │
      ├─► d3.forceSimulation(nodes)
      │     ├─► forceCenter(w/2, h/2)
      │     ├─► forceManyBody().strength(-120)
      │     ├─► forceCollide(d => d.r + 8)
      │     └─► on('tick', updatePositions)
      │
      ├─► d3.zoom().scaleExtent([0.2, 4]) → <rect class="zoom-surface">
      │     └─► on('zoom', e => viewport.attr('transform', e.transform))
      │
      └─► d3.drag() → chaque nœud
            ├─► dragstart: alphaTarget(0.3).restart() + fx=x, fy=y
            ├─► drag: fx=event.x, fy=event.y
            └─► dragend: alphaTarget(0) + fx=null, fy=null + localStorage.save()
```

### Structure de fichiers cible

```
map_project/
├── server.js          # HTTP + route /api/projects + ouverture browser
├── scanner.js         # Scan workspace → ProjectRecord[]
├── package.json       # Dépendances (d3, ws, chokidar)
├── public/
│   ├── index.html     # Frontend complet (HTML + CSS + JS inline)
│   └── lib/
│       └── d3.min.js  # D3 v7.9.0 vendorisé (UMD build)
└── .planning/
```

### Pattern 1 : Serveur HTTP statique + API JSON

```javascript
// server.js — Source: node:http natif [ASSUMED: pattern standard Node.js]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { scannerWorkspace } = require('./scanner');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  // Route API
  if (req.url === '/api/projects') {
    const projets = scannerWorkspace();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(projets));
    return;
  }

  // Fichiers statiques
  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Non trouvé'); return; }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  // Ouverture browser macOS natif — zéro dépendance
  require('child_process').exec(`open http://localhost:${PORT}`);
});
```

### Pattern 2 : Scanner — extraction git et détection stack

```javascript
// scanner.js [ASSUMED: pattern standard child_process + fs]
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/Users/laurent/Documents/CLAUDE_PROJETS';
const DOSSIERS_EXCLUS = new Set(['venv', 'node_modules', '.git', 'dist']);

const SENTINELLES = [
  { fichier: 'package.json',      stack: 'Node.js',   emoji: '🟢' },
  { fichier: 'requirements.txt',  stack: 'Python',    emoji: '🐍' },
  { fichier: 'pyproject.toml',    stack: 'Python',    emoji: '🐍' },
  { fichier: 'Cargo.toml',        stack: 'Rust',      emoji: '🦀' },
  { fichier: 'go.mod',            stack: 'Go',        emoji: '🐹' },
  { fichier: 'Gemfile',           stack: 'Ruby',      emoji: '💎' },
  { fichier: 'pom.xml',           stack: 'Java',      emoji: '☕' },
  { fichier: 'build.gradle',      stack: 'Java',      emoji: '☕' },
];

function gitExec(commande, cwd) {
  try {
    return execSync(commande, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function calculerJours(timestampUnix) {
  if (!timestampUnix) return null;
  return Math.floor((Date.now() / 1000 - parseInt(timestampUnix)) / 86400);
}

function joursEnTexte(jours) {
  if (jours === null) return 'commit inconnu';
  if (jours === 0)   return "aujourd'hui";
  if (jours === 1)   return 'il y a 1 jour';
  if (jours < 30)    return `il y a ${jours} jours`;
  if (jours < 365)   return `il y a ${Math.floor(jours / 30)} mois`;
  return `il y a ${Math.floor(jours / 365)} an(s)`;
}

function scannerWorkspace() {
  return fs.readdirSync(WORKSPACE, { withFileTypes: true })
    .filter(e => e.isDirectory() && !DOSSIERS_EXCLUS.has(e.name) && !e.name.startsWith('.'))
    .map(e => {
      const chemin = path.join(WORKSPACE, e.name);
      const hasGit = fs.existsSync(path.join(chemin, '.git'));

      // Détection stack (multi-stack possible)
      const stacks = SENTINELLES
        .filter(s => fs.existsSync(path.join(chemin, s.fichier)))
        // Déduplication : même stack détectée par plusieurs fichiers
        .filter((s, i, arr) => arr.findIndex(x => x.stack === s.stack) === i);

      const branch = hasGit ? gitExec('git rev-parse --abbrev-ref HEAD', chemin) : null;
      const timestamp = hasGit ? gitExec('git log -1 --format="%ct"', chemin) : null;
      const jours = calculerJours(timestamp);

      // Calcul rayon (D-10) : clamp(28, 28 + (30 - jours) * 0.8, 56)
      const rayon = jours !== null ? Math.max(28, Math.min(56, 28 + (30 - jours) * 0.8)) : 28;

      // Calcul opacité (D-05)
      let opacite = 0.4; // sans git
      if (jours !== null) {
        if (jours < 7)  opacite = 1.0;
        else if (jours <= 30) opacite = 0.6;
        else opacite = 0.3;
      }

      return {
        id: e.name,
        nom: e.name,
        chemin,
        has_git: hasGit,
        stacks: stacks.length > 0 ? stacks : [{ stack: e.name, emoji: null }], // D-03 fallback
        branche: branch || (hasGit ? 'branche inconnue' : null),
        jours_depuis_commit: jours,
        date_relative: joursEnTexte(jours),
        rayon,
        opacite,
        has_gsd: fs.existsSync(path.join(chemin, '.planning')),
      };
    });
}

module.exports = { scannerWorkspace };
```

### Pattern 3 : D3.js — force simulation complète avec zoom/drag

```javascript
// Source: Context7 /d3/d3 — docs officielles D3 v7 [VERIFIED: Context7]
// Squelette frontend (dans index.html, balise <script>)

const WIDTH  = window.innerWidth;
const HEIGHT = window.innerHeight;

const svg = d3.select('#carte')
  .append('svg')
  .attr('width', WIDTH)
  .attr('height', HEIGHT);

// Surface de zoom (piège pitfall #2 : zoom sur rect de fond, pas sur les nœuds)
const zoomSurface = svg.append('rect')
  .attr('class', 'zoom-surface')
  .attr('width', WIDTH)
  .attr('height', HEIGHT)
  .attr('fill', 'transparent')
  .style('pointer-events', 'all');

// Conteneur des nœuds (transformé par le zoom)
const viewport = svg.append('g').attr('class', 'viewport');

// === Comportement zoom ===
const zoom = d3.zoom()
  .scaleExtent([0.2, 4])
  .on('zoom', (event) => {
    viewport.attr('transform', event.transform);
  });

svg.call(zoom);

// === Chargement données + merge localStorage (pitfall #3 : AVANT D3) ===
fetch('/api/projects')
  .then(r => r.json())
  .then(projets => {
    const positionsSauvees = JSON.parse(localStorage.getItem('map_cc_positions') || '{}');

    // Layout initial en cercle centré (D-07)
    const n = projets.length;
    const rayonCercle = 200;
    projets.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / n;
      // Fusionner positions sauvegardées — pitfall #3
      p.x = positionsSauvees[p.id]?.x ?? WIDTH / 2 + rayonCercle * Math.cos(angle);
      p.y = positionsSauvees[p.id]?.y ?? HEIGHT / 2 + rayonCercle * Math.sin(angle);
    });

    lancerSimulation(projets);
  })
  .catch(err => console.error('Impossible de charger les projets :', err.message));

function sauvegarderPositions(nodes) {
  const positions = {};
  nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y }; });
  localStorage.setItem('map_cc_positions', JSON.stringify(positions));
}

function lancerSimulation(nodes) {
  // === Simulation D3 (pitfall #4 : stop après stabilisation) ===
  const simulation = d3.forceSimulation(nodes)
    .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .force('repulsion', d3.forceManyBody().strength(-120))
    .force('collision', d3.forceCollide(d => d.rayon + 8))
    .alphaDecay(0.05)
    .on('tick', mettreAJour)
    .on('end', () => {
      // Pitfall #4 : arrêter après stabilisation
      simulation.alphaTarget(0).stop();
      sauvegarderPositions(nodes);
    });

  // === Rendu nœuds (pitfall #5 : key function pour éviter memory leak) ===
  const noeuds = viewport.selectAll('g.noeud')
    .data(nodes, d => d.id)  // key function obligatoire
    .join(
      enter => {
        const g = enter.append('g').attr('class', 'noeud');

        // Bulle principale
        g.append('circle')
          .attr('r', d => d.rayon)
          .attr('fill', '#161b22')
          .attr('stroke', d => couleurStroke(d))
          .attr('stroke-width', d => largeurStroke(d))
          .attr('stroke-dasharray', d => d.has_git ? null : '4 2')
          .attr('opacity', d => d.opacite);

        // Emoji(s) stack
        g.append('text')
          .attr('class', 'emoji-stack')
          .attr('text-anchor', 'middle')
          .attr('dy', d => d.rayon > 40 ? '-18px' : '-14px')
          .attr('font-size', '14px')
          .text(d => d.has_git === false && d.stacks[0].emoji === null
            ? ''
            : d.stacks.map(s => s.emoji || '').join(' '));

        // Nom du projet
        g.append('text')
          .attr('class', 'nom-projet')
          .attr('text-anchor', 'middle')
          .attr('dy', '4px')
          .attr('font-size', '13px')
          .attr('font-weight', '600')
          .attr('fill', '#c9d1d9')
          .attr('opacity', d => d.opacite)
          .text(d => d.nom);

        // Meta : branche + date
        g.append('text')
          .attr('class', 'meta-projet')
          .attr('text-anchor', 'middle')
          .attr('dy', '18px')
          .attr('font-size', '11px')
          .attr('font-family', 'monospace')
          .attr('fill', '#8b949e')
          .attr('opacity', d => d.opacite)
          .text(d => d.has_git ? `${d.branche} · ${d.date_relative}` : 'sans git');

        return g;
      },
      update => update,
      exit => exit.remove()  // pitfall #5
    );

  // === Drag (pitfall #2 : stopPropagation sur mousedown) ===
  noeuds.on('mousedown', event => event.stopPropagation())
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // pitfall #4
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0); // pitfall #4
        d.fx = null;
        d.fy = null;
        sauvegarderPositions(nodes);
      })
    );

  function mettreAJour() {
    noeuds.attr('transform', d => `translate(${d.x},${d.y})`);
  }
}

function couleurStroke(d) {
  if (!d.has_git) return '#6e7681';
  if (d.jours_depuis_commit < 7)  return '#58a6ff';
  if (d.jours_depuis_commit <= 30) return '#484f58';
  return '#30363d';
}

function largeurStroke(d) {
  if (!d.has_git) return 1;
  if (d.jours_depuis_commit < 7)  return 2;
  if (d.jours_depuis_commit <= 30) return 1.5;
  return 1;
}
```

### Anti-patterns à éviter

- **Zoom appliqué directement sur les nœuds SVG** : le zoom doit être sur `<rect class="zoom-surface">` et les nœuds dans `<g class="viewport">`. Sans cela, molette et drag canvas entrent en conflit avec le drag des bulles.
- **Positions localStorage écrasées par les nouvelles données serveur** : toujours fusionner localStorage dans les données *avant* de créer la simulation D3. Si on applique localStorage après, D3 a déjà calculé des positions initiales.
- **Simulation qui ne s'arrête jamais** : sans `alphaDecay` suffisant ni `simulation.stop()`, la simulation tourne à l'infini et consomme CPU. Utiliser `on('end', ...)` pour stopper.
- **`.data(nodes)` sans key function** : D3 réutilise les nœuds DOM par index. Quand les données changent (Phase 2), les nœuds sont mal réassignés. Toujours `.data(nodes, d => d.id)`.
- **`open` v11 dans un fichier CJS** : `open` v11 est ESM-only (`"type": "module"` dans son package.json). Un `require('open')` échoue silencieusement ou avec une erreur cryptique. Utiliser `child_process.exec('open http://...')` à la place.

---

## Ce qu'il ne faut pas construire

| Problème | Ne pas construire | Utiliser à la place | Raison |
|----------|-------------------|---------------------|--------|
| Calcul de date relative | Fonction maison complexe | Calcul simple en jours depuis timestamp unix | Pas besoin d'une bibliothèque (pas de i18n, textes hardcodés en français) |
| Serveur de fichiers statiques | Framework Express | `node:http` + `fs.readFile` | Zéro dépendance, suffisant pour Phase 1 |
| Détection de stack avancée | Analyse AST, lecture `package.json` | `fs.existsSync` sur fichiers sentinelles | Simple, rapide, décision D-01 verrouillée |
| Force graph sur canvas | Custom rendering | D3 force simulation + SVG | D3 gère zoom, drag, tick — réinventer prend 10x plus de temps |

---

## Pièges courants

### Piège 1 : EMFILE macOS (Phase 2 à anticiper, architecture Phase 1 doit le permettre)

**Ce qui se passe :** macOS limite les descripteurs de fichiers ouverts simultanément. Si chokidar surveille trop de dossiers (Phase 2), on obtient `Error: EMFILE: too many open files`.

**Pourquoi :** chokidar ouvre un descripteur par dossier surveillé. Le workspace contient 26+ dossiers avec des `node_modules` potentiellement imbriqués.

**Comment éviter :** en Phase 2, configurer chokidar avec `ignored: /(node_modules|\.git|dist|venv)/, depth: 2`. En Phase 1, le scanner lit les dossiers une fois au démarrage sans watcher — pas de risque EMFILE.

**Signaux d'alerte :** erreur `EMFILE` ou `ENFILE` dans les logs Node.js au démarrage de chokidar.

---

### Piège 2 : Conflit zoom canvas / drag bulles

**Ce qui se passe :** sans `stopPropagation()` sur `mousedown` des nœuds, un drag de bulle déclenche aussi le pan du canvas. La bulle et la vue se déplacent en même temps.

**Pourquoi :** D3 zoom intercepte tous les événements pointer sur l'élément SVG racine. Les nœuds sont des enfants de `<g class="viewport">` qui est lui-même enfant du SVG.

**Comment éviter :**
```javascript
noeuds.on('mousedown', event => event.stopPropagation());
```

**Signaux d'alerte :** le canvas se déplace involontairement quand on drag une bulle.

---

### Piège 3 : Positions localStorage écrasées

**Ce qui se passe :** si on charge les données via `fetch('/api/projects')`, puis qu'on crée la simulation D3 avec ces données brutes, puis qu'on essaie d'appliquer localStorage après, D3 a déjà calculé `x` et `y` initiaux. La fusion est trop tardive.

**Pourquoi :** `forceSimulation` initialise `x` et `y` de chaque nœud au moment de sa création si ces propriétés n'existent pas encore.

**Comment éviter :** fusionner `positionsSauvees[p.id]` dans chaque objet `p` *avant* de passer `projets` à `forceSimulation`. Voir Pattern 3 ci-dessus.

**Signaux d'alerte :** les positions ne sont pas restaurées au rechargement même si localStorage contient des données.

---

### Piège 4 : Simulation instable / CPU à 100%

**Ce qui se passe :** sans `alphaDecay` approprié ou sans écouter `on('end')`, la simulation tourne indéfiniment à faible alpha sans jamais s'arrêter formellement.

**Comment éviter :**
- `alphaDecay(0.05)` (valeur par défaut 0.0228 — augmenter accélère la stabilisation)
- `on('end', () => simulation.alphaTarget(0).stop())`
- Au `dragstart` : `simulation.alphaTarget(0.3).restart()` pour réactiver
- Au `dragend` : `simulation.alphaTarget(0)` (sans `.stop()` — laisser décroître naturellement)

**Signaux d'alerte :** processus Node.js à 100% CPU après chargement, ventilateur qui s'emballe.

---

### Piège 5 : Memory leak D3 sans key function

**Ce qui se passe :** `.data(nodes)` sans key function associe les données par index. En Phase 2, quand les données sont mises à jour via WebSocket, les anciens nœuds DOM ne sont pas retirés correctement.

**Comment éviter :** toujours `.data(nodes, d => d.id)`. Ajouter `.exit().remove()` dans le pattern join (ou utiliser `.join(enter, update, exit)`).

---

### Piège 6 : Dossiers non-projet dans le workspace

**Ce qui se passe :** le workspace contient 26 entrées dont des fichiers PDF, un dossier `venv`, des archives `.zip`, etc. Un `fs.readdirSync` naïf inclut tout.

**Comment éviter :** filtrer avec `e.isDirectory()` (exclut les fichiers) + exclusion des noms connus (`venv`, `node_modules`) + exclusion des noms commençant par `.`.

**Signaux d'alerte :** bulle `venv` ou bulle `20250332_DQE masqué.xls` apparaissant sur la carte.

---

## Contexte runtime

Le workspace `/Users/laurent/Documents/CLAUDE_PROJETS/` contient actuellement :

| Dossier | Git | Stack détectée | Notes |
|---------|-----|---------------|-------|
| `Projet_BotAVV` | oui | 🟢 Node.js + 🐍 Python | Multi-stack (package.json + requirements.txt) |
| `map_project` | oui | (aucune) | Le projet lui-même, pas de package.json encore |
| `PERSO_SaaSHunter` | oui | (à vérifier) | — |
| `SCC_Showroom3D` | oui | (à vérifier) | — |
| `SCC-ao-av-assistant` | oui | (à vérifier) | — |
| `SCC_ProjectATC_France` | oui | (aucune) | — |
| `PERSO_Book_CC` | oui | (aucune) | — |
| ~18 autres dossiers | non | variable | Mixte : docs, archives, dossiers métier |

[VERIFIED: ls /Users/laurent/Documents/CLAUDE_PROJETS/ + git check 2026-05-11]

**Cas particulier `map_project` :** le projet lui-même n'a pas encore de `package.json`. Après `npm init`, il sera détecté comme 🟢 Node.js. La bulle `map_project` apparaîtra sur la carte (le projet se cartographie lui-même).

---

## État de l'art

| Ancienne approche | Approche actuelle | Changé | Impact |
|-------------------|-------------------|--------|--------|
| `d3.event` global | `event` en paramètre callback | D3 v6 | Les callbacks drag/zoom reçoivent `(event, d)` — pas de `d3.event` |
| `selection.enter().append()` seul | `.join(enter, update, exit)` | D3 v5+ | Gestion plus propre du cycle de vie des éléments |
| `d3.drag().container()` obligatoire | Optionnel | D3 v5 | Simplifie la configuration |
| `simulation.drag()` | `d3.drag()` séparé | D3 v4 | Force drag et behavior drag découplés |

**Déprécié :**
- `d3.event` : supprimé en D3 v6. Tout callback reçoit maintenant `(event, datum)` en paramètres.
- `.enter().append().merge()` : encore fonctionnel mais `.join()` est l'idiome moderne.

[VERIFIED: Context7 /d3/d3, docs officielles D3 v7]

---

## Périmètre MVP Phase 1

| Fonctionnalité | Phase 1 | Phase 2 | Phase 3 |
|---------------|---------|---------|---------|
| Serveur HTTP + API JSON | ✓ | — | — |
| Scanner workspace au démarrage | ✓ | — | — |
| Ouverture browser automatique | ✓ | — | — |
| Carte D3 force simulation | ✓ | — | — |
| Zoom / pan | ✓ | — | — |
| Drag bulles + localStorage | ✓ | — | — |
| Opacité par activité | ✓ | — | — |
| Rayon variable | ✓ | — | — |
| Détection stack + emojis | ✓ | — | — |
| Branche git + date relative | ✓ | — | — |
| WebSocket / auto-refresh | — | ✓ | — |
| Taille bulle formelle (VIS-04) | — | ✓ | — |
| Anneau phase GSD (VIS-05) | — | ✓ | — |
| Tooltip au survol | — | — | ✓ |
| Clic → VS Code | — | — | ✓ |
| Filtrage par nom | — | — | ✓ |

**Note :** `watcher.js` (chokidar) n'est pas créé en Phase 1. `server.js` n'instancie pas de WebSocket server. La structure de fichiers doit permettre d'ajouter `watcher.js` en Phase 2 sans refactoring de `server.js`.

---

## Disponibilité de l'environnement

| Dépendance | Requis par | Disponible | Version | Fallback |
|-----------|-----------|-----------|---------|---------|
| Node.js | Serveur + scanner | ✓ | v24.14.0 | — |
| npm | Installation dépendances | ✓ | 11.9.0 | — |
| `git` CLI | DATA-02, DATA-03 | ✓ | (système) | Marquage « sans git » |
| `open` macOS natif | INFRA-02 | ✓ | /usr/bin/open | `child_process.exec` de remplacement (déjà utilisé) |
| D3 v7 UMD (CDN pour vendorisation) | INFRA-03 | ✓ à télécharger | 7.9.0 | — |

[VERIFIED: node --version, npm --version, which open — 2026-05-11]

**Node ≥ 20 requis** : chokidar v5 (Phase 2) exige Node ≥ 20. Node v24.14.0 satisfait cette contrainte.

---

## Architecture de validation

Le projet n'a pas encore d'infrastructure de tests. Phase 1 étant un MVP, la validation est manuelle :

| Critère de succès | Test | Type |
|-------------------|------|------|
| `node server.js` ouvre le browser | Lancement manuel, observer browser | Manuel |
| Toutes les bulles apparaissent | Compter bulles vs dossiers workspace | Manuel |
| Zoom / pan fonctionne | Molette + drag sur fond | Manuel |
| Drag bulle + restoration | Drag, recharger, vérifier position | Manuel |
| Données git correctes | Comparer avec `git log` direct | Manuel |
| Projet sans git marqué « sans git » | Vérifier les dossiers sans `.git` | Manuel |
| Multi-stack affiché | Vérifier `Projet_BotAVV` (🟢🐍) | Manuel |

---

## Contraintes du projet (depuis CLAUDE.md)

- Tout le code, les commentaires et les messages de commit en **français**.
- Pas de framework JS côté client (pas de React, Vue, etc.).
- Pas de build step (pas de Webpack, Vite, Rollup, etc.).
- D3 vendorisé localement dans `public/lib/d3.min.js` (pas de CDN à l'exécution).
- Respect des 5 pitfalls documentés dans CLAUDE.md (voir section Pièges courants).
- Typographie française : guillemets « » avec espaces insécables, tiret cadratin interdit.
- Accents obligatoires sur les majuscules.

---

## Journal des hypothèses

| # | Affirmation | Section | Risque si faux |
|---|-------------|---------|----------------|
| A1 | `node:http` + `fs.readFile` suffisent pour un serveur statique sans framework | Standard Stack | Faible : pattern bien établi |
| A2 | `child_process.execSync` pour git est assez rapide (< 100ms par projet) | Scanner | Si le workspace grandit à 50+ projets, le démarrage pourrait prendre 5+ secondes. Envisager Promise.all avec `exec` asynchrone |
| A3 | Tous les sous-dossiers directs de `/CLAUDE_PROJETS/` doivent être scannés (pas seulement ceux avec git) | Scanner | Moyen : l'utilisateur pourrait vouloir exclure certains dossiers. Configurable via variable d'env si besoin |
| A4 | Le scanner s'exécute en synchrone au démarrage du serveur (avant le premier `listen`) | Architecture | Faible : si le scan prend trop longtemps, faire un scan asynchrone + réponse 503 en attendant |

---

## Questions ouvertes

1. **Filtrage du workspace : tous les dossiers ou seulement projets avec git/sentinel ?**
   - Ce qu'on sait : le workspace contient 26 dossiers, dont des archives et des docs métier sans code.
   - Ce qui est flou : l'utilisateur veut-il voir `SCC_MemoireTech_v1` (aucun code, aucun git) sur la carte ?
   - Recommandation : inclure tous les sous-dossiers (décision D-06 gère « sans git »), mais filtrer `venv` et `node_modules`. L'utilisateur peut ajuster en Phase 3.

2. **Scan synchrone vs asynchrone**
   - Ce qu'on sait : 26 dossiers × 2 commandes git = 52 `execSync`. Sur macOS avec SSD, ~5-20ms par commande git.
   - Ce qui est flou : durée totale au démarrage (estimé 1-2 secondes, acceptable pour un MVP).
   - Recommandation : synchrone en Phase 1 (simplicité), paralléliser en Phase 2 si besoin.

---

## Sources

### Primaires (confiance HIGH)
- Context7 `/d3/d3` — force simulation, zoom, drag, join pattern [VERIFIED]
- `npm view d3 version` → 7.9.0 [VERIFIED: 2026-05-11]
- `npm view ws version` → 8.20.0 [VERIFIED: 2026-05-11]
- `npm view chokidar version` → 5.0.0 [VERIFIED: 2026-05-11]
- `npm view open type` → "module" (ESM-only) [VERIFIED: 2026-05-11]
- `which open` → /usr/bin/open [VERIFIED: 2026-05-11]
- `node --version` → v24.14.0 [VERIFIED: 2026-05-11]
- `ls /Users/laurent/Documents/CLAUDE_PROJETS/` — 26 dossiers recensés [VERIFIED: 2026-05-11]
- Tests git sur Projet_BotAVV : `git rev-parse`, `git log -1 --format="%ct"` [VERIFIED: 2026-05-11]

### Secondaires (confiance MEDIUM)
- Docs D3 v7 force simulation — pattern `dragstarted`/`dragged`/`dragended` avec `fx`/`fy` [CITED: Context7 /d3/d3]
- Pattern zoom sur `<rect>` de fond + `<g class="viewport">` [CITED: CLAUDE.md pitfall #2]

### Tertiaires (confiance LOW)
- Durée estimée scan synchrone (1-2 secondes pour 26 dossiers) [ASSUMED]

---

## Métadonnées

**Répartition de la confiance :**
- Stack standard : HIGH — toutes les versions vérifiées via npm registry
- Architecture : HIGH — patterns D3 vérifiés via Context7, pitfalls documentés dans CLAUDE.md
- Pièges : HIGH — 4/5 pitfalls vérifiés ou documentés officiellement, 1 estimé (durée scan)

**Date de recherche :** 2026-05-11
**Valable jusqu'au :** 2026-06-11 (stable — D3 v7 et Node.js natif évoluent peu)

---

## RESEARCH COMPLETE
