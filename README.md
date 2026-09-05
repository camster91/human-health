# Human Health

Human Health is a long-horizon, local-first health and performance PWA designed around one principle: **structured goals, flexible execution**.

The current product foundation combines adaptive strength training, whole-person fitness, opt-in connected-health context, deterministic-first coaching, and a user-owned long-horizon platform layer. Workouts and recommendations adapt to time, equipment, readiness, travel, interruptions, partial completion and current evidence without pretending that unlike exercises, devices or health domains are directly equivalent.

## Current lifecycle state

- **Phase 1:** adaptive training coach foundation — merged
- **Phase 2:** whole-person fitness foundation and hardening — merged
- **Phase 3:** connected-health context and local data portability — merged; automated/browser/native verification remains separately tracked
- **Phase 4:** coaching intelligence — merged; release verification remains separately tracked
- **Phase 5:** long-horizon health platform — merged; independent hardening is merged through PR #84 and follow-up storage-integrity hardening continues on draft PR #102

All planned numbered product phases 0–5 are source-built and merged. That does **not** mean the product is verified, release-ready, or deployed. The canonical release gate is issue #82. Current release status remains blocked on the active storage-integrity review, reproducible npm dependency setup, an eligible CI runner, and the required executable/browser/device/staging evidence.

Phase 5 adds user/clinician-entered preventive records/reminders, local clinician discussion exports, capability-model evidence/validation gates, on-device personal baselines, versioned scoped integration contracts, complete Phase 5 archive/delete coverage and regulatory escalation checkpoints. Current capability models remain explicitly experimental until real external validation and independent replication evidence are recorded.

The independent hardening work adds fail-closed storage trust boundaries, recoverable cross-domain archive operations, source-separated clinician exports, atomic preventive reminder completion, strict calendar/month-end handling, enforced integration-share confirmation, stronger validation-evidence gates, and fail-closed regulatory classification for ambiguous intended use. Draft PR #102 specifically hardens persisted training/connected-health corruption, raw rollback snapshots, complete-export truthfulness and the product surfaces that consume that data.

## Safety and privacy

Human Health is a fitness/lifestyle product, not a medical authority. Connected observations, coaching outputs, preventive reminders and platform summaries must not be used to diagnose conditions, dose insulin or medication, calculate treatment carbohydrates, perform emergency monitoring, provide injury clearance, or claim causal health conclusions.

Connected-health and Phase 5 preventive data remain local to the device in the current architecture. Native permissions are user initiated, imported files do not require server upload, personal baselines are generated on-device, and clinician/integration exports require explicit user action. A connected integration host additionally requires an explicit confirmed share operation. No remote AI provider, integration provider, camera/video clinical analysis, medication-dosing feature or emergency-monitoring feature is bundled.

Corrupt or unreadable local data must not be silently converted into fallback coaching, clinician, export, or integration evidence. Complete export fails closed when required persisted domains are untrusted; validated replace import and privacy-directed delete-all remain explicit recovery paths.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:pwa
```

The repository also exposes `npm run verify` for the consolidated source/build/PWA gate.

There is not yet a reviewed committed `package-lock.json`, so deterministic `npm ci` reconstruction is not claimed. Issue #94 tracks generation/review of the real lockfile in a dependency-capable Node/npm environment.

GitHub Actions currently targets a self-hosted Ashbi runner. Human Health does not yet have a confirmed repository-eligible runner, so queued workflow runs are not evidence of a source failure or a successful verification. Issue #51 tracks that infrastructure dependency.

## Key docs

- `docs/implementation-roadmap.md` — phased product roadmap and current source/release distinction
- `docs/10-year-lifecycle.md` — long-horizon lifecycle plan
- `docs/phase-3-final-review.md` — historical Phase 3 source review
- `docs/phase-4-final-review.md` — historical Phase 4 source review
- `docs/phase-5-status.md` — Phase 5 source-scope record
- `docs/phase-5-final-review.md` — Phase 5 hardening/source review
- `docs/phase-5-completion-checklist.md` — Phase 5 evidence/release gates
- `docs/phase-5-final-hardening-findings.md` — Phase 5 hardening findings and resolutions
- `docs/connected-health-storage-integrity-note.md` — current connected-health storage trust/recovery boundary
- `docs/end-to-end-code-review-agent-prompt.md` — independent whole-repository line-by-line review prompt

Phase-specific status/final-review documents preserve historical branch/PR context. Current operational truth comes from `main`, open GitHub issues/PRs, this README, and the canonical release gate #82.

## Delivery rules

- Mobile-first and PWA-capable.
- Keep historical workout data immutable wherever practical.
- Make automatic recommendations explainable and reversible.
- Prefer measured data and deterministic rules over opaque scoring.
- Treat missing, stale, imported, inferred and manually entered data differently.
- Never silently equate exercise loads across unlike equipment.
- Safety and recovery override progression.
- Do not call a phase verified without executable evidence for the applicable gates.
- Do not claim a capability model is validated without appropriate real external evidence for its intended use.
- Production deployment requires separate explicit approval.
