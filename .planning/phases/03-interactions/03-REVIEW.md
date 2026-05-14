---
phase: 03-interactions
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - scanner.js
  - server.js
  - public/index.html
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 03 : Rapport de revue de code

**Révisé :** 2026-05-14
**Profondeur :** standard
**Fichiers révisés :** 3
**Statut :** issues_found

## Résumé

Revue des trois fichiers modifiés pendant la phase 3 (Interactions) : `scanner.js` (champ `last_commit`), `server.js` (route `GET /open`), `public/index.html` (tooltip, filtrage, clic VS Code).

Deux blocages critiques identifiés : injection de commande dans `server.js` et contournement possible de la validation de chemin via un symbole lien. Quatre avertissements concernant la gestion des erreurs et des cas limites. Trois points d'information sur la qualité du code.

---

## Problèmes critiques

### CR-01 : Injection de commande dans la route GET /open

**Fichier :** `server.js:49`

**Problème :** Le chemin fourni par le client est injecté directement dans une chaîne de commande shell via des guillemets doubles, sans échappement supplémentaire. Un chemin contenant un guillemet double — p. ex. `/Users/laurent/Documents/CLAUDE_PROJETS/foo"$(id)"` — ferme le guillemet et exécute une sous-commande arbitraire. La validation `startsWith` ne protège pas contre ce vecteur : un chemin peut commencer par le préfixe autorisé et contenir néanmoins des caractères dangereux.

```js
// Ligne 49 — vulnérable
require('child_process').exec(`code "${chemin}"`, err => { … });
```

**Correction :** Passer le chemin comme argument séparé via `execFile` (ou le tableau d'arguments de `spawn`), ce qui supprime complètement l'interprétation shell.

```js
const { execFile } = require('child_process');
execFile('code', [chemin], err => {
  if (err) console.error('[open] Erreur VS Code :', err.message);
});
```

---

### CR-02 : Contournement de la validation de chemin via lien symbolique

**Fichier :** `server.js:46-48`

**Problème :** La validation repose uniquement sur `startsWith('/Users/laurent/Documents/CLAUDE_PROJETS/')`. Un lien symbolique situé à l'intérieur du workspace mais pointant vers un répertoire extérieur (p. ex. `/etc`) passerait la validation et serait ouvert dans VS Code. Combiné à CR-01, cela constitue un vecteur de traversée de répertoire.

De plus, un chemin comme `/Users/laurent/Documents/CLAUDE_PROJETS/../../../etc` (non normalisé) passerait `startsWith` avant que le shell ou le système d'exploitation ne résolve les composantes `..`.

**Correction :** Résoudre le chemin avec `path.resolve()` avant la validation, et vérifier que le résultat commence par le préfixe :

```js
const WORKSPACE_OPEN = '/Users/laurent/Documents/CLAUDE_PROJETS/';
const cheminResolu = path.resolve(chemin);
if (!cheminResolu.startsWith(WORKSPACE_OPEN)) {
  res.writeHead(400); res.end('Chemin invalide'); return;
}
execFile('code', [cheminResolu], err => { … });
```

---

## Avertissements

### WR-01 : XSS potentiel via la couleur GSD injectée sans échappement dans style=

**Fichier :** `public/index.html:308, 313`

**Problème :** Les variables `c` (couleur de la bulle) et `gsdCouleur` sont construites à partir des fonctions `couleur(d)` et `couleurGSD(d)`, qui retournent des chaînes hexadécimales statiques issues de tableaux constants côté client. Cependant, ces valeurs dépendent de `d.phase_gsd` fourni par le serveur via l'API `/api/projects`. Si un fichier `STATE.md` contient un statut malformé, `couleurGSD` retomberait sur `COULEURS_GSD['unknown']` (valeur statique), donc ce vecteur est probablement sans impact immédiat.

En revanche, la valeur `c` passée dans `style="background:${c}"` aux lignes 308 et 309 n'est pas échappée par `esc()`. Si la fonction `couleur(d)` était modifiée pour incorporer des données serveur, cela constituerait un XSS réflété dans un attribut `style`.

**Correction :** Appliquer `esc()` systématiquement sur toute valeur interpolée dans du HTML, y compris dans les attributs `style` :

```js
`<div class="tt-dot" style="background:${esc(c)}"></div>`,
```

---

### WR-02 : `pulserBulle` applique `attr('transform', 'scale(...)')` sur un élément qui peut déjà avoir un transform

**Fichier :** `public/index.html:334-337`

**Problème :** La fonction `pulserBulle` utilise `d3.select(noeudG).select('.bulle').transition().attr('transform', 'scale(1.15)')`. L'élément `.bulle` est un `<circle>` SVG, et l'attribut `transform` des cercles SVG n'est pas composé de la même façon que dans CSS. Si la simulation D3 positionne le nœud via `translate` sur l'élément parent `<g>`, ce code fonctionne correctement. Mais si un drag est en cours au moment du clic, la transition de retour `.attr('transform', 'scale(1)')` écrase tout transform en cours sur l'élément `.bulle` issu de la classe CSS `.noeud.dragging .bulle { transform: scale(1.05); }`.

Le CSS (ligne 46-49) applique `transform: scale(1.05)` via CSS sur `.noeud.dragging .bulle`, tandis que D3 applique l'attribut SVG `transform`. Lorsque les deux coexistent, le comportement est imprévisible selon le navigateur.

**Correction :** Utiliser `d3.select(noeudG).select('.bulle').transition().style('transform', 'scale(1.15)')` (propriété CSS) plutôt que l'attribut SVG `transform`, pour rester cohérent avec les règles CSS existantes.

---

### WR-03 : Absence de gestion d'erreur sur `JSON.parse` des positions localStorage

**Fichier :** `public/index.html:507, 590`

**Problème :** Aux lignes 507 et 590, le code effectue `JSON.parse(localStorage.getItem(CLE_LS) || '{}')`. Si la valeur dans `localStorage` est une chaîne JSON invalide (corrompue ou modifiée manuellement), `JSON.parse` lève une `SyntaxError` non attrapée, ce qui interrompt l'exécution de `mettreAJourVisuels` ou du bloc de chargement initial, rendant la carte inutilisable.

**Correction :**

```js
function lirePositions() {
  try {
    return JSON.parse(localStorage.getItem(CLE_LS) || '{}');
  } catch {
    return {};
  }
}
```

---

### WR-04 : `gitExec` utilise `execSync` sans timeout — blocage possible de la boucle d'événements

**Fichier :** `scanner.js:31`

**Problème :** `execSync` est appelé sans option `timeout`. Sur un dépôt git avec un verrou (`index.lock`), un réseau monté (NFS/SSHFS) ou un sous-module lent, la commande peut bloquer indéfiniment la boucle d'événements Node.js. Cela affecte les trois appels git dans `construireRecord` (branche, timestamp, `last_commit`), soit jusqu'à trois blocages potentiels par projet scanné.

**Correction :** Ajouter un `timeout` raisonnable (p. ex. 2000 ms) :

```js
return execSync(commande, {
  cwd,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
  timeout: 2000,
}).trim();
```

---

## Points d'information

### IN-01 : `last_commit` de longueur exactement 60 caractères reçoit une ellipse inutile

**Fichier :** `scanner.js:131-133`

**Problème :** La condition `commitMsgRaw.length > 60` est correcte : un message de 60 caractères exactement ne reçoit pas d'ellipse. En revanche, le `slice(0, 60)` est toujours appliqué, même si la chaîne fait moins de 60 caractères — ce qui est sans effet mais légèrement redondant. Pas de bogue fonctionnel.

**Suggestion :** Le code est correct. Aucune correction requise.

---

### IN-02 : La constante `WORKSPACE_ROOT` est dupliquée entre `scanner.js` et `server.js`

**Fichier :** `scanner.js:7`, `server.js:46`

**Problème :** Le chemin `/Users/laurent/Documents/CLAUDE_PROJETS` est hardcodé deux fois : comme `WORKSPACE` dans `scanner.js` et comme chaîne littérale dans `server.js`. Le SUMMARY-01 documente que c'est intentionnel (éviter une dépendance circulaire), mais une divergence future entre les deux valeurs causerait des bugs difficiles à diagnostiquer.

**Suggestion :** Extraire la constante dans un module `config.js` importé par les deux, ou utiliser une variable d'environnement `WORKSPACE_ROOT`.

---

### IN-03 : `console.log` de débogage présent en production

**Fichier :** `server.js:98`

**Problème :** La ligne `console.log('[watcher] Surveillance active — STATE.md + COMMIT_EDITMSG')` est un artifact de debug. Dans un contexte de déploiement continu, les logs de surveillance devraient passer par un logger structuré ou être conditionnels à un flag `DEBUG`.

**Suggestion :** Supprimer ou conditionner à `process.env.DEBUG`.

---

_Révisé : 2026-05-14_
_Auteur de la revue : Claude (gsd-code-reviewer)_
_Profondeur : standard_
