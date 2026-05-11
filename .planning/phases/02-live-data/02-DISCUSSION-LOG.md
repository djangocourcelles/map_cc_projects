# Phase 2: Live Data - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 02-live-data
**Areas discussed:** Taille des bulles (VIS-04), Palette GSD / anneaux (VIS-05), Déclencheurs du rescan (INT-04), Transitions D3 + reconnexion WS

---

## Taille des bulles (VIS-04)

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Les deux (opacité + taille) | Double signal, phase 1 a le code d'opacité, on ajoute le radius | |
| Taille seulement | On supprime l'opacité, radius seul encode l'activité | ✓ |

**Choix :** Taille seulement — l'opacité est supprimée comme encodage d'activité.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Logarithmique | r = rMax - k·log(jours+1), compresse les grandes valeurs | |
| Linéaire à paliers | Catégoriel : aujourd'hui/< 7j/< 30j/< 90j/au-delà | ✓ |
| Tu décides | Claude calibre les valeurs exactes | |

**Choix :** Linéaire à paliers.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| 5 paliers — 50/40/30/20/12 px | Aujourd'hui=50, <7j=40, <30j=30, <90j=20, ≥90j=12 | ✓ |
| 3 paliers — 45/30/15 px | Actif/Récent/Inactif — plus simple, moins granulaire | |
| Tu décides | Claude calibre | |

**Choix :** 5 paliers — 50/40/30/20/12 px.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Taille min (12 px) + opacity 0.4 | Distingue de projets inactifs avec git | ✓ |
| Taille min (12 px) + opacity 1.0 | Pleinement visible, pas de punition visuelle | |

**Choix :** 12 px + opacity 0.4 pour projets sans git.

---

## Palette GSD / anneaux (VIS-05)

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Couleurs sémantiques vives | bleu/vert/gris/orange/rouge selon statut | ✓ |
| Palette pastel douce | Mêmes sémantiques, tons désaturés | |
| Tu décides les hex | Claude choisit les codes couleur exacts | |

**Choix :** Couleurs sémantiques vives.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Anneau gris tireté | Distingue "pas de GSD" de "not-started" (qui a un STATE.md) | ✓ |
| Anneau gris plein | Identique à not-started, plus simple mais ambigu | |

**Choix :** Anneau gris neutre tireté pour projets sans STATE.md.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| 3 px fixe | Visible sans écraser la bulle, cohérent sur toutes tailles | ✓ |
| Proportionnel au radius (10%) | Plus vivant, plus complexe à implémenter | |

**Choix :** 3 px fixe.

---

## Déclencheurs du rescan (INT-04)

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Ciblé : STATE.md + .git/COMMIT_EDITMSG | Moins de réveils inutiles, pas de risque EMFILE | ✓ |
| Tout le workspace (depth: 2) | Plus réactif, mais risque EMFILE et bruit | |

**Choix :** Watch ciblé sur `**/.planning/STATE.md` et `**/.git/COMMIT_EDITMSG`.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Rescan partiel (projet affecté) | Optimisation, broadcast diff partiel | |
| Rescan total du workspace | Plus simple, acceptable pour 25 projets | ✓ |

**Choix :** Rescan total à chaque changement.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| 300ms (convention CLAUDE.md) | Déjà décidé, évite les rafales | |
| 500ms | Plus conservateur contre auto-save agressifs | ✓ |

**Choix :** 500ms (déroge à CLAUDE.md de façon explicite).

---

## Transitions D3 + reconnexion WS

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Transition animée ~400ms | Taille et couleur s'animent, attire l'attention sur les changements | ✓ |
| Snap instantané | Mise à jour immédiate, plus brutal | |

**Choix :** Transition animée 400ms.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Reconnexion avec backoff | 1s → 2s → 4s… plafond 30s | ✓ |
| Reconnexion simple (retry 2s) | Plus simple, spamme les logs si serveur arrêté longtemps | |

**Choix :** Backoff exponentiel.

---

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Petit dot coloré bas à droite | Vert/orange/rouge, discret, toujours visible | ✓ |
| Texte flottant temporaire | 'Mise à jour…' 2s puis disparaît, plus intrusif | |

**Choix :** Dot coloré en bas à droite.

---

## Claude's Discretion

- Codes hex exacts des couleurs sémantiques (lisibilité sur fond sombre/clair)
- Format JSON du message WebSocket (schema interne du broadcast)
- Gestion d'erreurs chokidar (ENOENT si un projet est supprimé pendant le watch)

## Deferred Ideas

- Rescan partiel (diff par projet) — écarté au profit du rescan total, à reconsidérer en Phase 3 si perf insuffisante
- Animations riches (pulse sur changement, badge de notification) — Phase 3
- Filtrage par statut GSD ou stack — Phase 3 (Interactions)
