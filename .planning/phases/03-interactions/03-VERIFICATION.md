---
phase: 03-interactions
verified: 2026-05-14T10:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Survoler une bulle — vérifier le tooltip"
    expected: "Tooltip visible en haut à droite du curseur, contient : nom (gras), emojis stack, date+branche en monospace, message commit (si présent), point coloré phase GSD avec label"
    why_human: "Rendu CSS et positionnement DOM impossibles à vérifier sans browser"
  - test: "Cliquer une bulle — vérifier le pulse et l'ouverture VS Code"
    expected: "Animation scale(1→1.15→1) visible en ~300ms, VS Code s'ouvre sur le dossier du projet"
    why_human: "Animation D3 et ouverture application externe impossibles à vérifier sans exécution"
  - test: "Saisir 'bot' dans le champ de recherche"
    expected: "Les bulles dont le nom ne contient pas 'bot' s'estompent à opacity 0.15 en 200ms"
    why_human: "Transition D3 opacity et comportement visuel nécessitent le browser"
  - test: "Appuyer Escape avec un terme saisi"
    expected: "Champ vidé, toutes les bulles reviennent à opacity 1, champ perd le focus"
    why_human: "Comportement clavier et état DOM nécessitent le browser"
  - test: "Thème dark/light"
    expected: "Le fond et le tooltip s'adaptent automatiquement à prefers-color-scheme du système"
    why_human: "Rendu CSS media query nécessite le browser"
---

# Phase 3 : Interactions — Rapport de vérification

**Phase Goal :** L'utilisateur peut explorer la carte et agir sur les projets directement depuis l'interface
**Vérifié :** 2026-05-14T10:00:00Z
**Statut :** human_needed
**Re-vérification :** Non — vérification initiale

---

## Objectif de la phase

**Critères de succès ROADMAP :**

1. Survoler une bulle affiche un tooltip avec branche, dernier commit, stack et phase GSD
2. Cliquer une bulle ouvre le dossier du projet dans VS Code
3. Saisir un terme dans le champ de recherche filtre les bulles visibles en temps réel

**Requirements couverts :** INT-01, INT-02, INT-03

---

## Vérités observables

| # | Vérité | Statut | Preuve |
|---|--------|--------|--------|
| 1 | `GET /api/projects` retourne chaque projet avec un champ `last_commit` (string ≤ 61 chars ou null) | VERIFIED | `scanner.js` lignes 130-133 : `gitExec('git log -1 --format=%s', chemin)` + troncature à 60 chars + `'…'` |
| 2 | `GET /open?path=/chemin/valide` répond 204 et exécute `code /chemin` | VERIFIED | `server.js` lignes 43-53 : route présente, `res.writeHead(204)`, `exec('code "..."')` |
| 3 | `GET /open?path=/chemin/hors-workspace` répond 400 | VERIFIED | `server.js` ligne 46-47 : validation `startsWith('/Users/laurent/Documents/CLAUDE_PROJETS/')`, `res.writeHead(400)` |
| 4 | Survoler une bulle affiche un tooltip qui suit le curseur avec nom, stack, date+branche, message commit, phase GSD | VERIFIED (code) | `index.html` lignes 298-317 : `afficherTooltip()` avec `d.last_commit`, `LABELS_GSD`, `tt-gsd-dot` ; `deplacerTooltip()` avec `OFFSET_X=12`, `OFFSET_Y=20` et clampage viewport |
| 5 | Cliquer une bulle déclenche un pulse scale(1→1.15→1, 300ms) et appelle `GET /open?path=...` | VERIFIED (code) | `index.html` lignes 494-497 et 546-549 : `pulserBulle(event.currentTarget)` + `fetch('/open?path=' + encodeURIComponent(d.chemin))` dans `lancerSimulation` ET `mettreAJourVisuels` |
| 6 | Saisir dans le champ filtre estompe les bulles non-matchées à opacity 0.15 en 200ms | VERIFIED (code) | `index.html` lignes 660-685 : `appliquerFiltre()` avec `normalize('NFD')`, `transition().duration(200)`, `.attr('opacity', ... 0.15)` |
| 7 | Vider le champ ou appuyer Escape rétablit opacity 1 sur toutes les bulles | VERIFIED (code) | `index.html` lignes 678-683 : `e.key === 'Escape'` → `input.value = ''` + `appliquerFiltre()` |
| 8 | Le fond de la carte s'adapte à `prefers-color-scheme` dark (défaut) et light | VERIFIED (code) | `index.html` lignes 8-29 : `:root` avec 8 variables dark, `@media (prefers-color-scheme: light)` avec 8 variables light ; `background: var(--bg)` ligne 34 |

**Score automatisable : 8/8 vérités vérifiées dans le code**

---

## Artifacts requis

| Artifact | Fournit | Statut | Détail |
|----------|---------|--------|--------|
| `scanner.js` | Champ `last_commit` dans chaque ProjectRecord | VERIFIED | Lignes 130-133 : `gitExec('git log -1 --format=%s', chemin)` + troncature |
| `server.js` | Route `GET /open` avec validation chemin et exec code | VERIFIED | Lignes 42-54 : route complète, 204/400, exec child_process |
| `public/index.html` | CSS variables `--bg/--surface/--border/--text-*` + `@media light` | VERIFIED | Lignes 8-29 |
| `public/index.html` | `div#tooltip` avec classes `tt-gsd-dot`, `tt-commit`, `tt-branche` | VERIFIED | Lignes 85-94 (CSS) + 304-314 (JS) |
| `public/index.html` | `div#recherche-overlay` avec `input#recherche-input` | VERIFIED | Lignes 97-119 (CSS) + 165-169 (HTML) |
| `public/index.html` | Fonction `pulserBulle()` et event listener click sur noeuds | VERIFIED | Lignes 333-337 (définition) + 494-497 (lancerSimulation) + 546-549 (mettreAJourVisuels) |

---

## Vérification des liens clés

| De | Vers | Via | Statut | Détail |
|----|------|-----|--------|--------|
| `scanner.js::construireRecord()` | `ProjectRecord.last_commit` | `gitExec('git log -1 --format=%s', chemin)` | WIRED | Lignes 130-152 : appel, troncature, inclusion dans return |
| `server.js::route /open` | `child_process.exec` | Validation chemin workspace | WIRED | Lignes 43-53 : validation + exec + 204 |
| `mousemove event D3 node` | `deplacerTooltip(event)` | `OFFSET_X=+12, OFFSET_Y=-20, clampage bords viewport` | WIRED | Ligne 473 : `.on('mousemove', (event) => deplacerTooltip(event))` |
| `input#recherche-input event 'input'` | `node.transition().attr('opacity', ...)` | Comparaison case-insensitive `normalize('NFD')` sur `d.nom` | WIRED | Lignes 666-675 : normaliser() + appliquerFiltre() + transition D3 |
| `click event sur noeud D3` | `fetch('/open?path=' + encodeURIComponent(d.chemin))` | `pulserBulle(event.currentTarget)` | WIRED | Lignes 494-497 ET 546-549 : présent dans les deux chemins (lancerSimulation + mettreAJourVisuels) |

---

## Trace flux de données (Niveau 4)

| Artifact | Variable de données | Source | Produit des données réelles | Statut |
|----------|--------------------|---------|-----------------------------|--------|
| `scanner.js::construireRecord()` | `last_commit` | `gitExec('git log -1 --format=%s', chemin)` — commande git réelle | Oui — requête git, null si sans git | FLOWING |
| `server.js::route /open` | `chemin` (path param) | `new URL(req.url).searchParams.get('path')` | Oui — valeur de la requête HTTP | FLOWING |
| `public/index.html::afficherTooltip()` | `d.last_commit` | ProjectRecord reçu via `/api/projects` → scannerWorkspace() → construireRecord() | Oui — données git réelles | FLOWING |

---

## Vérification de la couverture des requirements

| Requirement | Plan source | Description | Statut | Preuve |
|-------------|-------------|-------------|--------|--------|
| INT-01 | 03-01, 03-02 | Tooltip au survol : branche, dernier commit, stack, phase GSD | SATISFIED | `afficherTooltip()` : `d.last_commit`, `d.branche`, `labelStack(d)`, `LABELS_GSD[d.phase_gsd]` ; `tt-gsd-dot` CSS présent |
| INT-02 | 03-01, 03-02 | Clic → `code /path/to/project` | SATISFIED | Route `/open` dans server.js + listener click D3 avec `encodeURIComponent(d.chemin)` |
| INT-03 | 03-02 | Champ de recherche filtre les bulles par nom | SATISFIED | IIFE `Filtrage (INT-03)` lignes 661-685 : `input`, `appliquerFiltre()`, `Escape` |

**Aucun requirement orphelin** : les 3 IDs déclarés dans les plans (INT-01, INT-02, INT-03) correspondent exactement aux 3 requirements Phase 3 du ROADMAP.

---

## Anti-patterns détectés

| Fichier | Ligne | Pattern | Sévérité | Impact |
|---------|-------|---------|----------|--------|
| Aucun | — | — | — | — |

Scan effectué sur `scanner.js`, `server.js`, `public/index.html`. Aucun TODO/FIXME, stub `return null` non-justifié, ni données hardcodées vides qui affecteraient le rendu utilisateur.

Note : `return null` dans `gitExec()` (ligne 38, scanner.js) est un fallback légitime pour un repo sans git, pas un stub.

---

## Vérifications comportementales (Step 7b)

| Comportement | Commande | Résultat | Statut |
|--------------|----------|----------|--------|
| `last_commit` présent dans ProjectRecord | `node -e "const {scannerWorkspace}=require('./scanner');console.log('last_commit' in scannerWorkspace()[0])"` | Nécessite exécution avec workspace réel | SKIP — vérifié statiquement dans le code |
| Route `/open` — validation chemin | Logique de validation testable hors serveur | Pattern `startsWith('/Users/…')` → 400 sinon 204 | VERIFIED par lecture code |

---

## Vérifications humaines requises

### 1. Tooltip au survol (INT-01)

**Test :** Lancer `node server.js` puis survoler plusieurs bulles avec différents profils (avec/sans git, avec/sans GSD, message commit long/absent).
**Attendu :** Tooltip visible en haut à droite du curseur, contenant : nom en gras, emojis stack, date relative + branche en monospace, message commit tronqué si long, point coloré + label phase GSD (ou rien si pas de STATE.md). Le tooltip suit le curseur et disparaît au mouseout avec fade-out.
**Raison :** Rendu CSS, positionnement DOM et transitions opacity impossibles à vérifier sans browser.

### 2. Pulse au clic et ouverture VS Code (INT-02)

**Test :** Cliquer une bulle de projet valide (p. ex. Projet_BotAVV).
**Attendu :** Animation scale(1.15) visible en ~300ms puis retour à 1, VS Code s'ouvre sur le dossier.
**Raison :** Animation D3 `.transition()` et `exec('code ...')` nécessitent exécution réelle.

### 3. Filtrage temps réel (INT-03)

**Test :** Taper un terme partiel dans le champ de recherche (p. ex. "bot"), puis appuyer Escape.
**Attendu :** Bulles non-matchées à opacity 0.15, bulles matchées à opacity 1, transition 200ms. Sur Escape : champ vidé + toutes bulles à opacity 1.
**Raison :** Transition D3 opacity sur les nœuds SVG nécessite le browser.

### 4. Thème dark/light

**Test :** Changer le thème système entre dark et light (Préférences Système macOS).
**Attendu :** Fond de carte et tooltip adaptent leurs couleurs via les variables CSS sans rechargement.
**Raison :** `@media (prefers-color-scheme: light)` nécessite le browser.

### 5. Non-régression drag + localStorage

**Test :** Déplacer des bulles, recharger la page.
**Attendu :** Positions restaurées, drag toujours fonctionnel après les modifications de Phase 3, WebSocket dot vert.
**Raison :** Interaction drag D3 + localStorage nécessite le browser.

---

## Synthèse des écarts

Aucun écart bloquant. Toutes les vérités sont VERIFIED dans le code source :

- **scanner.js** : `last_commit` ajouté dans `construireRecord()` avec troncature correcte à 60 chars + `'…'` (lignes 130-133, 152).
- **server.js** : Route `GET /open` présente avec validation workspace, réponse 204/400, et `exec('code "..."')` (lignes 42-54).
- **public/index.html** : Tooltip redesigné avec `d.last_commit`, `LABELS_GSD`, `tt-gsd-dot` ; `pulserBulle()` et listener click câblés dans `lancerSimulation` ET `mettreAJourVisuels` ; IIFE filtrage avec `normalize('NFD')`, transition opacity 0.15/1, Escape ; CSS variables dark/light avec `prefers-color-scheme`.

Les 5 vérifications humaines portent sur le rendu visuel et les comportements interactifs — elles ne peuvent pas être automatisées mais le code sous-jacent est complet et câblé correctement.

---

_Vérifié : 2026-05-14T10:00:00Z_
_Vérificateur : Claude (gsd-verifier)_
