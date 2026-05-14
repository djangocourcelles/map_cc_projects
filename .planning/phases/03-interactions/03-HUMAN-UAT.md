---
status: partial
phase: 03-interactions
source: [03-VERIFICATION.md]
started: 2026-05-14T10:00:00Z
updated: 2026-05-14T10:00:00Z
---

## Current Test

[en attente de test humain]

## Tests

### 1. Tooltip au survol (INT-01)
expected: Tooltip visible en haut à droite du curseur, contenant : nom en gras, emojis stack, date relative + branche en monospace, message commit (si présent), point coloré + label phase GSD. Le tooltip suit le curseur et disparaît au mouseout.
result: [pending]

### 2. Pulse au clic et ouverture VS Code (INT-02)
expected: Animation scale(1→1.15→1) visible en ~300ms, VS Code s'ouvre sur le dossier du projet
result: [pending]

### 3. Filtrage temps réel (INT-03)
expected: Saisir "bot" → bulles non-matchées à opacity 0.15 en 200ms. Escape → champ vidé + toutes bulles à opacity 1
result: [pending]

### 4. Thème dark/light
expected: Fond de carte et tooltip s'adaptent automatiquement à prefers-color-scheme sans rechargement
result: [pending]

### 5. Non-régression drag + localStorage
expected: Positions restaurées après rechargement, drag toujours fonctionnel, WebSocket dot vert
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
