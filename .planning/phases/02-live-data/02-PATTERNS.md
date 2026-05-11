# Phase 2 : Live Data — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 4 (1 nouveau, 3 modifiés)
**Analogs found:** 4 / 4 (tous dans la base de code existante)

---

## File Classification

| Fichier nouveau/modifié | Rôle | Data Flow | Analog le plus proche | Qualité |
|-------------------------|------|-----------|----------------------|---------|
| `watcher.js` | service | event-driven | `server.js` (imports Node.js, pattern error handling) | partial-match |
| `scanner.js` | service | batch | `scanner.js` lui-même (modification) | self |
| `server.js` | server/entrypoint | request-response | `server.js` lui-même (modification) | self |
| `public/index.html` | frontend/component | event-driven + request-response | `public/index.html` lui-même (modification) | self |

---

## Pattern Assignments

### `watcher.js` — NOUVEAU (service, event-driven)

**Analog principal :** `server.js` pour les conventions d'imports et error handling.
**Analog secondaire :** pattern complet fourni dans RESEARCH.md (vérifié Context7 chokidar).

**Pattern imports** (copier depuis `server.js` lignes 1-7, adapter) :
```javascript
'use strict';

const chokidar   = require('chokidar');
const WebSocket  = require('ws');
const { scannerWorkspace } = require('./scanner');
```

**Pattern module export** (copier depuis `scanner.js` ligne 128) :
```javascript
module.exports = { demarrerWatcher };
```

**Pattern error handling** (copier depuis `server.js` lignes 28-32, adapter) :
```javascript
// Même structure try/catch que l'API /api/projects
try {
  projets = scannerWorkspace();
} catch (err) {
  console.error('Erreur rescan :', err.message);
  return;
}
```

**Pattern broadcast WebSocket** (RESEARCH.md Pattern 2, lignes 196-201) :
```javascript
const payload = JSON.stringify({ type: 'mise_a_jour', projets });
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(payload);
  }
});
```

**Pattern debounce + chokidar** (RESEARCH.md Pattern 2) :
```javascript
const watcher = chokidar.watch(PATTERNS, {
  ignoreInitial: true,
  persistent: true,
  ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
});

watcher
  .on('add',    () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
  .on('change', () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
  .on('unlink', () => { clearTimeout(timer); timer = setTimeout(rescanEtBroadcast, 500); })
  .on('error',  (err) => console.error('Watcher erreur :', err.message));
```

**Regex `ignored` critique** (RESEARCH.md Pitfall 2) :
```javascript
// Lookahead négatif : exclut .git/ SAUF COMMIT_EDITMSG
ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/
```

---

### `scanner.js` — MODIFIER (service, batch)

**Analog :** `scanner.js` lui-même — extensions à greffer sur la structure existante.

**Pattern `calculerRayon()` existant à remplacer** (`scanner.js` lignes 65-68) :
```javascript
// SUPPRIMER cette fonction entièrement :
function calculerRayon(jours) {
  if (jours === null) return 28;
  return Math.max(28, Math.min(56, 28 + (30 - jours) * 0.8));
}
```

**Nouvelle `calculerRayon()` paliers D-02** (RESEARCH.md Pitfall 5) :
```javascript
// REMPLACER PAR :
function calculerRayon(jours) {
  if (jours === null) return 12;   // sans git (D-03)
  if (jours === 0)   return 50;
  if (jours < 7)     return 40;
  if (jours < 30)    return 30;
  if (jours < 90)    return 20;
  return 12;
}
```

**Pattern `calculerOpacite()` à simplifier** (`scanner.js` lignes 77-82) :
```javascript
// Remplacer par la règle D-01/D-03 :
// opacity 0.4 uniquement si !hasGit — sinon 1.0 (taille encode l'activité)
function calculerOpacite(jours, hasGit) {
  return hasGit ? 1.0 : 0.4;
}
```

**Pattern lecture STATE.md à ajouter** (RESEARCH.md Pattern 3) :
```javascript
// Nouvelle fonction — à ajouter après calculerOpacite()
function lireStatutGSD(cheminProjet) {
  const stateFile = path.join(cheminProjet, '.planning', 'STATE.md');
  try {
    const contenu = fs.readFileSync(stateFile, 'utf8');
    const match = contenu.match(/^status:\s*(.+)$/m);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return null; // pas de STATE.md → anneau tireté (D-05)
  }
}
```

**Pattern `scannerWorkspace()` — ajout champs GSD** (`scanner.js` lignes 88-126, modifier le return) :
```javascript
// Ajouter dans le return de .map() après has_gsd :
has_state:           fs.existsSync(path.join(chemin, '.planning', 'STATE.md')),
phase_gsd:           lireStatutGSD(chemin),
```

**Pattern boucle depth 2 — sous-projets** (`scanner.js` lignes 88-126, à greffer après le .map()) :
```javascript
// Même structure que le scan racine, avec filtre sentinelles (D-14)
// DOSSIERS_EXCLUS s'applique aussi (D-16)
// Chaque sous-projet = même structure ProjectRecord avec id = `${e.name}/${sub.name}`
const sous = fs.readdirSync(chemin, { withFileTypes: true })
  .filter(sub =>
    sub.isDirectory() &&
    !DOSSIERS_EXCLUS.has(sub.name) &&
    !sub.name.startsWith('.') &&
    SENTINELLES.some(s => fs.existsSync(path.join(chemin, sub.name, s.fichier)))
  );
// Pour chaque sous-projet : même pattern gitExec, calculerRayon, return ProjectRecord
// id = `${e.name}/${sub.name}`, nom = `${e.name}/${sub.name}` (D-15)
```

**Pattern `gitExec()` — réutiliser tel quel** (`scanner.js` lignes 25-35) :
```javascript
// NE PAS MODIFIER — wrapper déjà correct, retourne null si pas de repo git
function gitExec(commande, cwd) {
  try {
    return execSync(commande, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}
```

---

### `server.js` — MODIFIER (server/entrypoint, request-response)

**Analog :** `server.js` lui-même — deux points d'insertion ciblés.

**Point d'insertion 1 — imports** (`server.js` lignes 1-8, ligne 9 à remplacer) :
```javascript
// Remplacer le commentaire ligne 9 :
// WebSocket : Phase 2 (watcher.js)
// PAR :
const { WebSocketServer } = require('ws');
const { demarrerWatcher } = require('./watcher');
```

**Point d'insertion 2 — après `server.listen()`** (`server.js` lignes 67-73) :
```javascript
// Copier le pattern existant de server.listen(), ajouter après le callback :
server.listen(PORT, () => {
  console.log(`Serveur démarré : http://localhost:${PORT}`);
  exec(`open http://localhost:${PORT}`, (err) => {
    if (err) console.error('Impossible d\'ouvrir le browser :', err.message);
  });
  // AJOUTER :
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    ws.on('error', console.error);
  });
  demarrerWatcher(wss);
});
```

**Pattern error handling `server.on('error')` — conserver tel quel** (`server.js` lignes 75-84) :
```javascript
// NE PAS MODIFIER — pattern déjà correct
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} déjà utilisé. ...`);
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});
```

---

### `public/index.html` — MODIFIER (frontend/component, event-driven + request-response)

**Analog :** `public/index.html` lui-même — greffes sur la structure D3 existante.

**Pattern CSS dot WS à ajouter** (RESEARCH.md Code Examples, après les styles existants) :
```css
/* Après le style #legende (ligne 74) */
#dot-ws {
  position: fixed;
  bottom: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3fb950;
  transition: background 0.3s ease;
  z-index: 200;
}
```

**Pattern HTML dot WS à ajouter** (après `<div id="tooltip">` ligne 79) :
```html
<div id="dot-ws" title="WebSocket"></div>
```

**Pattern `couleur()` existant — référence palette** (`public/index.html` lignes 125-131) :
```javascript
// Couleurs existantes Phase 1 à conserver pour la bulle principale.
// AJOUTER une fonction couleurGSD() séparée pour l'anneau :
function couleurGSD(phaseGsd) {
  const palette = {
    'in-progress':  '#58a6ff',
    'complete':     '#3fb950',
    'not-started':  '#6e7681',
    'paused':       '#d29922',
    'blocked':      '#f85149',
    'unknown':      '#6e7681',
  };
  return palette[phaseGsd] || '#444d56';
}
```

**Pattern création de nœud — anneau GSD à ajouter** (`public/index.html` lignes 245-300, dans le bloc `enter`) :
```javascript
// Après g.append('circle').attr('class', 'halo') (ligne 249),
// AVANT g.append('circle').attr('class', 'bulle') :
g.append('circle')
  .attr('class', 'anneau-gsd')
  .attr('r', d => d.rayon + 4)
  .attr('fill', 'none')
  .attr('stroke-width', 3)                                 // D-06
  .attr('stroke', d => couleurGSD(d.phase_gsd))
  .attr('stroke-dasharray', d => d.has_state ? null : '5 4'); // D-05
```

**Pattern update D3 sans recréer la simulation** (`public/index.html` lignes 241-301, bloc update) :
```javascript
// Remplacer `update => update` (ligne 299) par :
update => {
  // Transition 400ms sur radius et couleur anneau (D-10)
  update.select('.bulle')
    .transition().duration(400)
    .attr('r', d => d.rayon);
  update.select('.anneau-gsd')
    .transition().duration(400)
    .attr('r', d => d.rayon + 4)
    .attr('stroke', d => couleurGSD(d.phase_gsd))
    .attr('stroke-dasharray', d => d.has_state ? null : '5 4');
  return update;
},
```

**Pattern fusion localStorage — invariant à conserver** (`public/index.html` lignes 344-358) :
```javascript
// CE BLOC DOIT RESTER INCHANGÉ et s'appliquer aussi dans mettreAJourVisuels()
const positionsSauvees = JSON.parse(localStorage.getItem(CLE_LS) || '{}');
projets.forEach((p, i) => {
  if (positionsSauvees[p.id]) {
    p.x = positionsSauvees[p.id].x;
    p.y = positionsSauvees[p.id].y;
  } else {
    const angle = (2 * Math.PI * i) / n;
    p.x = CX + 180 * Math.cos(angle);
    p.y = CY + 180 * Math.sin(angle);
  }
});
// AVANT tout appel D3 (pitfall #3 CLAUDE.md)
```

**Pattern client WebSocket + backoff exponentiel** (RESEARCH.md Pattern 5) :
```javascript
// Ajouter après le bloc fetch('/api/projects').then(...).catch(...)
// Variable partagée — déclarer en haut du <script> :
let delaiReconnect = 1000;
const DELAI_MAX = 30000;

function connecterWS() {
  const ws = new WebSocket(`ws://localhost:${PORT || 3000}`);

  ws.addEventListener('open', () => {
    delaiReconnect = 1000;
    dotWS('vert');
  });

  ws.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.type === 'mise_a_jour') mettreAJourVisuels(msg.projets);
  });

  ws.addEventListener('close', () => {
    if (delaiReconnect > DELAI_MAX) { dotWS('rouge'); return; }
    dotWS('orange');
    setTimeout(() => {
      delaiReconnect = Math.min(delaiReconnect * 2, DELAI_MAX);
      connecterWS();
    }, delaiReconnect);
  });

  ws.addEventListener('error', () => ws.close());
}
```

**Pattern `dotWS()` à ajouter** :
```javascript
function dotWS(etat) {
  const el = document.getElementById('dot-ws');
  const couleurs = { vert: '#3fb950', orange: '#d29922', rouge: '#f85149' };
  el.style.background = couleurs[etat] || '#6e7681';
}
```

**Pattern `mettreAJourVisuels()` — nouvelle fonction** (RESEARCH.md Pattern 4) :
```javascript
// Appelée uniquement depuis le handler WS — NE PAS appeler lancerSimulation()
function mettreAJourVisuels(nodesNouveaux) {
  // 1. Fusionner positions (pitfall #3 — invariant Phase 1)
  const positionsSauvees = JSON.parse(localStorage.getItem(CLE_LS) || '{}');
  nodesNouveaux.forEach(n => {
    if (positionsSauvees[n.id]) {
      n.x = positionsSauvees[n.id].x;
      n.y = positionsSauvees[n.id].y;
    }
    // Ne pas modifier fx/fy (pitfall : drag actif, open question #2)
  });

  // 2. Update pattern D3 — key function obligatoire (pitfall #5 CLAUDE.md)
  viewport.selectAll('g.noeud')
    .data(nodesNouveaux, d => d.id)
    .join(
      enter => creerNoeud(enter),
      update => {
        update.select('.bulle')
          .transition().duration(400)
          .attr('r', d => d.rayon);
        update.select('.anneau-gsd')
          .transition().duration(400)
          .attr('r', d => d.rayon + 4)
          .attr('stroke', d => couleurGSD(d.phase_gsd))
          .attr('stroke-dasharray', d => d.has_state ? null : '5 4');
        return update;
      },
      exit => exit.remove()
    );

  // 3. Recalibrer forceCollide avec les nouveaux rayons (pitfall #6 RESEARCH.md)
  // simulation.force('collision', d3.forceCollide(d => d.rayon + 6).strength(0.9));
  // simulation.alpha(0.1).restart();
}
```

**Note sur le refactor `lancerSimulation()`** : extraire la création de nœud dans une fonction `creerNoeud(enter)` réutilisable par `mettreAJourVisuels()`. Le bloc `enter =>` de `lancerSimulation()` (lignes 245-298) devient le corps de `creerNoeud()`.

---

## Shared Patterns

### Convention `'use strict'` + imports CommonJS
**Source :** `server.js` ligne 1 + `scanner.js` ligne 1
**Appliquer à :** `watcher.js`
```javascript
'use strict';
const X = require('...');
```

### Pattern error handling console.error
**Source :** `server.js` lignes 29-31 et 76-83
**Appliquer à :** `watcher.js` (rescan), `server.js` (connexion WS)
```javascript
try {
  // opération risquée
} catch (err) {
  console.error('Contexte :', err.message);
  return; // ou process.exit(1) selon la sévérité
}
```

### Palette de couleurs Phase 1 (à étendre)
**Source :** `public/index.html` lignes 125-131 (fonction `couleur()`)
**Appliquer à :** nouvelle fonction `couleurGSD()` dans `index.html`

Couleurs existantes Phase 1 :
```javascript
'#3fb950'  // vert  — actif ≤ 7j
'#d29922'  // ambre — récent 8-30j
'#6e7681'  // gris  — inactif / not-started
'#444d56'  // gris foncé — sans git
```
Nouvelles couleurs GSD Phase 2 (cohérentes avec palette existante) :
```javascript
'#58a6ff'  // bleu  — in-progress
'#3fb950'  // vert  — complete (réutilisé)
'#6e7681'  // gris  — not-started (réutilisé)
'#d29922'  // ambre — paused (réutilisé)
'#f85149'  // rouge — blocked
'#444d56'  // gris foncé + dasharray — sans STATE.md (réutilisé)
```

### Key function D3 obligatoire
**Source :** `public/index.html` ligne 242 (`d => d.id`)
**Appliquer à :** tout `.data()` dans `mettreAJourVisuels()`
```javascript
.data(nodes, d => d.id)   // pitfall #5 CLAUDE.md — NE JAMAIS omettre
```

### Fusion localStorage AVANT D3
**Source :** `public/index.html` lignes 344-358
**Appliquer à :** `mettreAJourVisuels()` — même invariant que `lancerSimulation()`
```javascript
// Toujours fusionner positionsSauvees dans les données
// AVANT tout appel viewport.selectAll().data(...)
```

---

## No Analog Found

Aucun fichier sans analog — tous les patterns sont extraits de la base de code existante ou de RESEARCH.md vérifié.

---

## Anti-patterns critiques à éviter

| Anti-pattern | Source | Conséquence |
|--------------|--------|-------------|
| Appeler `lancerSimulation()` depuis handler WS | RESEARCH.md Pitfall 4 | Réinitialise positions, annule drag en cours |
| `.data(nodes)` sans key function | CLAUDE.md Pitfall 5 | Memory leak D3, mauvais binding update |
| `ignored: /\.git/` (sans lookahead) | RESEARCH.md Pitfall 2 | COMMIT_EDITMSG ignoré, INT-04 ne fonctionne pas |
| Fusionner localStorage APRÈS `lancerSimulation()` | CLAUDE.md Pitfall 3 | Bulles sautent à chaque update WS |
| `new WebSocket()` sans fermer l'ancienne | RESEARCH.md Anti-patterns | Deux instances WS coexistent |

---

## Metadata

**Scope de recherche des analogs :** `server.js`, `scanner.js`, `public/index.html`, `package.json`
**Fichiers scannés :** 4
**Date d'extraction des patterns :** 2026-05-11
