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
- [x] Rest timer — implemented; wake-lock remains a verification/compatibility follow-up
- [x] Previous-performance comparison — implemented
- [x] Exercise substitutions — implemented
- [x] Short-on-time adaptation — implemented
- [x] Different-gym adaptation — implemented
- [x] Recovery-aware / low-energy adaptation — implemented baseline
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
- [ ] Confirm wake-lock behaviour or explicitly ship without it

The Phase 1 source implementation is complete on the feature branch, but it must not be called verified or production-ready until this gate passes.
