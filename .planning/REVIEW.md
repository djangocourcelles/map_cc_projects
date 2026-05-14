# Code Review — Map CC Projects

**Date :** 2026-05-14
**Profondeur :** standard (analyse par fichier, vérifications spécifiques Node.js/JS)
**Fichiers examinés :** 4
**Statut :** issues_found

---

## Fichiers examinés

- `server.js`
- `scanner.js`
- `watcher.js`
- `public/index.html`

---

## Problèmes critiques (🔴)

### CR-01 : Injection de commande via le paramètre `path` — `server.js:49`

**Fichier :** `server.js`, ligne 49
**Problème :** Le chemin reçu en query string est injecté directement dans un appel shell via des guillemets doubles : `` `code "${chemin}"` ``. La validation à la ligne 46 vérifie que le chemin *commence par* le préfixe autorisé, mais n'empêche pas un attaquant (ou une page ouverte dans le navigateur) d'injecter des caractères shell à l'intérieur de la valeur. Un chemin tel que `/Users/laurent/Documents/CLAUDE_PROJETS/foo"; rm -rf ~; echo "` passerait la validation et exécuterait des commandes arbitraires.

**Correction :** Passer le chemin comme argument positionnel via `execFile` (jamais interpolé dans un shell) :

```js
const { execFile } = require('child_process');

// Remplacer la ligne 49 :
execFile('code', [chemin], err => {
  if (err) console.error('[open] Erreur VS Code :', err.message);
});
```

`execFile` n'invoque pas de shell ; le chemin est transmis tel quel en argument, guillemets et métacaractères compris.

---

### CR-02 : `client.send()` sans gestion d'erreur — crash potentiel du process — `watcher.js:46`

**Fichier :** `watcher.js`, ligne 44-48
**Problème :** `client.send(payload)` peut lever une exception synchrone si le socket se ferme entre le test `readyState === WebSocket.OPEN` et l'appel effectif (race condition). L'exception non capturée remonte jusqu'au process Node.js et le tue.

```js
// Code actuel
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(payload);   // peut lever
  }
});
```

**Correction :**

```js
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(payload, err => {
      if (err) console.error('[watcher] Erreur envoi WS :', err.message);
    });
  }
});
```

La signature `send(data, callback)` de `ws` garantit que toute erreur est transmise au callback et ne propage pas d'exception.

---

## Avertissements (🟡)

### WR-01 : `WORKSPACE` en dur dans deux fichiers — couplage fragile

**Fichiers :** `scanner.js:7`, `watcher.js:7`
**Problème :** La constante `'/Users/laurent/Documents/CLAUDE_PROJETS'` est dupliquée à l'identique dans les deux modules. Un déplacement du workspace ou une exécution depuis une autre machine nécessite deux modifications, avec risque de désynchronisation. La valeur n'est pas configurable sans toucher le code.

**Correction :** Lire depuis `process.env.WORKSPACE` avec fallback, dans un module partagé ou dans `config.js` :

```js
// En tête de scanner.js et watcher.js
const WORKSPACE = process.env.WORKSPACE
  || '/Users/laurent/Documents/CLAUDE_PROJETS';
```

---

### WR-02 : La simulation D3 n'est pas arrêtée avant `mettreAJourVisuels` — fuite de tick

**Fichier :** `public/index.html`, ligne 505-575
**Problème :** `mettreAJourVisuels` est appelé à chaque message WebSocket. Elle appelle `simulation.alpha(0.1).restart()` (ligne 571), mais si la simulation précédente est encore en train de `tick`, les deux instances tournent simultanément et accumulent des `requestAnimationFrame` inutiles. La variable `simulation` est globale et ne peut pas tenir deux états à la fois ; les noeuds partagent les données de position, ce qui peut provoquer des sauts visuels.

**Correction :** Stopper la simulation avant de la relancer :

```js
if (simulation) {
  simulation.stop();  // arrêter les ticks en cours
  simulation.force('collision', d3.forceCollide(d => d.rayon + 6).strength(0.9))
    .alpha(0.1).restart();
}
```

---

### WR-03 : `lancerSimulation` empile des anneaux guides à chaque appel — `public/index.html:447`

**Fichier :** `public/index.html`, ligne 447 et 350-374
**Problème :** `lancerSimulation` appelle `dessinerAnneaux()` en tête. Si `lancerSimulation` est rappelée (ce qui ne se produit pas aujourd'hui mais rien ne l'interdit), un nouveau groupe `.anneaux` est ajouté par-dessus l'existant. En l'état actuel, `lancerSimulation` n'est appelée qu'une fois via le chargement initial, mais le risque reste si le code évolue.

**Correction :** Ajouter une garde dans `dessinerAnneaux` :

```js
function dessinerAnneaux() {
  if (viewport.select('.anneaux').size() > 0) return;  // déjà dessinés
  // ...
}
```

---

### WR-04 : `execSync` bloquant dans `gitExec` — boucle d'événements bloquée

**Fichier :** `scanner.js:30-38`
**Problème :** `gitExec` utilise `execSync`, qui bloque la boucle d'événements Node.js pendant l'exécution de chaque commande git. `construireRecord` en invoque jusqu'à trois par projet (branche, timestamp, message de commit). Pour un workspace de 20 projets avec 2 sous-projets chacun, cela représente jusqu'à 60 appels `execSync` séquentiels à chaque requête `/api/projects`. Le cache TTL 30 s atténue le problème, mais pas lors de l'invalidation par le watcher.

**Note :** Ce point touche la performance (hors scope v1 strict), mais c'est aussi un problème de qualité : un outil local qui gèle le serveur pendant plusieurs secondes à chaque rechargement est fonctionnellement dégradé. Le cache invalide + rescan synchrone dans `rescanEtBroadcast` (watcher.js:35-38) constitue le chemin critique.

**Correction minimale :** Conserver le cache et ne pas l'invalider systématiquement, ou n'invalider que les entrées affectées par le fichier modifié détecté par chokidar.

---

### WR-05 : `JSON.parse` sur `localStorage` sans validation du schéma — `public/index.html:507` et `590`

**Fichier :** `public/index.html`, lignes 507 et 590
**Problème :** `JSON.parse(localStorage.getItem(CLE_LS) || '{}')` peut retourner n'importe quelle valeur JSON valide (tableau, string, nombre) si le localStorage a été corrompu ou modifié. Le code suppose ensuite que le résultat est un objet et accède à `positionsSauvees[p.id]`. Si `JSON.parse` retourne un tableau ou `null`, l'accès à la propriété ne plantera pas (JS est permissif), mais les positions ne seront jamais fusionnées sans avertissement.

**Correction :** Valider que le résultat est bien un objet :

```js
function lirePositions() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLE_LS) || '{}');
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  } catch {
    return {};
  }
}
```

---

### WR-06 : Reconnexion WebSocket : la condition d'arrêt est évaluée *après* le dernier doublement — `public/index.html:646-654`

**Fichier :** `public/index.html`, lignes 646-654
**Problème :** La logique est :

```js
if (delaiReconnect >= DELAI_MAX_WS) { dotWS('rouge'); return; }
// ...
delaiReconnect = Math.min(delaiReconnect * 2, DELAI_MAX_WS);
setTimeout(connecterWS, delai);
```

Quand `delaiReconnect` atteint `DELAI_MAX_WS` (30 000 ms), la condition d'arrêt est déclenchée, et la tentative avec 30 s de délai n'a jamais lieu. Le dernier délai effectif est donc 15 000 ms (la moitié du plafond). Ce n'est pas un bug grave, mais le comportement ne correspond pas au commentaire `// plafond 30s`.

**Correction :** Évaluer la condition *après* le doublement, ou ajuster le commentaire pour indiquer que l'arrêt intervient quand le délai suivant *serait* ≥ 30 s.

---

### WR-07 : `NOM_DOSSIER_COURANT` peut ne pas exclure le bon dossier si `__dirname` est un lien symbolique ou un chemin résolu différemment — `scanner.js:12`

**Fichier :** `scanner.js`, ligne 12
**Problème :** `path.basename(__dirname)` retourne `map_project` seulement si le processus est lancé depuis le répertoire standard. Si le projet est renommé, déplacé, ou lancé via un lien symbolique, `NOM_DOSSIER_COURANT` sera incorrect et `map_project` apparaîtra dans sa propre carte.

**Correction :** Comparer les chemins absolus résolus plutôt que les noms de base :

```js
const CHEMIN_COURANT = fs.realpathSync(__dirname);

// Dans le filtre :
const cheminCanonique = fs.realpathSync(path.join(WORKSPACE, e.name));
// ...
&& cheminCanonique !== CHEMIN_COURANT
```

---

## Informations (🔵)

### IN-01 : `require('child_process')` dupliqué — `server.js:6` et `49`

**Fichier :** `server.js`, lignes 6 et 49
**Problème :** `child_process` est importé deux fois : une fois via `const { exec } = require('child_process')` en tête, et une fois inline `require('child_process').exec(...)` à la ligne 49.

**Correction :** Utiliser la variable `exec` déjà importée, ou (si CR-01 est corrigé) importer `execFile` en tête avec `exec`.

---

### IN-02 : Emojis dans les données serveur (`scanner.js:15-22`)

**Fichier :** `scanner.js`, lignes 15-22
**Problème :** Les emojis sont encodés directement dans les littéraux de string côté serveur. Ce n'est pas un bug, mais cela crée une dépendance implicite sur l'encodage UTF-8 du terminal et des fichiers de configuration. Un `JSON.stringify` round-trip est sûr en Node.js moderne, mais cela peut poser problème dans des pipelines de logs ou des terminaux mal configurés.

**Suggestion :** Sans action requise si l'environnement reste macOS/Node 20+.

---

### IN-03 : `dessinerAnneaux` et `lancerSimulation` ne sont pas idempotentes — couplage d'ordre d'appel implicite

**Fichier :** `public/index.html`, ligne 446-502
**Problème :** `lancerSimulation` doit être appelée exactement une fois (les anneaux, la simulation et les événements sont tous initialisés dedans). Si le flux de données change et qu'un appel supplémentaire survient, des bugs subtils apparaissent. Le couplage n'est pas documenté.

**Suggestion :** Ajouter un commentaire d'avertissement, ou extraire l'initialisation unique dans une fonction `init()` clairement séparée de `mettreAJourVisuels`.

---

### IN-04 : Drag : `event.sourceEvent?.target?.closest?.('.noeud')` peut échouer silencieusement

**Fichier :** `public/index.html`, lignes 481 et 489 (et 534, 542)
**Problème :** Si `sourceEvent` est `null` (événements synthétiques, tests automatisés) ou si le DOM a évolué entre le début et la fin du drag, la classe `dragging` ne sera jamais retirée et le curseur restera en mode `grabbing` indéfiniment.

**Suggestion :** Mémoriser le nœud DOM au `dragstart` plutôt que de le rechercher à chaque événement :

```js
.on('start', (event, d) => {
  d._dragEl = event.sourceEvent?.target?.closest?.('.noeud');
  if (d._dragEl) d3.select(d._dragEl).classed('dragging', true);
  // ...
})
.on('end', (event, d) => {
  if (d._dragEl) d3.select(d._dragEl).classed('dragging', false);
  d._dragEl = null;
  // ...
})
```

---

### IN-05 : Le code drag est dupliqué entre `lancerSimulation` et `mettreAJourVisuels`

**Fichier :** `public/index.html`, lignes 477-492 et 529-545
**Problème :** Les gestionnaires `drag` (start/drag/end), `click`, et `mouseenter/move/leave` sont définis deux fois, en quasi-copie. Toute correction sur l'un doit être reproduite sur l'autre.

**Suggestion :** Extraire une fonction `attacherEvenements(selection)` appelée dans les deux endroits.

---

## Tableau récapitulatif

| Sévérité | Nombre | Détail |
|----------|--------|--------|
| 🔴 Critique | 2 | CR-01 (injection commande), CR-02 (crash process WS) |
| 🟡 Avertissement | 6 | WR-01 à WR-07 (WR-04 noté, WR-07 inclus) |
| 🔵 Info | 5 | IN-01 à IN-05 |
| **Total** | **13** | |

**Score qualité global : 6,5 / 10**

Le code est bien structuré, commenté en français, et respecte les conventions du projet. La sécurité côté client (échappement XSS dans le tooltip) est correctement gérée. Deux points bloquants doivent être corrigés avant tout déploiement ou exposition réseau : l'injection de commande shell (CR-01, exploitable même en local via une page tierce ouverte dans le même browser) et le crash potentiel du serveur sur erreur WebSocket (CR-02).

---

*Reviewé le 2026-05-14 — Reviewer : Claude (gsd-code-reviewer) — Profondeur : standard*
