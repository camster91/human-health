# Human Health

Human Health is a long-horizon, local-first health and performance PWA designed around one principle: **structured goals, flexible execution**.

The current product foundation combines adaptive strength training, whole-person fitness, opt-in connected-health context, and a deterministic-first coaching layer. Workouts and recommendations adapt to time, equipment, readiness, travel, interruptions, partial completion and current evidence without pretending that unlike exercises, devices or health domains are directly equivalent.

## Current lifecycle state

- **Phase 1:** adaptive training coach foundation — merged
- **Phase 2:** whole-person fitness foundation and hardening — merged
- **Phase 3:** connected-health context and local data portability — merged; automated/browser/native verification remains separately tracked
- **Phase 4:** coaching intelligence — source-complete/source-reviewed on `phase-4-coaching-intelligence`; executable/browser verification and merge approval remain pending

Phase 4 adds explainable trend evidence, repeated-evidence plateau/deload logic, multi-goal planning, readiness/workload/life-mode context, freshness-aware connected signals, conversational adaptation input, and an optional AI narrative contract that can explain deterministic actions but cannot alter them. Movement/video analysis remains locked behind a separate reliability/privacy gate.

## Safety and privacy

Human Health is a fitness/lifestyle product, not a medical authority. Connected observations and coaching outputs are contextual inputs and must not be used to diagnose conditions, dose insulin or medication, calculate treatment carbohydrates, perform emergency monitoring, provide injury clearance, or claim causal health conclusions.

Connected-health data remains local to the device in the current architecture. Native permissions are user initiated, imported files do not require server upload, and source provenance/freshness remains visible. Phase 4 does not bundle a remote AI provider or camera/video analysis.

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
- `docs/phase-3-status.md` — Phase 3 status/reference
- `docs/phase-3-final-review.md` — Phase 3 source review
- `docs/connected-health-architecture.md` — connected-health architecture
- `docs/connected-health-privacy.md` — privacy/data ownership model
- `docs/native-health-bridge-contract.md` — Android/Apple native host contract
- `docs/phase-4-status.md` — current Phase 4 status
- `docs/phase-4-final-review.md` — Phase 4 source review
- `docs/phase-4-completion-checklist.md` — Phase 4 verification gates

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
