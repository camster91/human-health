# Phase 2 status

Phase 2 expands Human Health from an adaptive strength coach into a whole-person fitness system while keeping recommendations measurable, explainable, and reversible.

## Dependency note

Phase 2 is branched from `phase-1-adaptive-training-coach` so work can proceed without merging unverified Phase 1 code. Phase 1 PR #44 remains draft and must pass its verification gate independently.

## Review findings carried from Phase 1

- #45 ended-early workout status: source fix implemented on Phase 1 and carried into Phase 2; verification pending.
- #46 live pain/discomfort flag: source fix implemented on Phase 1 and carried into Phase 2; verification pending.
- #47 wake-lock: Screen Wake Lock API baseline implemented with feature detection and graceful fallback; browser/device verification pending.

## Phase 2 implementation

- [x] Canonical capability domains
- [x] Initial measurable capability metrics
- [x] Weekly fitness target model
- [x] Pull-up and push-up skill-tree foundation
- [x] Core, mobility, cardio, bodyweight, power/balance micro-session catalogue
- [x] Minimum-effective-session selection helper
- [x] Weekly domain-minute calculation
- [x] Readiness decision baseline with conservative pain/illness guardrails
- [x] Cardio moderate-equivalent minute helper
- [x] Bodyweight skill-step progression helper
- [x] Whole-person Today panel
- [x] Capability-map baseline UI in Progress
- [ ] Full core programming UI and logging (#31)
- [ ] Full mobility/flexibility programming UI and logging (#32)
- [ ] Bodyweight skill-tree UI, assessments, and stored progression (#33)
- [ ] Cardio logging, weekly target progress, and session programming UI (#34)
- [ ] Athleticism/power/balance assessments and progression (#35)
- [ ] Recovery/readiness input UI and persistence (#36)
- [ ] Capability map with stored assessments/trends (#37)
- [ ] Adaptive rolling schedule (#38; source blocker #45 addressed, verification pending)
- [ ] Minimum-effective-day interactive mode (#39)
- [ ] Travel/return-from-break/life-phase modes (#40)

## Verification rule

New Phase 2 helpers have unit-test coverage in source, but tests have not been executed in this connector session. Do not mark implementation verified until typecheck/tests/build and representative browser QA pass.

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.
