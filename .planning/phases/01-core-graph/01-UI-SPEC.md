---
phase: 1
slug: core-graph
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-11
---

# Phase 1 — Core Graph : Contrat de design UI

> Contrat visuel et d'interaction pour la Phase 1. Généré par gsd-ui-researcher, vérifié par gsd-ui-checker.

---

## Design System

| Propriété | Valeur |
|-----------|--------|
| Tool | none |
| Preset | non applicable |
| Component library | none (vanilla JS/HTML/CSS) |
| Icon library | emojis Unicode natifs (zéro dépendance) |
| Font | system-ui, -apple-system, monospace pour les labels de données |

Source : CONTEXT.md D-04 + CLAUDE.md (pas de build step, pas de framework)

---

## Spacing Scale

Valeurs déclarées (multiples de 4) :

| Token | Valeur | Usage |
|-------|--------|-------|
| xs | 4px | Gap entre emoji stack et texte de bulle |
| sm | 8px | Padding interne texte/bulle |
| md | 16px | Espacement entre labels dans la bulle |
| lg | 24px | Marge interne du canvas |
| xl | 32px | Non utilisé en Phase 1 |
| 2xl | 48px | Non utilisé en Phase 1 |
| 3xl | 64px | Non utilisé en Phase 1 |

Exceptions : aucune. Les touches targets de drag (bulles) sont dimensionnées par le rayon calculé (voir section Bubble Sizing), pas par la grille de spacing.

---

## Typography

| Rôle | Taille | Graisse | Line Height | Police | Usage |
|------|--------|---------|-------------|--------|-------|
| Bubble name | 13px | 600 (semibold) | 1.2 | system-ui | Nom du projet, centré dans la bulle |
| Bubble meta | 11px | 400 (regular) | 1.3 | monospace | Branche git + date relative, sous le nom |
| Stack emoji | 14px | — | — | system-ui | Emoji(s) de stack, au-dessus du nom |
| Sans-git label | 11px | 400 (regular) | 1.3 | monospace | Libellé « sans git » pour projets non-git |

Règles :
– Pas de troncature sur le nom du projet (D-09 : la bulle s'adapte au nom).
– Maximum 2 lignes de meta (branche / date) sous le nom.
– Pas d'autre taille de texte autorisée en Phase 1.

---

## Color

Thème sombre (décision projet : "minimalist, dark theme preferred").

| Rôle | Valeur hex | Usage |
|------|-----------|-------|
| Dominant (60%) | #0d1117 | Background du canvas SVG |
| Secondary (30%) | #161b22 | Remplissage des bulles (cercle SVG `fill`) |
| Accent (10%) | #58a6ff | Contour actif des bulles (< 7 jours), curseur drag |
| Destructive | non applicable | Aucune action destructive en Phase 1 |

**Opacité par palier d'activité** (D-05, source CONTEXT.md) :

| Palier | Condition | Opacité bulle + texte |
|--------|-----------|----------------------|
| Actif | < 7 jours depuis dernier commit | 1.0 |
| Semi-actif | 7 à 30 jours | 0.6 |
| Inactif | > 30 jours | 0.3 |
| Sans git | Aucun repo initialisé | 0.4 (fixe) |

Accent réservé à : contour (`stroke`) des bulles en état actif uniquement. Pas utilisé pour le texte, pas pour le fond, pas pour les états semi-actif/inactif.

Couleurs de contour par état d'activité :

| État | Stroke color | Stroke width |
|------|-------------|-------------|
| Actif | #58a6ff | 2px |
| Semi-actif | #484f58 | 1.5px |
| Inactif | #30363d | 1px |
| Sans git | #6e7681 (tirets) | 1px, stroke-dasharray: 4 2 |

---

## Bubble Sizing

Source : CONTEXT.md D-10 (taille variable dès Phase 1).

Formule de rayon (en pixels) :

```
jours = jours depuis dernier commit (depuis git log)
rayon = clamp(28, 28 + (30 - jours) * 0.8, 56)
```

Cas limites :
– Commit du jour (jours = 0) : rayon = 56px (maximum).
– Commit il y a 30 jours : rayon = 28px (minimum).
– Au-delà de 30 jours : rayon = 28px (plancher).
– Sans git : rayon = 28px (plancher, pas de donnée).

La bulle ne peut pas être plus petite que 28px (lisibilité du nom) ni plus grande que 56px (densité de la carte).

---

## Layout initial

Source : CONTEXT.md D-07, D-08.

– Au premier lancement (localStorage vide) : les bulles sont positionnées en **cercle centré** sur le canvas (rayon du cercle = 200px, bulles équidistantes).
– La force simulation D3 s'exécute jusqu'à stabilisation (`alpha < 0.01`), puis s'arrête (`alphaTarget(0).stop()`).
– Positions sauvegardées dans localStorage avec la clé `map_cc_positions` (objet `{ [projectId]: { x, y } }`).
– Fusion localStorage effectuée **avant** de passer les données à D3 (pitfall #3 CLAUDE.md).

Forces D3 :
– `forceCenter` : centre du canvas SVG.
– `forceCollide` : rayon = rayon bulle + 8px (margin inter-bulle).
– `forceManyBody` : strength = -120 (répulsion douce).
– `forceLink` : non utilisé en Phase 1.

---

## Interactions

### Zoom / Pan (VIS-02)

– Zone de zoom : `<rect class="zoom-surface">` couvrant 100% du SVG (transparent, pointer-events: all).
– Les nœuds vivent dans `<g class="viewport">` transformé par le zoom D3.
– Molette : zoom in/out, plage `[0.2, 4]`.
– Drag canvas : panoramique (drag sur la `<rect>` de fond uniquement).
– `stopPropagation()` sur `mousedown` des nœuds (pitfall #2 CLAUDE.md).

### Drag bubbles (VIS-03)

– `d3.drag()` sur chaque nœud.
– `dragstart` : `alphaTarget(0.3).restart()` pour réactiver la simulation.
– `dragend` : `alphaTarget(0).stop()` + sauvegarde position dans localStorage.
– Curseur : `grab` au hover, `grabbing` pendant le drag.

### États visuels interactifs

| État | Visuel |
|------|--------|
| Hover bulle | Stroke width +1px, brightness(1.1) via CSS filter |
| Drag en cours | Cursor grabbing, bulle légèrement scale(1.05) |
| Canvas drag | Cursor move |

Pas d'animation de transition en Phase 1 (animations soignées = Phase 3, CLAUDE.md Conventions).

---

## Emojis de stack

Source : CONTEXT.md D-04, specifics.

| Stack | Fichier sentinelle | Emoji |
|-------|--------------------|-------|
| Node.js | `package.json` | 🟢 |
| Python | `requirements.txt` ou `pyproject.toml` | 🐍 |
| Rust | `Cargo.toml` | 🦀 |
| Go | `go.mod` | 🐹 |
| Ruby | `Gemfile` | 💎 |
| Java / Kotlin | `pom.xml` ou `build.gradle` | ☕ |
| Inconnu | aucun fichier reconnu | nom du dossier racine (texte, pas d'emoji) |

Multi-stack : afficher tous les emojis détectés séparés par une espace fine (U+2009).

---

## Copywriting Contract

| Élément | Texte |
|---------|-------|
| Titre de page (balise `<title>`) | Map CC Projects |
| Heading visible (aucun en Phase 1) | — |
| État vide (aucun projet scanné) | Aucun projet trouvé dans le workspace. Vérifiez le chemin configuré. |
| État sans git | sans git |
| Branche inconnue | branche inconnue |
| Date inconnue | commit inconnu |
| Erreur serveur (console uniquement) | Impossible de charger les projets : {message erreur} |
| Confirmation destructive | non applicable en Phase 1 |

Langue : tout le texte visible est en français (CLAUDE.md Conventions).

---

## Registry Safety

| Registry | Blocs utilisés | Safety Gate |
|----------|---------------|-------------|
| Aucun — vanilla JS uniquement | — | non applicable |

D3.js v7 vendorisé localement dans `public/lib/d3.min.js`. Pas de CDN, pas de registre de composants tiers.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting : PASS
- [ ] Dimension 2 Visuals : PASS
- [ ] Dimension 3 Color : PASS
- [ ] Dimension 4 Typography : PASS
- [ ] Dimension 5 Spacing : PASS
- [ ] Dimension 6 Registry Safety : PASS

**Approbation :** pending

---

## Sources

| Décision | Source |
|----------|--------|
| Thème sombre | project_context (prompt orchestrateur) |
| Paliers d'opacité (D-05) | CONTEXT.md |
| Taille bulle variable dès Phase 1 (D-10) | CONTEXT.md |
| Emojis de stack (D-04) | CONTEXT.md + specifics |
| Contenu bulle sans troncature (D-09) | CONTEXT.md |
| Layout cercle centré (D-07) | CONTEXT.md |
| Stop simulation après stabilisation (D-08) | CONTEXT.md |
| Sans git label (D-06) | CONTEXT.md |
| Pitfall zoom/drag D3 | CLAUDE.md |
| Pitfall localStorage merge | CLAUDE.md |
| Pitfall memory leak D3 | CLAUDE.md |
| Vanilla JS, pas de build step | CLAUDE.md |
