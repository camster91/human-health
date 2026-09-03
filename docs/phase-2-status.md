# Phase 2 status

Phase 2 expands Human Health from an adaptive strength coach into a whole-person fitness system while keeping recommendations measurable, explainable, and reversible.

## Dependency note
Phase 2 is branched from `phase-1-adaptive-training-coach`. Phase 1 PR #44 remains draft and must pass verification independently. #49 tracks reconciliation with the latest Phase 1 head before merge-readiness.

## Implemented in source
- [x] Whole-person domains: strength, cardio, mobility, core, bodyweight, balance, power, movement, recovery, consistency
- [x] Upper/lower adaptive workout backbone, substitutions, gym profiles, time/energy adaptation, rolling schedule
- [x] Readiness checks, seven-day trend, pain/illness guardrails, reduced/recovery modes
- [x] Cardio equivalent minutes, weekly target, easy/steady/interval choices
- [x] Cross-domain fatigue coordination: demanding lower-body work within 36 hours removes hard intervals and suppresses extra jump/power fatigue
- [x] Core and upper/lower mobility progression tracks
- [x] Pull-up/push-up assessment-driven progression; pain blocks advancement
- [x] Athletic power/balance/carry programming and benchmark-driven progression
- [x] Capability assessments and longitudinal strength/cardio trend views
- [x] Periodic retest workflow
- [x] Normal, travel, return-to-training, maintenance, and minimum-effective-day planning
- [x] Recent lower-body workload is visible in coaching rationale rather than silently changing recommendations
- [x] Source-level tests cover load coordination, readiness, cardio choices, skill progression, athletic progression, capability trends, and rolling scheduling
- [x] Verification workflow files exist on Phase 1/2 branches

## Still blocked / awaiting verification
- [ ] #51: observe a real GitHub Actions typecheck/test/build run; Actions currently reports no runs
- [ ] #49: reconcile Phase 2 with the latest verified Phase 1 head
- [ ] PWA/offline behaviour QA
- [ ] Representative mobile/tablet/desktop browser QA
- [ ] Screen Wake Lock real-device/browser verification

## Verification rule
Do not call either phase verified or merge-ready until typecheck, unit tests, production build, PWA/offline QA, and representative browser QA pass after branch reconciliation.

## Design and safety rule
Capability domains remain independently measurable rather than being collapsed into a universal medical health score. Recovery and pain signals constrain training recommendations but do not diagnose conditions or prescribe medication.

## Next implementation order
1. Continue tightening cross-domain workload coordination and recovery-aware recommendations while CI is blocked.
2. Resolve #51 and inspect the first actual verification result.
3. Reconcile Phase 2 with verified Phase 1 (#49).
4. Repeat CI after reconciliation.
5. Complete PWA/browser/device QA.
6. Only then decide whether PRs leave draft; deployment remains a separate explicit approval.
