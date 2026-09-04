# Phase 4 status — Coaching intelligence

## Source scope status: COMPLETE AND REVIEWED

Phase 4 builds a deterministic-first coaching layer on top of the merged training, whole-person fitness, and connected-health foundation. Draft PR: #80.

### Implemented
- [x] Explainable strength, cardio, consistency, recovery and connected-health trend evidence
- [x] Explicit confidence/sample windows and insufficient-data states
- [x] Connected-health directions remain value-neutral; current up/down signals are not labelled medically better or worse
- [x] Comparable primary-lift plateau/regression detection
- [x] Advisory deload only after repeated performance evidence aligns with constrained recovery data
- [x] Multi-goal planning from Focus / Maintain / Deprioritize / Off preferences
- [x] Context-aware actions using readiness, recent workload concentration, life mode, consistency and user priorities
- [x] Stale/partial/failed connected-health signals remain visible but cannot drive a current action
- [x] Deterministic recommendation is the source of truth
- [x] Optional AI explanation provider receives fixed actions/evidence/safety rules and can only provide narrative
- [x] Optional AI provider is an explicit integration boundary; no provider/API key is bundled
- [x] Conversational parser for time, energy, travel/return/maintenance, gym/equipment constraints and goal hints
- [x] Conversational input generates a reversible workout preview using the existing adaptive workout/readiness/workload engines
- [x] Conversation previews do not mutate history, preferences or schedule state
- [x] Symptom/medication/insulin/treatment language withholds the workout preview and routes to a safety boundary
- [x] Movement/video analysis reliability gate; no camera/video runtime is enabled by default
- [x] Dedicated `/coach/` route and global Coach/Health quick routes
- [x] Coach route added to offline/PWA cache/check expectations
- [x] Source tests for plateau/deload, multi-goal planning, connected-data freshness/value-neutral direction, recovery-first actions, recent workload, life modes, conversation parsing/planning, AI contract and video gate
- [x] Phase 4 safety/privacy boundary documented

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
Phase 4 is **source-complete and source-reviewed**. It is not release-verified until executable and browser gates pass. PR #80 remains draft/unmerged. No production deployment is implied by source completion.
