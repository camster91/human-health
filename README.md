# Human Health

Human Health is a long-horizon adaptive health and performance coach designed for real human life: changing schedules, different gyms, limited time, variable recovery, evolving goals, and imperfect consistency.

The product begins with a mobile-first adaptive training experience and is planned to expand over a 10-year lifecycle into a broader personal health system spanning strength, cardio, mobility, bodyweight skills, recovery, sleep, nutrition, preventive health, and long-term capability.

## Product principle

**Structured goals, flexible execution.**

The system should answer three practical questions:

1. How am I doing?
2. What should I do today?
3. Am I improving over time?

## Implemented through Phase 2

- Adaptive Upper A / Lower A / Upper B / Lower B rolling sequence
- Live working-set and warm-up logging with rest timers
- Pause, interruption recovery, end-early, abandon, defer, add, and substitution flows
- Equipment-aware gym profiles and independent exercise-variant history
- Short-on-time, low-energy, travel, return-to-training, and maintenance adaptations
- Deterministic progression guidance with pain, form, readiness, long-gap, and workload guardrails
- Configurable cardio targets and planned-versus-incidental activity
- Core, mobility, bodyweight-skill, balance, power, carry, and locomotion support
- Repeatable capability assessments and longitudinal trends
- Local data export, preferences, and explicit storage-failure states
- Installable static-export PWA foundation with offline fallback

Phase 2 data is local to the current browser/device. Cloud sync, data import/restore, wearable integrations, and medical features are later lifecycle work.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:pwa
npm run serve:static
```

`npm run build` creates the static site in `out/`. The production build, PWA/offline behaviour, and representative browser/device matrix must pass before a release is described as verified or production-ready.

## Current review state

The Phase 2 feature scope is implemented on the active hardening pull request. Automated verification is currently blocked by runner availability, so source completion does not yet equal verified release completion. See `docs/phase-2-final-review.md` and issue #51 for the current evidence.

## Documentation

- [`docs/10-year-lifecycle.md`](docs/10-year-lifecycle.md)
- [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md)
- [`docs/coaching-principles.md`](docs/coaching-principles.md)
- [`docs/architecture-phase1.md`](docs/architecture-phase1.md)
- [`docs/data-model-notes.md`](docs/data-model-notes.md)
- [`docs/privacy-safety-boundaries.md`](docs/privacy-safety-boundaries.md)
- [`docs/deployment-and-rollback.md`](docs/deployment-and-rollback.md)
- [`docs/release-gates.md`](docs/release-gates.md)

Human Health separates fitness coaching from medical authority. It should help users observe, plan, train, recover, and understand trends without diagnosing disease, prescribing medication or insulin, clearing injuries, or replacing qualified healthcare professionals.
