# Phase 1: Core Graph — Discussion Log

> **Audit trail only.** Ne pas utiliser comme input pour les agents de planning, recherche ou exécution.
> Les décisions sont dans CONTEXT.md — ce log conserve les alternatives considérées.

**Date:** 2026-05-11
**Phase:** 1-Core Graph
**Areas discussed:** Détection de stack, Opacité / activité, Layout initial, Contenu visible sur la bulle

---

## Détection de stack (DATA-04)

### Stacks prioritaires

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Node + Python + autres | package.json, requirements.txt/pyproject.toml, Cargo.toml, go.mod... | ✓ |
| Node + Python suffisent | Juste les deux stacks du workspace | |
| Juste les marqueurs GSD | Détecter .planning/ comme info principale | |

**Choix :** Node + Python + autres

---

### Multi-stack

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Stack principale (heuristique) | Une seule stack, règle de priorité | |
| Toutes les stacks détectées | Afficher ex : "Python, Node" | ✓ |
| Tu décides | Laisser le planificateur choisir | |

**Choix :** Afficher toutes les stacks détectées

---

### Fallback si aucune stack reconnue

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| "Autre" ou étiquette neutre | Label explicite | |
| Rien | Pas d'étiquette stack | |
| Le nom du dossier racine | Toujours informatif | ✓ |

**Choix :** Nom du dossier racine

---

### Marqueur GSD (.planning/)

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Oui, marquer GSD séparément | has_gsd = true si .planning/ existe | |
| Non, pas en Phase 1 | Réserver pour Phase 2 | |
| Tu décides | Laisser le planificateur | ✓ |

**Choix :** Tu décides

---

## Opacité / activité (DATA-01)

### Métrique d'activité

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Jours depuis dernier commit | git log -1 --format=%cr | |
| Nombre de commits ce mois | git log --since | |
| Tu décides | Laisser le planificateur | ✓ |

**Choix :** Tu décides

---

### Variation visuelle

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Paliers discrets | < 7j = 1.0, 7-30j = 0.6, > 30j = 0.3 | ✓ |
| Gradient continu | max(0.2, 1 - jours/60) | |
| Tu décides | Laisser le planificateur | |

**Choix :** Paliers discrets

---

### Projet sans git

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Opacité pleine, pas d'info git | Bulle normale, champs vides | |
| Opacité minimale (inactif par défaut) | 0.3 | |
| Bulle marquée "sans git" | Label explicite | ✓ |

**Choix :** Bulle marquée "sans git"

---

## Layout initial

### Positionnement au premier lancement

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Cercle centré | N bulles en cercle régulier, force affine ensuite | ✓ |
| Force simulation pure (random) | D3 part de positions aléatoires | |
| Grille régulière | Colonnes et lignes équiréparties | |

**Choix :** Cercle centré

---

### Comportement après stabilisation

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| S'arrêter après stabilisation | alphaTarget(0).stop() | ✓ |
| Animation continue légère | Bulles flottent en permanence | |

**Choix :** S'arrêter après stabilisation

---

### Merge localStorage

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Avant D3 (override complet) | Positions localStorage remplacent layout initial | |
| Après stabilisation D3 | Saut visuel possible | |
| Tu décides | Laisser le planificateur (contrainte CLAUDE.md) | ✓ |

**Choix :** Tu décides
**Notes :** CLAUDE.md indique explicitement que la fusion doit se faire AVANT de passer à D3 (pitfall #3).

---

## Contenu visible sur la bulle

### Disposition des infos

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Texte empilé (3 lignes) | Nom + stack + branche/date | |
| Nom seul visible, reste au hover | Plus propre, anticipe Phase 3 | |
| Nom + icône stack, reste en dessous | Nom au centre, tiny text sous la bulle | ✓ |

**Choix :** Nom + icône stack, branche + date en tiny text sous/autour

---

### Type d'icône stack

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Texte court coloré | "PY", "JS", "RS" | |
| Emoji | 🐍 🟢 🦀 — zéro dépendance | ✓ |

**Choix :** Emoji

---

### Troncature du nom

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Tronqué avec ellipsis (15 chars) | Bulle petite, nom complet au hover | |
| Pas de troncature, bulle plus grande | La bulle s'adapte au nom | ✓ |

**Choix :** Pas de troncature

---

### Taille de bulle

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Fixe en Phase 1 | Même rayon pour toutes les bulles | |
| Déjà variable en Phase 1 | Rayon proportionnel à l'activité | ✓ |

**Choix :** Déjà variable en Phase 1 (anticipe VIS-04)

---

## Claude's Discretion

- **Métrique d'activité** : le planificateur choisit (probablement jours depuis dernier commit, réutiliser l'appel `git log` de DATA-02)
- **Merge localStorage** : le planificateur choisit le moment de fusion, en respectant la contrainte CLAUDE.md pitfall #3
- **has_gsd dans l'API** : le planificateur décide d'exposer ou non ce champ en Phase 1

## Deferred Ideas

- Anneau de couleur par phase GSD → Phase 2 (VIS-05)
- WebSocket / auto-refresh → Phase 2 (INT-04)
- Tooltip au survol → Phase 3 (INT-01)
- Clic → ouvrir VS Code → Phase 3 (INT-02)
- Champ de recherche → Phase 3 (INT-03)
