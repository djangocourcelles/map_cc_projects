# Phase 3: Interactions - Discussion Log

> **Audit trail only.** Ne pas utiliser comme input pour les agents de planification, recherche ou exécution.
> Les décisions sont dans CONTEXT.md — ce log conserve les alternatives considérées.

**Date:** 2026-05-12
**Phase:** 3-Interactions
**Areas discussed:** Tooltip — style & comportement, Ouverture VS Code — mécanisme, Filtrage — comportement & portée, Thème visuel global

---

## Tooltip — style & comportement

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Dark card opaque | Fond #1a1a2e, texte clair | |
| Glassmorphism | Fond semi-transparent + backdrop-blur | |
| Délégué au frontend-design skill | Le skill choisit selon l'esthétique globale | ✓ |

**Fond et style :** Délégué au frontend-design skill.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Suit le curseur (+12, -20) | Repositionnement via mousemove | ✓ |
| Ancré à la bulle | Position fixe par rapport à la bulle | |

**Position :** Suit le curseur.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Instantané (0ms) | Apparaît dès le mouseover | |
| Délai court + fade-in | 150ms délai, opacity 0→1 en 200ms | |
| Délégué au frontend-design skill | Calibré en cohérence avec les 400ms | ✓ |

**Délai/animation :** Délégué au frontend-design skill.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Exactement INT-01 | Branche, commit, stack, phase GSD | ✓ |
| Ajouter le chemin | Chemin absolu du projet | |
| Ajouter la date du commit | Date relative ou absolue | |

**Contenu :** INT-01 strict + nom du projet en titre (ajouté via question suivante).

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Oui — nom du projet en titre | Nom du dossier en haut du tooltip | ✓ |
| Non — juste les 4 champs | Pas de répétition du nom | |

**Notes :** L'utilisateur veut le nom du projet en titre principal (grand, en haut), puis les 4 champs INT-01 en dessous.

---

## Ouverture VS Code — mécanisme

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Requête HTTP au serveur Node.js | fetch('/open?path=...') → exec shell | ✓ |
| URI handler vscode:// | window.open('vscode://file/path') | |
| Les deux (HTTP fallback) | Complexité inutile | |

**Mécanisme :** HTTP → Node.js → shell.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Pulse bref | Scale 1→1.15→1 en 300ms | ✓ |
| Aucun feedback | Minimaliste | |
| Toast notification | Message flottant 2s | |

**Feedback :** Pulse bref sur la bulle.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Console.error serveur, silencieux client | Outil local | ✓ |
| Toast d'erreur discret | Message rouge 3s | |

**Erreur :** Silencieux côté client.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| GET /open?path=... | Query string | ✓ |
| POST /open avec body JSON | REST strict | |

**Route :** `GET /open?path=...`

---

## Filtrage — comportement & portée

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Estompage (opacity 0.15) | Carte reste visible, contexte spatial préservé | ✓ |
| Disparition (exit D3) | Suppression du DOM, simulation se réorganise | |
| Rétrécissement | Compression à un point | |

**Bulles non-matchées :** Estompage.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Nom du projet uniquement | Strictement INT-03 | ✓ |
| Nom + stack | Recherche multi-champs | |
| Nom + stack + phase GSD | Plein-texte | |

**Portée :** Nom uniquement.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Coin supérieur gauche, overlay flottant | position fixed | ✓ |
| Coin supérieur droit | Si autres contrôles en haut à gauche | |
| Délégué au frontend-design skill | Composition globale | |

**Position :** Coin supérieur gauche, position fixed.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Toutes bulles à opacity 1 | État initial restauré | ✓ |
| Escape vide + restaure | Pareil + raccourci clavier | |
| Champ vide = 0 résultats | Comportement inhabituel | |

**Champ vidé :** Retour à opacity 1.

---

## Thème visuel global

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Dark mode uniquement | Fond sombre | |
| Light mode uniquement | Fond clair | |
| Suit le système (prefers-color-scheme) | S'adapte au thème macOS | ✓ |

**Mode :** prefers-color-scheme.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Délégué au frontend-design skill | Liberté totale | ✓ |
| Minimaliste et technique | Monospace, dashboard dev | |
| Spatial et lumineux | Glow effects, dark cosmos | |

**Direction esthétique :** Délégué au frontend-design skill.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Délégué au frontend-design skill | Composition globale | ✓ |
| Fond uni simple | Sans texture | |
| Grille de points (dot grid) | Pattern discret | |

**Fond carte :** Délégué au frontend-design skill.

| Option | Description | Sélectionné |
|--------|-------------|-------------|
| Aucune référence, carte blanche | Identité distinctive | ✓ |
| Linear.app | Dark, spacieux, clean | |
| Vercel Dashboard | Minimaliste, data-dense | |

**Référence de style :** Aucune.

---

## Claude's Discretion

- Style exact du tooltip (fond, rayon, ombre, typographie, padding)
- Timing précis du délai d'apparition et fade-in du tooltip
- Style du champ de recherche (couleur, bordure, focus state, placeholder)
- Fond de la carte (uni / grille / gradient) — dark ET light
- Valeurs exactes des deux jeux de couleurs CSS pour `prefers-color-scheme`

## Deferred Ideas

- Filtre multi-champs (stack, phase GSD) — hors-scope INT-03
- Toast d'erreur si VS Code absent — non retenu
- Raccourci Escape pour vider le filtre — laissé à la discrétion du planner
