# Phase 2 status

Phase 2 expands Human Health from an adaptive strength coach into a whole-person fitness system while keeping recommendations measurable, explainable, and reversible.

## Dependency note

Phase 2 is branched from `phase-1-adaptive-training-coach` so work can proceed without merging unverified Phase 1 code. Phase 1 PR #44 remains draft and must pass its verification gate independently.

## Review findings carried from Phase 1

- #45 ended-early workout status must be persisted before adaptive rolling scheduling relies on completion state.
- #46 live logging must expose the existing pain flag before recovery-aware progression is considered reliable.
- #47 wake-lock must be implemented/verified or explicitly deferred before Phase 1 is called complete.

## Phase 2 implementation

- [x] Canonical capability domains
- [x] Initial measurable capability metrics
- [x] Weekly fitness target model
- [x] Pull-up and push-up skill-tree foundation
- [x] Core, mobility, cardio, and bodyweight micro-session catalogue
- [x] Minimum-effective-session selection helper
- [x] Weekly domain-minute calculation
- [ ] Core programming UI (#31)
- [ ] Mobility/flexibility programming UI (#32)
- [ ] Bodyweight skill-tree UI and progression (#33)
- [ ] Cardio programming and weekly targets UI (#34)
- [ ] Athleticism/power/balance model (#35)
- [ ] Recovery/readiness inputs (#36)
- [ ] Capability map and periodic assessments (#37)
- [ ] Adaptive rolling schedule (#38; blocked by #45)
- [ ] Minimum-effective-day mode UI (#39)
- [ ] Travel/return-from-break/life-phase modes (#40)

## Design rule

Capability domains are not combined into a universal medical health score. Each visible status must trace back to explicit measures, targets, or user-selected goals.
