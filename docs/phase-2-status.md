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
- [x] Persistent manual activity-dose storage
- [x] Persistent readiness check-ins
- [x] Persistent bodyweight skill-stage selection
- [x] Manual cardio logging and equivalent-minute display
- [x] Quick core/mobility/bodyweight completion logging
- [x] Interactive readiness check UI
- [x] Interactive bodyweight skill selection UI
- [ ] Core programming progression and detailed session logging (#31)
- [ ] Mobility/flexibility progression and targeted session detail (#32)
- [ ] Bodyweight skill assessment history and automatic advancement rules (#33)
- [ ] Cardio prescriptions beyond manual logging (#34)
- [ ] Athleticism/power/balance assessments and progression (#35)
- [ ] Saved readiness automatically modifying workout adaptation (#36)
- [ ] Capability map populated from stored assessments/trends (#37)
- [ ] Adaptive rolling schedule (#38; source blocker #45 addressed, verification pending)
- [ ] Minimum-effective-day recommendation tied to deficits/readiness/time (#39)
- [ ] Travel/return-from-break/life-phase modes (#40)

## Verification rule

New Phase 2 helpers have unit-test coverage in source, but tests have not been executed in this connector session. Do not mark implementation verified until typecheck/tests/build and representative browser QA pass.

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.

## Next implementation order

1. Feed saved readiness into workout adaptation (#36).
2. Turn quick core/mobility/bodyweight sessions into structured logged sessions (#31–#33).
3. Add cardio prescriptions and weekly target-aware recommendations (#34).
4. Add measurable power/balance assessments (#35).
5. Populate the capability map from real observations (#37).
6. Build adaptive rolling scheduling using ended-early state (#38).
7. Use domain gaps + readiness + available time for minimum-effective-day recommendations (#39).
