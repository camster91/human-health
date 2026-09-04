# Phase 4 status — Coaching intelligence

## Source scope status: COMPLETE AND REVIEWED

Phase 4 builds a deterministic-first coaching layer on top of the merged training, whole-person fitness, and connected-health foundation.

### Implemented
- [x] Explainable strength, cardio, consistency, recovery and connected-health trend evidence
- [x] Explicit confidence/sample windows and insufficient-data states
- [x] Comparable primary-lift plateau/regression detection
- [x] Advisory deload only after repeated performance evidence aligns with constrained recovery data
- [x] Multi-goal planning from Focus / Maintain / Deprioritize / Off preferences
- [x] Context-aware actions using readiness, recent workload concentration, life mode, consistency and user priorities
- [x] Stale/partial/failed connected-health signals remain visible but cannot drive a current action
- [x] Deterministic recommendation is the source of truth
- [x] Optional AI explanation provider receives fixed actions/evidence/safety rules and can only provide narrative
- [x] Conversational parser for time, energy, travel/return/maintenance, gym/equipment constraints and goal hints
- [x] Symptom/medication/insulin language is routed to a safety boundary rather than medical coaching
- [x] Movement/video analysis reliability gate; no camera/video runtime is enabled by default
- [x] Dedicated `/coach/` route and global Coach/Health quick routes
- [x] Coach route added to offline/PWA cache/check expectations
- [x] Source tests for plateau/deload, multi-goal planning, stale connected data, recovery-first actions, conversation parsing, AI contract and video gate

## Verification still required
- [ ] eligible Human Health Actions runner executes verification (#51/#78)
- [ ] TypeScript check
- [ ] complete unit-test suite
- [ ] production static build
- [ ] PWA static checks including `/coach/`
- [ ] mobile/tablet/desktop Coach route QA
- [ ] keyboard/focus/labels/contrast review
- [ ] browser persistence/connected-health integration review on final candidate
- [ ] optional AI provider integration validation if one is connected

## Deliberately gated
Movement/video analysis remains disabled until benchmark quality, false-positive risk, device performance, privacy, retention and accessibility reviews all pass. Passing the configuration gate alone does not authorize a camera/video implementation.

## Completion definition
Phase 4 is **source-complete and source-reviewed**. It is not release-verified until executable and browser gates pass. No merge or production deployment is implied by source completion.
