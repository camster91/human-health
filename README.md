# Human Health

Human Health is a long-horizon, local-first health and performance PWA designed around one principle: **structured goals, flexible execution**.

The current product foundation combines adaptive strength training, whole-person fitness, opt-in connected-health context, deterministic-first coaching, and a user-owned long-horizon platform layer. Workouts and recommendations adapt to time, equipment, readiness, travel, interruptions, partial completion and current evidence without pretending that unlike exercises, devices or health domains are directly equivalent.

## Current lifecycle state

- **Phase 1:** adaptive training coach foundation — merged
- **Phase 2:** whole-person fitness foundation and hardening — merged
- **Phase 3:** connected-health context and local data portability — merged; automated/browser/native verification remains separately tracked
- **Phase 4:** coaching intelligence — merged; release verification remains separately tracked
- **Phase 5:** long-horizon health platform — source-complete/source-reviewed on `phase-5-health-platform`; executable/runtime verification and merge approval remain pending

Phase 5 adds user-entered preventive records/reminders, local clinician discussion exports, capability-model evidence/validation gates, on-device personal baselines, versioned scoped integration contracts and regulatory escalation checkpoints. Current capability models remain explicitly experimental until real external validation and replication evidence are recorded.

## Safety and privacy

Human Health is a fitness/lifestyle product, not a medical authority. Connected observations, coaching outputs, preventive reminders and platform summaries must not be used to diagnose conditions, dose insulin or medication, calculate treatment carbohydrates, perform emergency monitoring, provide injury clearance, or claim causal health conclusions.

Connected-health and Phase 5 preventive data remain local to the device in the current architecture. Native permissions are user initiated, imported files do not require server upload, personal baselines are generated on-device, and clinician/integration exports require explicit user action. No remote AI provider, integration provider, camera/video clinical analysis, medication-dosing feature or emergency-monitoring feature is bundled.

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
- `docs/phase-3-final-review.md` — Phase 3 source review
- `docs/phase-4-final-review.md` — Phase 4 source review
- `docs/phase-5-status.md` — current Phase 5 status
- `docs/phase-5-final-review.md` — Phase 5 source review
- `docs/phase-5-completion-checklist.md` — Phase 5 evidence/release gates
- `docs/phase-5-safety-privacy.md` — Phase 5 privacy/safety boundaries
- `docs/connected-health-architecture.md` — connected-health architecture
- `docs/native-health-bridge-contract.md` — Android/Apple native host contract

## Delivery rules

- Mobile-first and PWA-capable.
- Keep historical workout data immutable wherever practical.
- Make automatic recommendations explainable and reversible.
- Prefer measured data and deterministic rules over opaque scoring.
- Treat missing, stale, imported, inferred and manually entered data differently.
- Never silently equate exercise loads across unlike equipment.
- Safety and recovery override progression.
- Never claim a model is validated without evidence for its recorded intended use.
- Do not call a phase release-verified without executable evidence for the applicable gates.
- Production deployment requires separate explicit approval.
