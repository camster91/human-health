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
- [x] Persistent bodyweight skill assessment history
- [x] Persistent capability assessments and progression-track state
- [x] Manual cardio logging and equivalent-minute display
- [x] Target-aware cardio prescription baseline (#34)
- [x] Recovery-aware cardio session choices: easy, steady, and intervals when appropriate (#34)
- [x] Quick core/mobility/bodyweight completion logging
- [x] Structured core progression tracks and session logging baseline (#31)
- [x] Structured lower/upper mobility progression tracks and session logging baseline (#32)
- [x] Interactive readiness check UI
- [x] Seven-day readiness trend summary and conservative repeated-strain messaging (#36)
- [x] Interactive bodyweight skill selection UI
- [x] Assessment-driven bodyweight advancement/regression baseline requiring repeatable clean passes (#33)
- [x] Pain blocks bodyweight skill advancement (#33)
- [x] Saved readiness modifies workout volume and pauses progression guidance when recovery signals are low (#36 baseline)
- [x] Pain flagged during a workout immediately pauses progression guidance for the remainder of the session
- [x] Capability assessment entry for pull-ups, hangs, ankle mobility, balance, and jump (#35/#37 baseline)
- [x] Capability map reads latest assessment and measurable change over time (#37 baseline)
- [x] Recovery-aware athletic plan with low-volume power, balance, and carry/locomotion work (#35)
- [x] Adaptive rolling schedule baseline (#38; ended-early state supported in source)
- [x] Deficit-aware minimum-effective-day planning baseline (#39)
- [x] Normal, travel, return-to-training, and maintenance life modes baseline (#40)
- [x] Interactive life-mode/time selector and suggested-work completion flow (#39/#40)
- [ ] Power/balance automatic progression rules tied to repeated benchmark evidence (#35)
- [ ] Capability map strength/cardio normalization and periodic assessment workflow (#37)
- [ ] Broader rolling-schedule QA and interaction with life modes (#38)
- [ ] Verification of all source-level tests/build/PWA/browser behaviours

## Verification rule

New Phase 2 helpers have unit-test coverage in source, but tests have not been executed in this connector session. Do not mark implementation verified until typecheck/tests/build and representative browser QA pass.

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.

## Next implementation order

1. Tie power/balance progression to repeatable benchmark evidence (#35).
2. Add normalized strength/cardio trend summaries and periodic-assessment workflow (#37).
3. Exercise the rolling schedule against travel/return/maintenance scenarios (#38/#40).
4. Run Phase 1/2 typecheck, tests, production build, PWA/offline QA, and representative mobile/tablet/desktop browser QA before either PR is merge-ready.
