# State — Map CC Projects

## Current Phase
Phase 1 — Core Graph

## Status
Ready to execute

## Project Reference
See: .planning/PROJECT.md (updated 2026-05-10)

**Core value:** Vue globale de tous les projets Claude Code en un coup d'oeil
**Current focus:** Phase 1

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 — Core Graph |
| Plan | 2 plans créés (01-01, 01-02) |
| Status | Ready to execute |
| Progress | [ ] [ ] [ ] — 0/3 phases |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 3 |
| Phases complete | 0 |
| Plans complete | 0 |
| Requirements mapped | 16/16 |

---

## Accumulated Context

### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-10 | D3.js force graph pour le layout spatial | Algorithme de force adapté aux graphes de bulles, zoom/pan natif, draggable intégré |
| 2026-05-10 | Serveur Node.js + WebSocket | chokidar file watching, push live, pas de polling |
| 2026-05-10 | HTML/CSS/JS vanilla sans framework | One-shot simple, pas de build step, s'ouvre directement dans le browser |

### Technical Notes

- Stack cible : Node.js natif + D3.js v7 + chokidar v5 + ws v8
- Pitfall Phase 2 : EMFILE prevention (limiter les watchers ouverts simultanément)
- Pitfall Phase 2 : merging positions (localStorage vs nouvelles données serveur)
- Pitfall Phase 2 : reconnect backoff WebSocket côté client
- D3 à vendoriser localement dans `/public/vendor/` (pas de CDN, usage local)

### Blockers

None.

---

## Session Continuity

Last updated: 2026-05-11 (phase 1 planifiée)
Stopped at: Phase 1 plans vérifiés (2 plans, 2 vagues)
Resume file: `.planning/phases/01-core-graph/`
Next action: `/gsd-execute-phase 1`
