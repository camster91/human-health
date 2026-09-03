# Phase 1 status

Status tracking for the adaptive training coach implementation.

Legend: `implemented` means source is present on the Phase 1 branch. `verified` requires build/test/browser QA before merge.

## Phase 0 dependencies

- [x] Architecture and ADR baseline — implemented
- [x] Core data model — implemented
- [x] Design tokens and shell — implemented
- [x] Exercise knowledge graph — implemented
- [x] Gym/equipment profiles — implemented
- [x] Starter Upper/Lower program — implemented
- [x] Workout state machine — implemented in UI/runtime state
- [x] Local-first persistence strategy — implemented

## Phase 1 MVP

- [x] Today screen — implemented
- [x] Live workout logging — implemented
- [x] Rest timer — implemented
- [x] Screen Wake Lock API baseline — implemented with feature detection; browser verification pending
- [x] Previous-performance comparison — implemented
- [x] Exercise substitutions — implemented
- [x] Short-on-time adaptation — implemented
- [x] Different-gym adaptation — implemented
- [x] Recovery-aware / low-energy adaptation — implemented baseline
- [x] Pain/discomfort flag in live set logging — implemented; verification pending (#46)
- [x] Ended-early status persistence — implemented with backward-compatible history fallback; verification pending (#45)
- [x] Plate calculator — implemented
- [x] Progression rules — implemented deterministic baseline
- [x] PRs / workout history — implemented baseline
- [x] Post-workout coach summary — implemented
- [x] PWA/offline behaviour — implemented baseline
- [x] Responsive/accessibility implementation — implemented; device QA pending
- [x] Deployment/rollback plan — documented

## Verification gate before merge

- [ ] npm ci
- [ ] npm run typecheck
- [ ] npm run test
- [ ] npm run build
- [ ] Mobile/tablet/desktop browser QA
- [ ] Offline/interruption QA
- [ ] PWA install QA on supported device/browser
- [ ] Confirm Screen Wake Lock behaviour on a supported browser and graceful fallback on an unsupported browser
- [ ] Verify ended-early state and pain/discomfort guardrail through the live UI

The Phase 1 source implementation and review fixes are present on the feature branch, but it must not be called verified or production-ready until this gate passes.
