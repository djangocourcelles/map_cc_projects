---
phase: 02-live-data
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - public/index.html
  - scanner.js
  - server.js
  - watcher.js
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: issues_found
---

# Phase 02 : Rapport de revue de code

**Révisé :** 2026-05-11
**Profondeur :** standard
**Fichiers révisés :** 4
**Statut :** issues_found

## Résumé

Quatre fichiers révisés : le frontend D3.js (`public/index.html`), le scanner de workspace (`scanner.js`), le serveur HTTP/WebSocket (`server.js`) et le watcher chokidar (`watcher.js`). L'architecture générale est saine. Trois bloquants identifiés : une faille de path traversal (court-circuit de la protection existante), une injection XSS via `innerHTML`, et une race condition potentielle lors de la reconnexion WebSocket. Six avertissements de robustesse et quatre points d'information.

---

## Problèmes critiques

### CR-01 : Path traversal — `path.startsWith()` contournable

**Fichier :** `server.js:48`

**Problème :** La vérification de path traversal utilise `String.prototype.startsWith()` sur deux chaînes calculées par `path.join()`. Sur macOS/Linux, si `PUBLIC_DIR` est `/foo/public`, un chemin résolu vers `/foo/public2/secret` passe la vérification car il commence bien par `/foo/public`. La forme canonique correcte exige de comparer avec `PUBLIC_DIR + path.sep` (ou `PUBLIC_DIR + '/'`) pour éviter qu'un préfixe de répertoire soit confondu avec un répertoire parent.

```js
// Actuel — vulnérable si PUBLIC_DIR = '/…/public'
if (!filePath.startsWith(PUBLIC_DIR)) { ... }

// Corrigé
const SAFE_PREFIX = PUBLIC_DIR.endsWith(path.sep)
  ? PUBLIC_DIR
  : PUBLIC_DIR + path.sep;
if (!filePath.startsWith(SAFE_PREFIX)) { ... }
```

En pratique l'application locale ne sert que `public/`, donc le risque est faible en production réelle, mais la protection déclarée est incorrecte et crée un faux sentiment de sécurité.

---

### CR-02 : XSS via `innerHTML` non assaini dans le tooltip

**Fichier :** `public/index.html:223`

**Problème :** `tooltip.innerHTML` est construit par interpolation de template littéral avec des données provenant du serveur : `d.nom`, `d.branche`, `d.date_relative`, `d.stacks[].emoji`. Si l'un de ces champs contient `<script>`, un attribut `onerror=`, ou des guillemets brisant un attribut inline, le navigateur exécute le code. Les données viennent du scan du filesystem local et sont donc semi-fiables, mais un nom de projet ou de branche git contenant `<img src=x onerror=alert(1)>` déclenche l'exécution.

```js
// Actuel
tooltip.innerHTML = `<div class="tt-nom">${d.nom}</div> ...`;

// Corrigé : échapper chaque valeur interpolée
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// Puis : `<div class="tt-nom">${esc(d.nom)}</div>`
```

Les emojis de stack (`d.stacks[].emoji`) proviennent d'un tableau défini en dur dans `scanner.js` — ils sont sûrs. `d.nom`, `d.branche` et `d.date_relative` viennent du filesystem et peuvent être contrôlés par un attaquant local.

---

### CR-03 : Race condition dans la reconnexion WebSocket

**Fichier :** `public/index.html:535-548`

**Problème :** Le backoff exponentiel est calculé *après* le délai, et `wsInstance` est mis à `null` dès l'événement `close`. Si deux événements `close` se produisent rapidement (p. ex. fermeture + erreur enchaînée), `connecterWS()` peut être appelé deux fois quasi-simultanément. La garde `wsInstance.readyState === WebSocket.CONNECTING` ne protège plus car `wsInstance` vient d'être remis à `null`. Deux instances WebSocket concurrentes sont alors créées, chacune tentant de broadcaster.

De plus, la condition d'arrêt est `if (delaiReconnect > DELAI_MAX_WS)` *avant* le doublement : au premier dépassement, `delaiReconnect` vaut `DELAI_MAX_WS` (30 000 ms exactement), la condition `> 30000` est fausse, et une tentative supplémentaire est faite. L'arrêt se produit au cycle suivant seulement, après un 17e essai au lieu du 16e.

```js
// Actuel
ws.addEventListener('close', () => {
  wsInstance = null;
  if (delaiReconnect > DELAI_MAX_WS) { dotWS('rouge'); return; }
  dotWS('orange');
  setTimeout(() => {
    delaiReconnect = Math.min(delaiReconnect * 2, DELAI_MAX_WS);
    connecterWS();
  }, delaiReconnect);
});

// Corrigé
ws.addEventListener('close', () => {
  if (wsInstance !== ws) return; // ignorer les événements orphelins
  wsInstance = null;
  if (delaiReconnect >= DELAI_MAX_WS) { dotWS('rouge'); return; }
  dotWS('orange');
  const delai = delaiReconnect;
  delaiReconnect = Math.min(delaiReconnect * 2, DELAI_MAX_WS);
  setTimeout(connecterWS, delai);
});
```

---

## Avertissements

### WR-01 : `execSync` bloque la boucle d'événements Node.js sur chaque requête `/api/projects`

**Fichier :** `scanner.js:26-35` + `server.js:28`

**Problème :** `gitExec` appelle `execSync`, qui est synchrone et bloque l'intégralité du thread Node.js. Pour chaque projet détecté (potentiellement des dizaines), deux `execSync` sont effectués (`git rev-parse`, `git log`). Cela gèle le serveur HTTP pendant toute la durée du scan. Un seul appel à `/api/projects` peut bloquer d'autres requêtes HTTP entrantes (y compris les handshakes WebSocket) pendant plusieurs secondes si le workspace est grand.

**Correction :** Utiliser `execFile` avec callback ou `util.promisify(execFile)` dans un contexte async, ou accepter la latence uniquement au démarrage en mettant les résultats en cache avec invalidation par le watcher.

---

### WR-02 : `scannerWorkspace` peut inclure le répertoire `map_project` lui-même comme projet racine

**Fichier :** `scanner.js:152-159`

**Problème :** Le workspace scanné est `/Users/laurent/Documents/CLAUDE_PROJETS`. Ce répertoire contient `map_project/` qui est le projet courant. `map_project` a un `package.json` et un répertoire `.git`, donc il sera inclus comme nœud sur la carte. Ce n'est pas nécessairement un bug si c'est voulu, mais `map_project` se regardera lui-même dans la carte, ce qui peut créer une confusion UX et un cycle logique si le watcher observe son propre `COMMIT_EDITMSG`.

**Correction :** Exclure explicitement le dossier courant (`path.basename(__dirname)`) de la liste des entrées, ou documenter que c'est intentionnel.

---

### WR-03 : `calculerJours` retourne des valeurs négatives si l'horloge système est déréglée

**Fichier :** `scanner.js:41-46`

**Problème :** Si `Date.now() / 1000 < ts` (horloge déréglée, ou timestamp git futur), `calculerJours` retourne un entier négatif. Les fonctions `calculerRayon` et `couleur` (frontend) ne gèrent pas les valeurs négatives : `jours < 7` sera vrai pour `-1`, ce qui affectera incorrectement le rayon et la couleur. La bulle apparaîtra comme « active aujourd'hui » alors que le commit est dans le futur.

```js
// Correction dans calculerJours
const diff = Math.floor((Date.now() / 1000 - ts) / 86400);
return Math.max(0, diff); // garantir ≥ 0
```

---

### WR-04 : Absence de gestion d'erreur sur `localStorage.setItem`

**Fichier :** `public/index.html:253-255`

**Problème :** `localStorage.setItem` lève une `DOMException` (`QuotaExceededError`) si le stockage est plein ou si le navigateur est en mode navigation privée avec quotas restreints. Cela planterait silencieusement la sauvegarde des positions, ou pire, pourrait interrompre la propagation d'un événement si l'exception n'est pas attrapée (bien que JS ne lève pas depuis un gestionnaire de simulation D3 dans ce cas — l'erreur sera juste non gérée).

```js
function sauvegarderPositions(nodes) {
  const pos = {};
  nodes.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
  try {
    localStorage.setItem(CLE_LS, JSON.stringify(pos));
  } catch (e) {
    console.warn('[positions] Impossible de sauvegarder :', e.message);
  }
}
```

---

### WR-05 : Contenu de `localStorage` non validé à la désérialisation

**Fichier :** `public/index.html:410`, `public/index.html:486`

**Problème :** `JSON.parse(localStorage.getItem(CLE_LS) || '{}')` est appelé sans validation de la structure retournée. Si le contenu de `localStorage` a été corrompu ou modifié manuellement (p. ex. via les DevTools), `positionsSauvees[p.id]` pourrait être un objet avec des propriétés `x`/`y` non numériques (`undefined`, `null`, `NaN`), ce qui produirait des `translate(NaN,NaN)` dans SVG et rendrait les nœuds invisibles.

```js
// Correction : valider avant d'utiliser
const pos = positionsSauvees[p.id];
if (pos && typeof pos.x === 'number' && typeof pos.y === 'number'
    && isFinite(pos.x) && isFinite(pos.y)) {
  p.x = pos.x; p.y = pos.y;
}
```

---

### WR-06 : Le watcher ne surveille pas les fichiers `CLAUDE.md` des projets

**Fichier :** `watcher.js:8-11`

**Problème :** Le watcher surveille `STATE.md` et `COMMIT_EDITMSG`. Mais si un projet est créé ou supprimé (ajout/suppression d'un dossier dans le workspace), aucun de ces fichiers ne change nécessairement. Un nouveau projet apparaîtra dans la carte seulement si un commit est fait ou si `STATE.md` est modifié. Ce n'est pas un crash, mais la « live data » est incomplète : la création d'un nouveau projet n'est pas détectée.

**Correction :** Ajouter `${WORKSPACE}/*/package.json`, `${WORKSPACE}/*/requirements.txt` (ou les sentinelles) dans les patterns surveillés, ou surveiller directement les ajouts de répertoires dans `WORKSPACE` avec `depth: 1`.

---

## Points d'information

### IN-01 : `WORKSPACE` défini en dur dans deux fichiers

**Fichiers :** `scanner.js:7`, `watcher.js:7`

**Problème :** Le chemin absolu `/Users/laurent/Documents/CLAUDE_PROJETS` est répété dans deux modules. Un changement de workspace nécessite deux modifications synchronisées. De plus, ce chemin est spécifique à la machine du développeur : l'application ne peut pas être lancée sur une autre machine sans modifier le code source.

**Correction :** Centraliser dans `config.js` ou lire depuis une variable d'environnement `WORKSPACE_DIR`, avec `process.env.WORKSPACE_DIR || '/Users/laurent/Documents/CLAUDE_PROJETS'` comme fallback.

---

### IN-02 : Duplication de la logique drag entre `lancerSimulation` et `mettreAJourVisuels`

**Fichier :** `public/index.html:383-400` et `public/index.html:429-445`

**Problème :** Le gestionnaire de drag D3 (start/drag/end) est défini deux fois à l'identique. Toute correction sur ce gestionnaire devra être appliquée aux deux endroits.

**Correction :** Extraire une fonction `attacherDrag(noeuds)` réutilisée dans les deux contextes.

---

### IN-03 : `console.error` utilisé pour les erreurs WS et de chargement côté client

**Fichier :** `public/index.html:502`, `public/index.html:530`

**Problème :** Deux `console.error` dans le code client ne posent pas de problème fonctionnel, mais sont à noter : en prod, un mécanisme de reporting serait préférable. Pour une app locale, acceptable tel quel.

---

### IN-04 : Le nom tronqué à 14 caractères ne tient pas compte des caractères multi-octets

**Fichier :** `public/index.html:336`

**Problème :** `d.nom.slice(0, 13) + '…'` utilise des indices de code units UTF-16. Pour des noms contenant des emojis ou des caractères CJK, le troncage peut couper au milieu d'un caractère. Risque faible (les noms de dossiers Unix sont rarement non-ASCII), mais à noter.

**Correction :** Utiliser `[...d.nom].slice(0, 13).join('') + '…'` pour respecter les graphème clusters.

---

_Révisé : 2026-05-11_
_Réviseur : Claude (gsd-code-reviewer)_
_Profondeur : standard_
