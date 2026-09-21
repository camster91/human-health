# Project status — Guide-first refactor

## 1. Completed and verified

- Existing Human Health repository and current application history inspected.
- Current product-direction, roadmap, handoff, safety and UX epics reconciled.
- New Guide-first direction separated from the legacy application concept.
- Canonical product, architecture, experience and refactor documents created on the planning branch.

## 2. Completed but awaiting verification

- Documentation-level source-of-truth reset on `planning/guide-first-health-os-refactor`.
- Repo entry-point updates that redirect future agents to the new canonical documents.

These are not merged to `main` and therefore are not production truth yet.

## 3. In progress

- Convert the Guide-first plan into one canonical epic plus implementation issues.
- Mark old competing UX/roadmap issues as superseded without losing historical context.
- Prepare a draft planning PR.

## 4. Blocked

- No product blocker for planning.
- Actual code refactor should not begin broadly until the current subsystems are inventoried and classified.
- Merge/deploy requires separate explicit approval.

## 5. Awaiting client or teammate

- None for planning.
- Future merge/deploy approval remains with Cameron.

## 6. Next action

Create/refine the canonical GitHub issues and then begin the architecture/migration inventory as the first implementation task.
