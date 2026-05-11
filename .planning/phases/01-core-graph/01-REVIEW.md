---
phase: 01-core-graph
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - package.json
  - scanner.js
  - server.js
  - public/index.html
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 01 : Rapport de revue de code

**Revu le :** 2026-05-11
**Profondeur :** standard
**Fichiers analysés :** 4
**Statut :** issues_found

## Résumé

Revue du backend Node.js (scanner.js, server.js) et du frontend D3.js (public/index.html) constituant le MVP de Phase 1. Deux problèmes bloquants identifiés : une faille de sécurité dans la protection path traversal de server.js (comparaison de préfixe de chemin sans séparateur), et une injection de commande potentielle via la variable d'environnement `PORT`. Quatre avertissements couvrent le chemin WORKSPACE codé en dur, un pitfall D3 zoom non résolu, l'absence de retour utilisateur en cas d'erreur réseau, et un crash potentiel sur `event.sourceEvent` nul au drag end.

---

## Problèmes critiques

### CR-01 : Faille path traversal par correspondance de préfixe dans server.js

**Fichier :** `server.js:47`

**Problème :** La protection contre la traversée de répertoires compare le chemin résolu avec `PUBLIC_DIR` via un simple `.startsWith()`. Si `PUBLIC_DIR` vaut `/home/user/map_project/public`, alors un chemin résolu comme `/home/user/map_project/public_evil/secret.txt` passera ce contrôle car la chaîne commence bien par `/home/user/map_project/public`. Un attaquant peut forger une URL `/../public_evil/fichier` : `path.join(PUBLIC_DIR, '/../public_evil/fichier')` donne `/home/user/map_project/public_evil/fichier`, qui satisfait `startsWith(PUBLIC_DIR)`.

Bien que ce soit un outil local, la protection est déclarée dans le code et dans les résumés de plan comme une défense en profondeur (Rule 2). La faille la rend inefficace.

**Correction :**
```javascript
// Ajouter path.sep (ou '/') après PUBLIC_DIR dans la comparaison
const PUBLIC_DIR_NORMALISE = PUBLIC_DIR.endsWith(path.sep)
  ? PUBLIC_DIR
  : PUBLIC_DIR + path.sep;

// Dans le gestionnaire de requête :
const filePath = path.resolve(PUBLIC_DIR, fichierRelatif.replace(/^\//, ''));
if (!filePath.startsWith(PUBLIC_DIR_NORMALISE) && filePath !== PUBLIC_DIR) {
  res.writeHead(403);
  res.end('Accès refusé');
  return;
}
```

---

### CR-02 : Injection de commande via la variable d'environnement PORT dans server.js

**Fichier :** `server.js:70`

**Problème :** La commande shell construite avec `exec()` interpole `PORT` sans validation ni échappement :

```javascript
exec(`open http://localhost:${PORT}`, ...)
```

`PORT` est lu depuis `process.env.PORT` (ligne 11) sans aucune vérification. Un utilisateur peut lancer `PORT="3000; rm -rf ~" node server.js` et la commande transmise au shell sera `open http://localhost:3000; rm -rf ~`. La famille `exec()` de Node.js passe la chaîne à un shell system (`/bin/sh -c`), ce qui permet l'injection de commandes arbitraires.

**Correction :**
```javascript
// Option 1 : valider que PORT est bien un entier avant usage
const PORT = (() => {
  const raw = process.env.PORT || '3000';
  if (!/^\d{1,5}$/.test(raw)) {
    console.error('PORT invalide : doit être un entier entre 1 et 65535');
    process.exit(1);
  }
  return parseInt(raw, 10);
})();

// Option 2 : utiliser execFile pour éviter le shell
const { execFile } = require('child_process');
execFile('open', [`http://localhost:${PORT}`], (err) => {
  if (err) console.error("Impossible d'ouvrir le browser :", err.message);
});
```

---

## Avertissements

### WR-01 : Chemin WORKSPACE codé en dur dans scanner.js

**Fichier :** `scanner.js:7`

**Problème :** `const WORKSPACE = '/Users/laurent/Documents/CLAUDE_PROJETS';` est un chemin absolu spécifique à une machine. Le projet ne fonctionnera pas tel quel sur une autre machine, dans un conteneur Docker, ou si le répertoire home change. Le README et le CLAUDE.md ne mentionnent pas cette contrainte.

**Correction :**
```javascript
// Lire depuis .env ou via une variable d'environnement avec fallback
const WORKSPACE = process.env.WORKSPACE_DIR
  || path.join(require('os').homedir(), 'Documents', 'CLAUDE_PROJETS');
```

---

### WR-02 : Pitfall D3 zoom non résolu dans public/index.html

**Fichier :** `public/index.html:81`

**Problème :** Le CLAUDE.md liste explicitement comme pitfall #2 : « zoom sur `<rect>` de fond, nœuds dans `<g class="viewport">`, `stopPropagation()` sur mousedown des nœuds ». Or le comportement zoom est attaché à l'élément `<svg>` et non au `<rect class="zoom-surface">` :

```javascript
svg.call(zoom);  // ligne 81 — attaché au SVG, pas au rect
```

La conséquence : les événements de zoom sont capturés sur tous les éléments SVG, y compris les nœuds eux-mêmes. Le `stopPropagation` sur mousedown (ligne 188) empêche le drag de déclencher un pan, mais le scroll de molette sur un nœud déclenchera quand même le zoom, ce qui peut surprendre l'utilisateur et contredit l'intention déclarée dans le plan.

**Correction :**
```javascript
// Attacher le zoom au rect de fond, pas au svg
zoomSurface.call(zoom);
// Supprimer : svg.call(zoom);
```

---

### WR-03 : Erreur réseau silencieuse pour l'utilisateur dans public/index.html

**Fichier :** `public/index.html:248`

**Problème :** Le bloc `.catch` se contente de `console.error(...)`. Si le fetch vers `/api/projects` échoue (serveur coupé, timeout, erreur 500), l'utilisateur voit une page noire vide sans message d'erreur. Le div `#etat-vide` n'est affiché que pour un tableau vide (ligne 224), pas pour les erreurs de chargement.

**Correction :**
```javascript
.catch(err => {
  console.error('Impossible de charger les projets :', err.message);
  const etatVide = document.getElementById('etat-vide');
  etatVide.textContent = `Erreur de chargement : ${err.message}`;
  etatVide.style.display = 'block';
});
```

---

### WR-04 : Crash potentiel sur event.sourceEvent nul au drag end

**Fichier :** `public/index.html:205`

**Problème :** Dans le gestionnaire `drag.on('end', ...)`, le code appelle :

```javascript
const noeud = event.sourceEvent.target.closest('.noeud');
```

`event.sourceEvent` peut être `null` dans D3 lorsque le drag se termine par programmation (p. ex. appel à `simulation.stop()` pendant un drag actif, ou perte du pointeur en dehors de la fenêtre sur certains navigateurs). Cela provoquerait `TypeError: Cannot read properties of null (reading 'target')`.

Le même pattern est aussi présent au drag start (ligne 195) mais le risque est moindre (le drag ne peut démarrer sans événement souris).

**Correction :**
```javascript
.on('end', (event, d) => {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
  if (event.sourceEvent) {
    const noeud = event.sourceEvent.target.closest('.noeud');
    if (noeud) d3.select(noeud).classed('dragging', false);
  }
  sauvegarderPositions(nodes);
})
```

---

## Informations

### IN-01 : package.json sans champ engines (version Node requise)

**Fichier :** `package.json`

**Problème :** chokidar v5 requiert Node.js >= 20 (mentionné dans CLAUDE.md). Aucun champ `engines` ne documente cette contrainte dans package.json. Un utilisateur avec Node 18 obtiendra une erreur cryptique à l'installation.

**Correction :**
```json
{
  "engines": {
    "node": ">=20"
  }
}
```

---

### IN-02 : Dimensions SVG figées à l'initialisation

**Fichier :** `public/index.html:53-54`

**Problème :** `LARGEUR` et `HAUTEUR` sont calculés une seule fois via `window.innerWidth / innerHeight` au chargement. Un redimensionnement de la fenêtre ne met pas à jour le SVG ni le centre de force. Sans gestionnaire `resize`, la carte déborde ou laisse un espace vide. Pour un outil local à plein écran c'est un impact limité, mais c'est un comportement incohérent observable.

**Correction :** Ajouter un listener `window.addEventListener('resize', ...)` qui met à jour la taille du SVG et les forces `forceCenter`.

---

_Revu le : 2026-05-11_
_Reviewer : Claude (gsd-code-reviewer)_
_Profondeur : standard_
