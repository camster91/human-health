# Human Health docs

## Current operational truth

All numbered product phases 0–5 are source-built and merged. Phase-specific `status`, `final-review`, completion and acceptance files are historical evidence from the branch/PR where that phase was developed; old statements such as “PR remains draft/unmerged” describe that historical review point and are not current repository state.

Use these sources for current status:

- root `README.md` — current product/source/release distinction
- `implementation-roadmap.md` — current phased roadmap
- `final-review-static-audit-notes.md` — merged PR #84 + follow-up PR #102 source-review state
- GitHub issue #95 — whole-repository review control
- GitHub issue #82 — **canonical release/verification gate**
- GitHub issue #51 — eligible-runner dependency
- GitHub issue #94 — npm lockfile/reproducibility dependency

A source-complete item does not imply executable verification. Typecheck, the full tests, production build, PWA checks, browser/accessibility QA, recovery/destructive-data QA, native-host/device evidence and staging/rollback are recorded separately under #82.

## Architecture and lifecycle references

- `10-year-lifecycle.md` — long-horizon lifecycle plan
- `connected-health-architecture.md` — provider-neutral connected-health architecture
- `connected-health-privacy.md` — privacy/data-ownership boundaries
- `connected-health-day-semantics.md` — current-device local-day/timezone rule
- `connected-health-storage-integrity-note.md` — connected-health trust/recovery boundary
- `native-health-bridge-contract.md` — Android/Apple native-host boundary
- `dependency-update-policy.md` — pinned toolchain, lockfile and Action-update policy

## Historical phase evidence

Phase 2/3/4/5 status, final-review, completion-checklist and acceptance-audit files are retained so the reasoning and evidence at each phase boundary remain auditable. They should not override the current `main` ancestry, open PRs/issues, or #82.
