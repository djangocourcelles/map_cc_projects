---
sketch: 001
name: structure-carte
question: "Comment grouper visuellement les projets par état d'activité ?"
winner: null
tags: [d3, force-simulation, clusters, couleurs, activite]
---

# Sketch 001 : Structure carte

## Question de design
Remplacer le nuage non structuré par une organisation visuelle claire + palette franche.

## Ouvrir
```
open .planning/sketches/001-structure-carte/index.html
```

## Variantes
- **A: Anneaux concentriques** — forceRadial, 3 zones guidées par des cercles en tirets. Centre = actifs, milieu = récents, périphérie = inactifs.
- **B: Clusters colonnes** — forceX par groupe, 3 colonnes avec titres. Structure lisible comme un Kanban.
- **C: Force libre améliorée** — même layout organique qu'actuellement, mais avec couleurs franches + nom + jours + halo pour les actifs. Baseline améliorée.

## Ce qu'on compare
- Lisibilité de l'état d'activité au premier coup d'œil
- Sentiment d'ordre (A et B) contre sentiment organique (C)
- Densité : est-ce que les labels nom+jours encombrent ?
