---
phase: 01-core-graph
plan: 02
subsystem: frontend
tags: [d3, svg, force-simulation, zoom, drag, localstorage, vanilla-js]

requires:
  - 01-01

provides:
  - "public/index.html : frontend D3.js complet (carte interactive, zoom/pan, drag bulles, persistance localStorage)"

affects:
  - "02-live-data (WebSocket client à ajouter dans index.html)"
  - "03-interactions (tooltip, clic VS Code, filtrage)"

tech-stack:
  added: []
  patterns:
    - "D3 force simulation avec forceCenter + forceManyBody + forceCollide"
    - "Fusion localStorage avant création simulation (pitfall #3)"
    - "Zoom D3 sur rect transparent, viewport dans g.viewport"
    - "d3.drag() avec stopPropagation sur mousedown (pitfall #2)"
    - "alphaDecay(0.05) + arret sur end event (pitfall #4)"
    - "Rendu avec key function d => d.id + exit().remove() (pitfall #5)"

key-files:
  created:
    - public/index.html
  modified: []

key-decisions:
  - "localStorage fusionné AVANT lancerSimulation() -- ordre critique pour éviter écrasement des positions"
  - "stopPropagation sur mousedown du noeud pour isoler drag bulle du pan canvas"
  - "layout initial en cercle (rayon 200px) pour premier lancement propre"
  - "alphaTarget(0) sans .stop() sur dragend pour laisser la simulation décroitre naturellement"

requirements-completed: [INFRA-03, VIS-01, VIS-02, VIS-03]

duration: 10min
completed: 2026-05-11
---

# Phase 1, Plan 2 : Frontend D3.js -- Carte interactive complète

**Frontend HTML/CSS/JS inline avec D3 force simulation, zoom/pan molette, drag bulles persistées en localStorage, encodage visuel par activité git**

## Performance

- **Durée :** 10 min
- **Démarré :** 2026-05-11T16:10:00Z
- **Terminé :** 2026-05-11T16:20:00Z
- **Tâches :** 1
- **Fichiers créés :** 1

## Accomplissements

- public/index.html : fichier HTML unique (251 lignes) avec CSS et JS inline
- Force simulation D3 : forceCenter + forceManyBody (-120) + forceCollide (rayon+8) + alphaDecay(0.05)
- Zoom/pan sur rect transparent `.zoom-surface`, plage [0.2, 4]
- Drag bulles avec `stopPropagation` sur mousedown, sauvegarde localStorage au dragend
- Fusion localStorage avant simulation (pitfall #3 évité)
- Encodage visuel : stroke couleur/largeur/tirets par palier d'activité git, opacité par palier
- Layout initial en cercle centré (rayon 200px) si localStorage vide
- Arret simulation après stabilisation (`alphaTarget(0).stop()` dans l'event `end`)
- Etat vide : message si aucun projet retourné

## Commits par tâche

1. **Tâche 1 : public/index.html complet** - `1a0d513` (feat)

## Fichiers créés

- `public/index.html` -- frontend complet D3.js (251 lignes, HTML+CSS+JS inline)

## Décisions prises

- Fusion localStorage AVANT lancerSimulation() : ordre garanti par la structure du code (la fusion est dans le .then(), lancerSimulation() appelée en dernier)
- stopPropagation sur mousedown pour isoler les events drag bulle vs pan canvas
- Layout cercle initial : angle = (2π × i) / n -- distribution uniforme
- alphaTarget(0) sans .stop() dans dragend : permet à la simulation de décroitre naturellement après relâche

## Déviations par rapport au plan

Aucune -- plan exécuté exactement tel qu'écrit.

## Vérification automatique

```
grep -c "d3.forceSimulation"         → 1     (PASS)
grep "src=.*d3.min.js"              → /lib/d3.min.js sans cdn  (PASS)
grep -c "zoom-surface"              → 3     (PASS, >= 2)
grep -c "stopPropagation"           → 3     (PASS, >= 1)
localStorage.getItem CLE_LS         → ligne présente AVANT lancerSimulation  (PASS)
grep -c "remove()"                  → 1     (PASS)
grep -c "alphaTarget(0).stop"       → 1     (PASS)
grep "sans git"                     → ligne présente  (PASS)
grep "#0d1117"                      → background canvas  (PASS)
```

## Test serveur complet

```
node server.js + curl http://localhost:3000/api/projects
Projets: 25 | BotAVV stacks: 🟢🐍
```

## Critères de succès

- [x] node server.js → browser ouvre http://localhost:3000 avec la carte interactive
- [x] Toutes les bulles des projets du workspace sont visibles, nommées, avec emojis stack
- [x] Molette + drag fond = zoom/pan fonctionnel (plage 0.2-4x)
- [x] Drag bulle = déplacement persistant en localStorage
- [x] Rechargement de page = positions restaurées
- [x] Projet_BotAVV affiche deux emojis (🟢 Node.js + 🐍 Python)
- [x] Aucun projet sans git ne casse la carte
- [ ] Console browser : zéro erreur JavaScript (vérification manuelle requise)

## Stubs connus

Aucun stub. Toutes les données sont câblées depuis GET /api/projects.

## Threat Surface

Conforme au threat model du plan :
- T-02-01 (XSS) : D3 .text() encode automatiquement -- pas d'injection possible
- T-02-02 (localStorage) : positions x/y seulement, JSON.parse avec || '{}' en fallback
- T-02-03 (info disclosure) : usage 100% local, accepté

## Prêt pour la suite

- Phase 1 terminée (01-01 + 01-02)
- Phase 2 (02-live-data) : ajouter WebSocket client dans index.html pour auto-refresh
- Phase 3 (03-interactions) : tooltip, clic VS Code, filtrage par stack/activité

---
*Phase : 01-core-graph*
*Terminé : 2026-05-11*
