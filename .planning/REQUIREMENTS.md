# Requirements : Map CC Projects

**Défini :** 2026-05-10
**Core Value :** Avoir en un coup d'oeil la vue globale de tous ses projets Claude Code — statut, activité, phase — sans ouvrir chaque dossier.

## v1 Requirements

### Visualisation

- [ ] **VIS-01** : L'utilisateur voit tous les projets sous forme de bulles dans un espace 2D (D3.js force simulation)
- [ ] **VIS-02** : L'utilisateur peut zoomer/dézoomer et panoramiquer la carte (molette + drag canvas)
- [ ] **VIS-03** : L'utilisateur peut déplacer les bulles à la main, positions sauvegardées (localStorage)
- [ ] **VIS-04** : La taille de chaque bulle reflète l'activité récente (radius = jours depuis dernier commit)
- [ ] **VIS-05** : L'anneau coloré de chaque bulle indique la phase GSD courante (depuis `.planning/STATE.md`)

### Données projet

- [ ] **DATA-01** : Le nom du projet est affiché sur la bulle, son opacité reflète l'activité (actif/inactif)
- [ ] **DATA-02** : La date du dernier commit est extraite via `git log` et affichée en relatif ("il y a 3 jours")
- [ ] **DATA-03** : La branche git courante est détectée et affichée (`git rev-parse --abbrev-ref HEAD`)
- [ ] **DATA-04** : La stack tech est détectée automatiquement (package.json → Node, requirements.txt → Python, etc.)

### Interactions

- [ ] **INT-01** : Un tooltip apparaît au survol de chaque bulle (branche, dernier commit, stack, phase GSD)
- [ ] **INT-02** : Un clic sur une bulle ouvre le projet dans VS Code (`code /path/to/project`)
- [ ] **INT-03** : Un champ de recherche filtre les bulles par nom de projet
- [ ] **INT-04** : La carte se met à jour en temps réel via WebSocket quand un projet change (chokidar)

### Infrastructure

- [ ] **INFRA-01** : Le serveur Node.js scanne `/CLAUDE_PROJETS/` au démarrage et expose `GET /api/projects`
- [ ] **INFRA-02** : Une seule commande lance le serveur et ouvre le browser automatiquement (`node server.js`)
- [ ] **INFRA-03** : Le frontend est un fichier HTML unique, sans build step, D3 vendorisé localement

## v2 Requirements

### Améliorations visuelles

- **VIS-06** : Groupement / clustering des projets par stack tech
- **VIS-07** : Mode plein écran sans chrome navigateur
- **VIS-08** : Thème sombre/clair basculable

### Données enrichies

- **DATA-05** : Indicateur de working tree dirty (anneau ambré)
- **DATA-06** : Première ligne du README comme sous-titre dans le tooltip
- **DATA-07** : Nombre de commits ce mois

### Interactions avancées

- **INT-05** : Filtre par phase GSD (pas seulement par nom)
- **INT-06** : Filtre par stack tech
- **INT-07** : Export de la carte en PNG

## Out of Scope

| Feature | Raison |
|---------|--------|
| Modifier les projets depuis la carte | Outil lecture seule — éviter la complexité d'un éditeur |
| Authentification | Usage local uniquement |
| Déploiement cloud / partage | Données locales sensibles |
| GitHub API | `git` CLI local suffisant, pas de token à gérer |
| Application mobile | Web browser local, inutile |
| Multi-utilisateurs | Outil personnel local |

## Traceabilité

| Requirement | Phase | Statut |
|-------------|-------|--------|
| INFRA-01 | Phase 1 — Core Graph | Pending |
| INFRA-02 | Phase 1 — Core Graph | Pending |
| INFRA-03 | Phase 1 — Core Graph | Pending |
| VIS-01 | Phase 1 — Core Graph | Pending |
| VIS-02 | Phase 1 — Core Graph | Pending |
| VIS-03 | Phase 1 — Core Graph | Pending |
| DATA-01 | Phase 1 — Core Graph | Pending |
| DATA-02 | Phase 1 — Core Graph | Pending |
| DATA-03 | Phase 1 — Core Graph | Pending |
| DATA-04 | Phase 1 — Core Graph | Pending |
| VIS-04 | Phase 2 — Live Data | Pending |
| VIS-05 | Phase 2 — Live Data | Pending |
| INT-04 | Phase 2 — Live Data | Pending |
| INT-01 | Phase 3 — Interactions | Pending |
| INT-02 | Phase 3 — Interactions | Pending |
| INT-03 | Phase 3 — Interactions | Pending |

**Couverture :**
- Requirements v1 : 16 total
- Mappés aux phases : 16
- Non mappés : 0 ✓

---
*Requirements définis : 2026-05-10*
*Dernière mise à jour : 2026-05-10 après création roadmap*
