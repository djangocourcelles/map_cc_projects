# Map Project — Carte interactive des projets Claude Code

## What This Is

Une application web locale qui scanne automatiquement le répertoire `/Users/laurent/Documents/CLAUDE_PROJETS/` et affiche tous les projets Claude Code sous forme d'une carte spatiale interactive. Chaque projet est une bulle positionnée dans l'espace, draggable, avec zoom/dézoom. La carte se met à jour en temps réel via un serveur avec file watching.

## Core Value

Avoir en un coup d'œil la vue globale de tous ses projets — statut, activité, phase — sans avoir à ouvrir chaque dossier manuellement.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scanner automatiquement `/CLAUDE_PROJETS/` et détecter tous les projets
- [ ] Afficher chaque projet comme une bulle dans un espace 2D interactif (D3.js force graph)
- [ ] Zoom/dézoom fluide sur la carte
- [ ] Bulles draggables, positions persistées localement (localStorage)
- [ ] Afficher par projet : statut, dernière activité, phase GSD courante, stack tech
- [ ] Auto-refresh en temps réel via file watching (WebSocket)
- [ ] Interface clean & minimaliste, typographie distinctive, animations soignées (frontend-design skill)
- [ ] One-shot : lancer une commande, la carte s'ouvre dans le browser

### Out of Scope

- Modifier les projets depuis la carte — lecture seule, pas d'éditeur intégré
- Authentification — usage strictement local
- Déploiement cloud — outil de développement local uniquement

## Context

- Workspace racine : `/Users/laurent/Documents/CLAUDE_PROJETS/`
- Plusieurs projets avec `.planning/` (GSD workflow) et d'autres sans
- Certains projets ont des fichiers `STATE.md`, `ROADMAP.md` à exploiter pour la phase courante
- Le CLAUDE.md du workspace liste les projets connus : Projet_BotAVV, projetA, SCC, Formations, GitHub, jupyter_notebook
- Stack envisagée : serveur Node.js (ou Python) + HTML/CSS/JS vanilla avec D3.js pour la carte
- Design : appliquer le frontend-design skill — esthétique intentionnelle, typographie distinctive, pas de template générique

## Constraints

- **Local only** : fonctionne uniquement en local, pas de dépendances cloud
- **Performance** : le scan doit être rapide même avec ~20 projets
- **Simplicité d'usage** : une seule commande pour lancer, s'ouvre dans le browser automatiquement
- **Persistance légère** : localStorage pour les positions des bulles, pas de base de données

## Key Decisions

| Décision | Rationale | Outcome |
|----------|-----------|---------|
| D3.js force graph pour le layout spatial | Algorithme de force adapté aux graphes de bulles, zoom/pan natif, draggable intégré | — Pending |
| Serveur Node.js + WebSocket pour l'auto-refresh | File watching natif avec `chokidar`, WebSocket léger pour push les mises à jour | — Pending |
| HTML/CSS/JS vanilla (pas de framework) | One-shot simple, pas de build step, s'ouvre directement dans le browser | — Pending |
| frontend-design skill pour l'UI | Éviter l'esthétique générique IA, typographie et animations distinctives | — Pending |

## Evolution

Ce document évolue aux transitions de phase et aux jalons.

**Après chaque transition de phase** (via `/gsd-transition`) :
1. Requirements invalidés ? → Déplacer vers Out of Scope avec raison
2. Requirements validés ? → Déplacer vers Validated avec référence de phase
3. Nouveaux requirements apparus ? → Ajouter à Active
4. Décisions à logger ? → Ajouter à Key Decisions
5. « What This Is » toujours exact ? → Mettre à jour si dérivé

**Après chaque jalons** (via `/gsd-complete-milestone`) :
1. Revue complète de toutes les sections
2. Vérification Core Value — toujours la bonne priorité ?
3. Audit Out of Scope — raisons toujours valides ?
4. Mettre à jour Context avec l'état courant

---
*Last updated: 2026-05-10 after initialization*
