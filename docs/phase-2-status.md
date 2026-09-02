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
- [x] Persistent capability assessments and progression-track state
- [x] Manual cardio logging and equivalent-minute display
- [x] Target-aware cardio prescription baseline (#34)
- [x] Quick core/mobility/bodyweight completion logging
- [x] Structured core progression tracks and session logging baseline (#31)
- [x] Structured lower/upper mobility progression tracks and session logging baseline (#32)
- [x] Interactive readiness check UI
- [x] Interactive bodyweight skill selection UI
- [x] Saved readiness modifies workout volume and pauses progression guidance when recovery signals are low (#36 baseline)
- [x] Pain flagged during a workout immediately pauses progression guidance for the remainder of the session
- [x] Capability assessment entry for pull-ups, hangs, ankle mobility, balance, and jump (#35/#37 baseline)
- [x] Capability map reads latest assessment and measurable change over time (#37 baseline)
- [ ] Bodyweight skill assessment criteria and automatic advancement rules (#33)
- [ ] Richer cardio session types/intensity prescriptions (#34)
- [ ] Power/balance programming beyond benchmark capture (#35)
- [ ] Recovery/readiness trend history and richer adaptation rules (#36)
- [ ] Capability map strength/cardio trend normalization and periodic assessment workflow (#37)
- [x] Adaptive rolling schedule baseline (#38; ended-early state supported in source)
- [ ] Minimum-effective-day recommendation tied to deficits/readiness/time (#39)
- [ ] Travel/return-from-break/life-phase modes (#40)

## Verification rule

New Phase 2 helpers have unit-test coverage in source, but tests have not been executed in this connector session. Do not mark implementation verified until typecheck/tests/build and representative browser QA pass.

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.

## Next implementation order

1. Make bodyweight progression assessment-driven instead of manually selected (#33).
2. Add richer cardio prescriptions and session choices (#34).
3. Turn jump/balance/carry benchmarks into safe progression plans (#35).
4. Add readiness and capability trend views (#36–#37).
5. Use domain gaps + readiness + available time for minimum-effective-day recommendations (#39).
6. Add travel/return-to-training/maintenance modes (#40).
7. Run Phase 1/2 typecheck, tests, production build, PWA/offline QA, and representative mobile/tablet/desktop browser QA before either PR is merge-ready.
