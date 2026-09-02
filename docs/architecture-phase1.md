# Phase 1 architecture

## Decision

Human Health Phase 1 is a mobile-first Next.js + TypeScript static-export PWA. The active workout is local-first so gym use does not depend on network availability. The domain model is separated from UI code so server sync and health-platform adapters can be added later without rewriting workout logic.

## Boundaries

- `lib/domain.ts`: canonical Phase 1 domain types
- `lib/program.ts`: exercise graph, gym profiles, starter program
- `lib/engine.ts`: deterministic adaptation, progression, summaries, plate loading
- `lib/storage.ts`: local workout/history persistence
- `app/`: presentation and live workout runtime
- `public/sw.js`: offline cache baseline

## Data integrity

Completed workout history is append-only from the UI. Exercise substitutions retain `originalId` and never copy numeric load history across variants. Automatic coaching decisions are derived from logged data and remain reversible by the user.

## Future sync

A server adapter can later persist users, programs, workouts, observations, and provenance. Local active-workout state remains the source of truth while a workout is in progress; reconciliation must never silently overwrite a newer local workout.

## Safety boundary

Phase 1 provides fitness training guidance. Pain flags block progression recommendations. It does not diagnose injury, provide medical clearance, or make medication decisions.
