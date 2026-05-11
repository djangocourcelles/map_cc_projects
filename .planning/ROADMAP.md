# ROADMAP — Map CC Projects

**Projet :** Map CC Projects
**Créé :** 2026-05-10
**Granularité :** Coarse (3 phases)
**Couverture :** 16/16 requirements v1

---

## Phases

- [x] **Phase 1 : Core Graph** - Serveur Node.js + carte D3.js statique avec toutes les données projet
- [ ] **Phase 2 : Live Data** - Encodage visuel de l'activité et mise à jour temps réel via WebSocket
- [ ] **Phase 3 : Interactions** - Tooltip, ouverture VS Code, filtrage par nom

---

## Phase Details

### Phase 1: Core Graph
**Goal:** L'utilisateur peut lancer une commande et voir une carte interactive de tous ses projets avec leurs données essentielles
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** INFRA-01, INFRA-02, INFRA-03, VIS-01, VIS-02, VIS-03, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria**:
  1. `node server.js` depuis le terminal ouvre automatiquement la carte dans le browser
  2. Chaque projet du workspace apparaît comme une bulle nommée sur la carte D3.js
  3. L'utilisateur peut zoomer, dézoomer et panoramiquer la carte à la molette et au drag
  4. L'utilisateur peut déplacer les bulles, et leurs positions sont restaurées au rechargement
  5. Chaque bulle affiche le nom, la stack tech détectée, la branche git courante et la date du dernier commit en relatif
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Backend Node.js : npm, scanner.js (extraction git + stack), server.js (API + statique + auto-browser)
- [x] 01-02-PLAN.md — Frontend D3.js : public/index.html (carte interactive, zoom/pan, drag, localStorage)
**UI hint:** yes

### Phase 2: Live Data
**Goal:** La carte reflète l'état réel des projets en temps réel — activité encodée visuellement, mises à jour automatiques sans rechargement
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** VIS-04, VIS-05, INT-04
**Success Criteria**:
  1. La taille d'une bulle est proportionnelle à l'activité récente (grand = actif, petit = inactif)
  2. L'anneau coloré d'une bulle change de couleur selon la phase GSD lue dans `.planning/STATE.md`
  3. Quand un fichier du workspace change, la carte se met à jour dans les 3 secondes sans rechargement manuel
**Plans:** TBD

### Phase 3: Interactions
**Goal:** L'utilisateur peut explorer la carte et agir sur les projets directement depuis l'interface
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** INT-01, INT-02, INT-03
**Success Criteria**:
  1. Survoler une bulle affiche un tooltip avec branche, dernier commit, stack et phase GSD
  2. Cliquer une bulle ouvre le dossier du projet dans VS Code
  3. Saisir un terme dans le champ de recherche filtre les bulles visibles en temps réel
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Graph | 2/2 | Complete | 2026-05-11 |
| 2. Live Data | 0/? | Not started | - |
| 3. Interactions | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase | Notes |
|-------------|-------|-------|
| INFRA-01 | Phase 1 | Serveur + scan `/CLAUDE_PROJETS/` |
| INFRA-02 | Phase 1 | `node server.js` → browser auto |
| INFRA-03 | Phase 1 | HTML unique, D3 vendorisé, sans build |
| VIS-01 | Phase 1 | Bulles D3.js force simulation |
| VIS-02 | Phase 1 | Zoom/pan molette + drag canvas |
| VIS-03 | Phase 1 | Drag bulles + localStorage |
| DATA-01 | Phase 1 | Nom + opacité activité |
| DATA-02 | Phase 1 | `git log` → date relative |
| DATA-03 | Phase 1 | `git rev-parse` → branche |
| DATA-04 | Phase 1 | Détection stack par fichiers sentinelles |
| VIS-04 | Phase 2 | Rayon bulle = jours depuis dernier commit |
| VIS-05 | Phase 2 | Anneau = phase GSD depuis STATE.md |
| INT-04 | Phase 2 | WebSocket + chokidar file watching |
| INT-01 | Phase 3 | Tooltip au survol |
| INT-02 | Phase 3 | Clic → `code /path` |
| INT-03 | Phase 3 | Champ recherche filtre bulles |

**Couverture v1 : 16/16 ✓**

---
*Roadmap créée : 2026-05-10*
*Mise à jour : 2026-05-11 — Phase 01 complète (01-01 backend Node.js + 01-02 frontend D3.js)*
