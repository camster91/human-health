# Human Health implementation roadmap

This roadmap turns the long-term product vision into an incremental delivery plan. The app should remain adaptive, explainable, privacy-conscious, and useful even when real life disrupts the plan.

**Current control state:** planned numbered product phases 0–5 are source-built and merged. Independent hardening is merged through PR #84; follow-up storage-integrity hardening is on draft PR #102. Executable/browser/device/staging verification and production deployment remain separate gates under issue #82.

## Phase 0 — Foundation

1. Architecture and data model
2. Design system and mobile shell
3. Exercise knowledge graph
4. Gym/equipment profiles
5. Upper/lower starter program
6. Workout state machine
7. Local-first persistence and sync strategy
8. Safety, privacy, and observability baseline

## Phase 1 — MVP adaptive training coach

Status: merged.

1. Today screen
2. Live workout logging
3. Rest timer and wake-lock behaviour
4. Previous-performance comparison
5. Exercise substitutions
6. Short-on-time workout adaptation
7. Different-gym adaptation
8. Low-energy / recovery-aware adaptation
9. Plate calculator
10. Progression rules
11. PRs and history
12. Post-workout summary
13. PWA install/offline behaviour
14. Responsive/accessibility QA
15. Deployment and rollback plan

## Phase 2 — Whole-person fitness

Status: merged.

1. Core programming
2. Mobility/flexibility programming
3. Bodyweight skill trees
4. Cardio programming and weekly targets
5. Athleticism/power/balance work
6. Capability map and periodic assessments
7. Recovery/readiness inputs
8. Minimum-effective-day plans
9. Adaptive rolling schedule
10. Travel and life-phase modes

## Phase 3 — Connected health context

Status: merged into `main`; executable/browser/native validation remains separately tracked.

1. Health Connect adapter and explicit native bridge boundary
2. Apple Health adapter plus local XML-export import
3. Sleep and daily-movement ingestion
4. Heart-rate and cardio trend support
5. Optional nutrition/hydration habit support
6. Data provenance and stale/partial/failed sync-state handling
7. Connected-only and complete user-owned import/export
8. Source-scoped deletion and explicit consent controls

## Phase 4 — Coaching intelligence

Status: merged into `main`; release verification remains tracked under #82/#95/#51.

1. Explainable trend detection with evidence/confidence/insufficient-data states
2. Plateau/regression detection and conservative advisory deload logic
3. Multi-goal balancing using Focus / Maintain / Deprioritize / Off without a health score
4. Context-aware recommendations using readiness, recent workload, life mode, history, goals and current connected signals
5. Optional AI-generated narrative constrained to explain deterministic actions rather than change them
6. Conversational adaptation input for time, energy, gym/equipment and goal context
7. Movement/video analysis reliability gate; camera/video analysis remains disabled until every reliability/privacy review passes

## Phase 5 — Long-horizon health platform

Status: merged into `main`. Source hardening is merged through PR #84; follow-up storage/data-integrity hardening continues on draft PR #102. Executable/runtime verification, real external validation evidence and deployment remain separate gates.

1. User/clinician-entered preventive-health reminders and records without invented clinical schedules
2. Clinician-friendly local discussion export with provenance and explicit non-diagnostic framing
3. Capability-model validation registry and fail-closed evidence claim gate; current built-in models remain experimental until real external validation/replication evidence is recorded
4. Privacy-preserving deterministic personal baselines generated on-device with no automatic sharing
5. Versioned scoped integration bundle plus optional explicitly confirmed integration-host contract
6. Regulatory escalation checkpoints that fail closed on ambiguous or high-risk intended use
7. Complete local archive/import/delete coverage for Phase 5 preventive/platform data
8. Independent repository-wide line-by-line review and release-hardening programme

## Post-Phase-5 hardening and release path

This is not a new numbered product phase. It is the evidence and risk-reduction path required before release.

1. Resolve all known Blocker/Critical/High source findings from the independent review.
2. Preserve fail-closed trust boundaries for training, connected-health and preventive/platform storage.
3. Keep complete export, replace recovery, rollback and delete-all truthful across corrupt/legacy storage states.
4. Generate/review a trustworthy npm lockfile and use deterministic `npm ci` (#94).
5. Provide an eligible Human Health runner (#51).
6. Execute TypeScript, complete unit suite, production build and PWA checks.
7. Complete browser/accessibility/device/native-health QA.
8. Rehearse non-production update and rollback.
9. Record the explicit release verdict under #82.
10. Treat production deployment as a separate approval.

## Delivery principles

- Build mobile-first and Figma-first.
- Keep historical data immutable wherever practical.
- Every automatic recommendation must be explainable and reversible.
- Prefer rules and measured data over opaque scoring.
- Treat missing, stale, inferred, imported and manually entered data differently.
- Never silently treat two exercise loads as equivalent across different equipment.
- Safety and recovery override progression.
- Do not turn fitness coaching into medical diagnosis, medication dosing, emergency monitoring or injury clearance.
- Do not call algorithms clinically validated without appropriate evidence for the recorded intended use.
- Do not treat source-complete, verified, release-ready and deployed as synonyms.
- Review the 5–10 year roadmap annually; do not treat speculative future features as fixed commitments.
