---
status: partial
phase: 02-live-data
source: [02-VERIFICATION.md]
started: 2026-05-11T00:00:00Z
updated: 2026-05-11T00:00:00Z
---

## Current Test

[en attente de vérification humaine]

## Tests

### 1. Mise à jour carte après modification STATE.md
expected: La carte se met à jour automatiquement en moins de 3 secondes après avoir modifié un fichier STATE.md dans n'importe quel projet du workspace
result: [en attente]

### 2. Dot WebSocket selon état de connexion
expected: Le point de statut WebSocket en bas à gauche est vert (connexion active), orange (reconnexion en cours), rouge (échec définitif après backoff maximal)
result: [en attente]

### 3. Anneaux GSD colorés visibles dans le browser
expected: Chaque bulle de projet ayant un STATE.md affiche un anneau coloré correspondant à la phase GSD courante (bleu=in-progress, vert=complete, gris=planned, jaune=paused, rouge=blocked)
result: [en attente]

### 4. Différence de taille des bulles visible
expected: Les projets actifs (commit récent) ont des bulles nettement plus grandes (50px) que les projets inactifs (12px), avec des tailles intermédiaires visibles pour 7, 30 et 90 jours
result: [en attente]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
