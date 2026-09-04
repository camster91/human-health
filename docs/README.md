# Human Health docs

This directory contains durable architecture, product, safety, delivery, and phase evidence. Start with `../AGENTS.md` for execution rules and `../README.md` for the current product/status summary.

## Current reading order

1. `../AGENTS.md` — durable agent execution, safety, verification, and production boundaries.
2. `../README.md` — current product state, setup, verification, and key links.
3. `implementation-roadmap.md` — phased product direction and current source status.
4. Domain-specific architecture/privacy/delivery documents relevant to the change.
5. Current phase/review documents relevant to the work.
6. Open GitHub issues and pull requests — live blockers, implementation work, and release evidence.

Older phase reviews, acceptance audits, prompts, and completion checklists are retained as evidence/history. They do not override current sources merely because they are more detailed.

## Product and architecture

- `implementation-roadmap.md` — phased product roadmap and current source status.
- `10-year-lifecycle.md` — long-horizon lifecycle plan; future concepts are not fixed commitments.
- `architecture-phase1.md` — original application architecture foundation.
- `data-model-notes.md` — core data-model notes.
- `coaching-principles.md` — durable coaching constraints.
- `connected-health-architecture.md` — provider-neutral connected-health architecture.
- `connected-health-privacy.md` — privacy/data ownership boundaries.
- `native-health-bridge-contract.md` — Android/Apple native-host boundary.

## Delivery and verification

- `acceptance-criteria.md` — baseline product acceptance criteria.
- `deployment-and-rollback.md` — production approval, build, deployment, rollback, and data-safety boundary.
- `branching-policy.md` — repository branching guidance.
- `end-to-end-code-review-agent-prompt.md` — independent whole-repository line-by-line review prompt.

## Phase evidence

Phase-specific status, final-review, acceptance-audit, completion-checklist, and hardening documents record what was implemented or reviewed at that point in time. Use them as evidence for their phase, while treating `README.md`, `implementation-roadmap.md`, and live GitHub work as the current status sources.

Current source scope through Phase 5 is merged to `main`. Executable/browser/native/release verification remains separately evidenced and must not be inferred from source completion.

A checked source item does not imply executable verification. Typecheck, tests, build, browser/PWA QA, native-host validation, and release checks are recorded separately and only count when actually executed successfully.
