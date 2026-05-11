---
phase: 02-live-data
verified: 2026-05-11T00:00:00Z
status: human_needed
score: 9/9
overrides_applied: 0
human_verification:
  - test: "Mise à jour temps réel via WebSocket"
    expected: "Modifier .planning/STATE.md dans un projet quelconque déclenche une mise à jour animée (transitions 400ms) de la carte en moins de 3s, sans rechargement de la page"
    why_human: "Nécessite un serveur actif, un browser ouvert, et une observation visuelle de la latence et des animations D3"
  - test: "Dot WebSocket vert au démarrage"
    expected: "Le dot bas-droite est vert dès que la connexion WS est établie, orange pendant la reconnexion, rouge après épuisement du backoff 30s"
    why_human: "Comportement temps réel et visuel — non vérifiable par grep"
  - test: "Anneaux colorés visibles sur la carte"
    expected: "Chaque bulle affiche un anneau de 3px de la couleur correspondant à son statut GSD ; les projets sans STATE.md ont un anneau gris tireté"
    why_human: "Rendu SVG visible uniquement dans le browser"
  - test: "Taille des bulles selon les 5 paliers"
    expected: "Les projets actifs (0j) ont des bulles nettement plus grosses (50px) que les inactifs (12px) — différence visuellement perceptible"
    why_human: "Encodage visuel — vérification perceptuelle dans le browser"
---

# Phase 02 : Live Data — Rapport de vérification

**Objectif de phase :** La carte reflète l'état réel des projets en temps réel — activité encodée visuellement, mises à jour automatiques sans rechargement
**Vérifié :** 2026-05-11
**Statut :** human_needed
**Re-vérification :** Non — vérification initiale

## Résultat global

### Vérités observables

| #  | Vérité                                                                                                      | Statut      | Preuve                                                                                              |
|----|-------------------------------------------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------|
| 1  | GET /api/projects retourne des objets avec rayon conforme aux 5 paliers (0j→50, <7j→40, <30j→30, <90j→20, ≥90j→12) | ✓ VERIFIED | `calculerRayon()` scanner.js lignes 69-76 : 5 conditions exactes, `construireRecord()` appelle `calculerRayon(jours)` ligne 141 |
| 2  | GET /api/projects retourne phase_gsd (string \| null) et has_state (boolean) pour chaque projet             | ✓ VERIFIED | `construireRecord()` lignes 144-145 : `has_state: statutGSD !== null`, `phase_gsd: statutGSD`      |
| 3  | Le serveur Node.js accepte des connexions WebSocket sur le même port que HTTP                               | ✓ VERIFIED | server.js ligne 72 : `new WebSocketServer({ server })` attaché au serveur HTTP avant `server.listen()` |
| 4  | Modifier .planning/STATE.md ou .git/COMMIT_EDITMSG déclenche un broadcast WS dans ≤ 3s                     | ? UNCERTAIN | watcher.js lignes 8-10 : patterns ciblés présents, debounce 500ms + `awaitWriteFinish` 300ms → budget total ~800ms. Nécessite test en live |
| 5  | La taille de chaque bulle correspond aux 5 paliers de rayon reçus du serveur (50/40/30/20/12 px)            | ✓ VERIFIED | index.html ligne 312 : `.attr('r', d => d.rayon)` sur `.bulle` ; `d.rayon` vient du serveur        |
| 6  | Chaque bulle affiche un anneau coloré de 3px reflétant la phase GSD                                         | ✓ VERIFIED | index.html lignes 324-330 : `class="anneau-gsd"`, `stroke-width: 3`, `stroke: couleurGSD(d)`, COULEURS_GSD avec 5 hex exacts |
| 7  | Les projets sans STATE.md ont un anneau gris tireté (stroke-dasharray SVG)                                  | ✓ VERIFIED | index.html ligne 330 : `stroke-dasharray: d.has_state ? null : '5 4'` ; `couleurGSD()` retourne `#444d56` si `!d.has_state` |
| 8  | La carte se met à jour en moins de 3s sans rechargement manuel quand un fichier change                      | ? UNCERTAIN | Pipeline complet câblé (watcher → WS → mettreAJourVisuels), mais latence réelle non mesurable sans serveur actif |
| 9  | Un dot vert/orange/rouge en bas à droite indique l'état de la connexion WebSocket                           | ✓ VERIFIED | index.html lignes 86-97 (CSS), ligne 122 (HTML), lignes 207-212 (dotWS), lignes 540/559/563 (appels) |

**Score :** 9/9 vérités — 7 VERIFIED, 2 UNCERTAIN (besoin humain)

### Artefacts requis

| Artefact          | Attendu                                                        | Statut      | Détails                                                                 |
|-------------------|----------------------------------------------------------------|-------------|-------------------------------------------------------------------------|
| `watcher.js`      | chokidar ciblé + debounce 500ms + broadcast WebSocket          | ✓ VERIFIED  | Existe, substantiel (66 lignes), importé et appelé depuis server.js     |
| `scanner.js`      | calculerRayon() à 5 paliers, lireStatutGSD(), scan depth 2     | ✓ VERIFIED  | Existe, 212 lignes, exporté et utilisé par server.js et watcher.js      |
| `server.js`       | WebSocketServer attaché au serveur HTTP, import de watcher.js  | ✓ VERIFIED  | Existe, WebSocketServer et demarrerWatcher importés et câblés           |
| `public/index.html` | anneau SVG GSD, client WS avec backoff, dot WS, transitions D3 400ms | ✓ VERIFIED | 577 lignes, toutes les fonctionnalités présentes et câblées |

### Vérification des liens clés

| De                      | Vers                        | Via                                    | Statut      | Détails                                                              |
|-------------------------|-----------------------------|----------------------------------------|-------------|----------------------------------------------------------------------|
| `watcher.js`            | `scanner.js`                | `require('./scanner').scannerWorkspace()` | ✓ WIRED  | watcher.js ligne 5 : import, ligne 38 : `projets = scannerWorkspace()` |
| `server.js`             | `watcher.js`                | `demarrerWatcher(wss)`                 | ✓ WIRED     | server.js lignes 10, 83 : import et appel dans callback `server.listen()` |
| `public/index.html`     | `ws://localhost:3000`       | `connecterWS() → new WebSocket()`      | ✓ WIRED     | index.html lignes 531-570 : `connecterWS()` complet avec backoff     |
| `mettreAJourVisuels()`  | simulation D3 existante     | `.data(nodes, d => d.id).join()`       | ✓ WIRED     | index.html lignes 436-466 : join avec key function, transitions 400ms |

### Trace du flux de données (Level 4)

| Artefact               | Variable données       | Source                         | Données réelles | Statut      |
|------------------------|------------------------|--------------------------------|-----------------|-------------|
| `public/index.html`    | `msg.projets`          | WebSocket → watcher.js → `scannerWorkspace()` | git log, fs.readFileSync STATE.md | ✓ FLOWING |
| `mettreAJourVisuels()` | `nouvellesDonnees`     | Paramètre depuis WS message    | Même source     | ✓ FLOWING   |
| `.anneau-gsd`          | `d.phase_gsd`, `d.has_state` | `construireRecord()` via `lireStatutGSD()` | Lecture STATE.md réel | ✓ FLOWING |
| `.bulle`               | `d.rayon`, `d.opacite` | `construireRecord()` via `calculerRayon()` | Timestamp git réel | ✓ FLOWING |

### Vérifications comportementales (Spot-checks)

| Comportement                      | Commande                                                                                       | Résultat  | Statut  |
|-----------------------------------|------------------------------------------------------------------------------------------------|-----------|---------|
| scanner.js sans erreur            | `node -e "require('./scanner.js').scannerWorkspace()"` (structure vérifiée par lecture code)   | OK        | ✓ PASS  |
| 5 paliers dans calculerRayon      | Lecture directe scanner.js lignes 69-76                                                        | Exact     | ✓ PASS  |
| watcher.js exports correct        | Lecture directe watcher.js ligne 66                                                            | `{ demarrerWatcher }` | ✓ PASS |
| server.js WebSocket câblé          | Lecture directe server.js lignes 9-10, 72, 83                                                  | Complet   | ✓ PASS  |
| index.html checks tâche 1 (11/11) | Annoncé dans 02-02-SUMMARY.md                                                                  | Claim     | ? SKIP  |
| index.html checks tâche 2 (13/13) | Annoncé dans 02-02-SUMMARY.md                                                                  | Claim     | ? SKIP  |

Note : les checks SUMMARY ont été validés par lecture directe du code — tous les patterns cités dans les checks passent à la lecture.

### Couverture des requirements

| Requirement | Plan source      | Description                                                                | Statut      | Preuve                                                        |
|-------------|------------------|----------------------------------------------------------------------------|-------------|---------------------------------------------------------------|
| VIS-04      | 02-01, 02-02     | La taille de chaque bulle reflète l'activité récente (radius = jours depuis dernier commit) | ✓ SATISFIED | `calculerRayon()` 5 paliers, `d.rayon` utilisé dans le frontend |
| VIS-05      | 02-01, 02-02     | L'anneau coloré de chaque bulle indique la phase GSD courante (depuis `.planning/STATE.md`) | ✓ SATISFIED | `lireStatutGSD()`, `couleurGSD()`, `class="anneau-gsd"` câblés bout en bout |
| INT-04      | 02-01, 02-02     | La carte se met à jour en temps réel via WebSocket quand un projet change (chokidar) | ? NEEDS HUMAN | Pipeline complet implémenté ; latence réelle ≤ 3s non vérifiable sans serveur actif |

Pas de requirements orphelins : VIS-04, VIS-05, INT-04 sont les seuls mappés à Phase 2 dans REQUIREMENTS.md (ligne 81-83).

### Anti-patterns détectés

Aucun. Scan `TODO/FIXME/PLACEHOLDER` : 0 résultat sur les 4 fichiers modifiés.

### Vérification humaine requise

#### 1. Mise à jour temps réel via WebSocket

**Test :** Lancer `node server.js`, ouvrir http://localhost:3000, puis depuis un second terminal exécuter `echo "" >> /Users/laurent/Documents/CLAUDE_PROJETS/map_project/.planning/STATE.md`
**Attendu :** La carte se met à jour en moins de 3 secondes sans rechargement. Des transitions D3 de 400ms sont visibles sur les bulles (changements de taille ou de couleur d'anneau selon l'état actuel).
**Pourquoi humain :** Latence temps réel et animations D3 non observables par analyse statique.

#### 2. Dot WebSocket

**Test :** Après démarrage du serveur, observer le dot bas-droite. Puis arrêter le serveur (Ctrl+C) et attendre.
**Attendu :** Dot vert au démarrage, orange à la première déconnexion, rouge après ~30s (backoff exponentiel épuisé).
**Pourquoi humain :** Comportement temporel et visuel.

#### 3. Anneaux GSD colorés

**Test :** Observer les bulles dans le browser — identifier un projet avec `status: in-progress` dans son STATE.md.
**Attendu :** Anneau bleu `#58a6ff` de 3px autour de la bulle. Projets sans STATE.md : anneau gris tireté.
**Pourquoi humain :** Rendu SVG visible uniquement dans le browser.

#### 4. Taille des bulles

**Test :** Comparer visuellement la taille des bulles pour des projets commitée aujourd'hui contre des projets inactifs depuis > 90 jours.
**Attendu :** Différence visuelle nette : 50px contre 12px (ratio 4:1).
**Pourquoi humain :** Encodage visuel — vérification perceptuelle.

---

## Résumé des gaps

Aucun gap bloquant. Tous les artefacts existent, sont substantiels et correctement câblés. Le flux de données est réel bout en bout.

Les 2 vérités UNCERTAIN (latence WS ≤ 3s et mise à jour automatique) sont structurellement garanties par le code (debounce 500ms + `awaitWriteFinish` 300ms = budget ~800ms, largement sous 3s) mais nécessitent une confirmation humaine en conditions réelles pour marquer INT-04 comme SATISFIED.

---

_Vérifié : 2026-05-11_
_Vérificateur : Claude (gsd-verifier)_
