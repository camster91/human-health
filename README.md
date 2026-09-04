# Human Health

Human Health is a long-horizon, local-first health and performance PWA designed around one principle: **structured goals, flexible execution**.

The current product foundation combines adaptive strength training with whole-person fitness and an opt-in connected-health context layer. Workouts adapt to time, equipment, readiness, travel, interruptions and partial completion without pretending that different exercises or devices are directly equivalent.

## Current lifecycle state

- **Phase 1:** adaptive training coach foundation
- **Phase 2:** whole-person fitness foundation and hardening
- **Phase 3:** connected-health context is source-complete/source-reviewed on draft PR #62; automated/browser/native verification remains pending

Phase 3 adds a provider-neutral observation model, local IndexedDB storage, Health Connect/HealthKit bridge contracts, Apple Health XML import, freshness/provenance handling, selected-source aggregation, optional hydration/nutrition habits, connected trends and complete local data portability. Native APIs are never fabricated in a browser-only PWA.

## Safety and privacy

Human Health is a fitness/lifestyle product, not a medical authority. Connected observations are contextual inputs and must not be used to diagnose conditions, dose insulin or medication, perform emergency monitoring, provide injury clearance, or claim causal health conclusions.

Phase 3 connected-health data remains local to the device in the current architecture. Native permissions are user initiated, imported files do not require server upload, and source provenance/freshness remains visible.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:pwa
```

The repository also exposes `npm run verify` for the consolidated source/build/PWA gate.

GitHub Actions currently targets a self-hosted Ashbi runner. Human Health does not yet have a confirmed repository-eligible runner, so queued workflow runs are not evidence of a source failure or a successful verification. Issue #51 tracks that infrastructure dependency.

## Key docs

- `docs/implementation-roadmap.md` — phased product roadmap
- `docs/10-year-lifecycle.md` — long-horizon lifecycle plan
- `docs/phase-2-final-review.md` — Phase 2 completion review
- `docs/phase-3-status.md` — current Phase 3 status
- `docs/phase-3-final-review.md` — Phase 3 source review
- `docs/phase-3-completion-checklist.md` — remaining verification/native gates
- `docs/connected-health-architecture.md` — Phase 3 architecture
- `docs/connected-health-privacy.md` — privacy/data ownership model
- `docs/native-health-bridge-contract.md` — Android/Apple native host contract

## Delivery rules

- Mobile-first and PWA-capable.
- Keep historical workout data immutable wherever practical.
- Make automatic recommendations explainable and reversible.
- Prefer measured data and deterministic rules over opaque scoring.
- Treat missing, stale, imported, inferred and manually entered data differently.
- Never silently equate exercise loads across unlike equipment.
- Safety and recovery override progression.
- Do not call a phase verified without executable evidence for the applicable gates.
- Production deployment requires separate explicit approval.
