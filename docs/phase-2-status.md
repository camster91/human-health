# Phase 2 status

Phase 2 expands Human Health from an adaptive strength coach into a whole-person fitness system while keeping recommendations measurable, explainable, and reversible.

## Dependency note

Phase 2 is branched from `phase-1-adaptive-training-coach` so work can proceed without merging unverified Phase 1 code. Phase 1 PR #44 remains draft and must pass its verification gate independently.

## Review findings carried from Phase 1

- #45 ended-early workout status: source fix implemented on Phase 1 and carried into Phase 2; verification pending.
- #46 live pain/discomfort flag: source fix implemented on Phase 1 and carried into Phase 2; verification pending.
- #47 wake-lock: Screen Wake Lock API baseline implemented with feature detection and graceful fallback; browser/device verification pending.
- #49 Phase 2 is behind the latest Phase 1 head and must be reconciled before merge-readiness.

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
- [x] Benchmark-driven balance/jump progression requiring repeated comparable improvement before advancing (#35)
- [x] Athletic progression is held when readiness is reduced and remains explicitly reversible (#35)
- [x] Recent lower-body training load is surfaced and suppresses unnecessary high-impact power work for 36 hours (#35)
- [x] Normalized primary-lift strength trend based on per-exercise estimated strength change without mixing exercise variants (#37)
- [x] Cardio coverage normalized to weekly equivalent-minute target (#37)
- [x] Periodic capability-assessment due workflow with configurable retest interval (#37)
- [x] Longitudinal capability panel showing strength trend, cardio coverage, repeated lifts, and due assessments (#37)
- [x] Adaptive rolling schedule baseline (#38; ended-early state supported in source)
- [x] Rolling schedule source coverage for normal, travel, return-to-training, and maintenance modes (#38/#40)
- [x] Travel and return modes preserve rolling position while pausing automatic progression; maintenance avoids catch-up behaviour (#38/#40)
- [x] Deficit-aware minimum-effective-day planning baseline (#39)
- [x] Normal, travel, return-to-training, and maintenance life modes baseline (#40)
- [x] Interactive life-mode/time selector and suggested-work completion flow (#39/#40)
- [x] Client-side performance planning now hydrates activity/readiness state after mount to avoid direct localStorage-derived render mismatches
- [x] Automated verification workflow added to both Phase 1 and Phase 2 feature branches
- [ ] Verification workflow result observed and reviewed
- [ ] Verification of PWA/offline and representative browser/device behaviour

## Verification rule

Automated verification is configured to install dependencies, run TypeScript checking, run unit tests, and build the production app. A passing workflow result has not yet been observed in this connector session, so neither phase should be considered verified. Browser/device QA remains a separate gate even after CI passes.

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.

## Next implementation order

1. Observe the automated verification result and fix any typecheck/test/build failures.
2. Reconcile Phase 2 with the latest verified Phase 1 head (#49) without losing either branch's fixes.
3. Run PWA/offline QA and representative mobile/tablet/desktop browser QA.
4. Repeat the verification gate after branch reconciliation.
5. Only after verification, decide whether Phase 2 is ready to leave draft and whether Phase 1/2 should be merged; do not deploy without explicit approval.
