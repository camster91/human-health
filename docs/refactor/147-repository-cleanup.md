# #147 Repository Cleanup Plan and Records

Companion to `docs/GUIDE_FIRST_MIGRATION_MATRIX.md`. This file records the repository/roadmap cleanup the mission requires, the exact commands prepared, and honestly what has and has not been executed.

**Execution status: PREPARED, NOT EXECUTED.** This agent run has read/write file access to the checkout but **no shell/exec tool**, so `git`, `gh`, and `npm` could not be invoked. Every command below is written to be run verbatim by a human or an agent with shell access, and each is non-destructive or reversible unless explicitly noted.

---

## 1. Documentation archival (preserve history, do not delete)

Historical docs must move under `docs/archive/pre-guide/` so they stop appearing authoritative beside the canonical docs. **Move, never delete.**

### 1.1 Phase docs

```bash
mkdir -p docs/archive/pre-guide/root-summaries
git mv docs/phase-1-checklist.md docs/archive/pre-guide/
git mv docs/phase-1-delivery.md docs/archive/pre-guide/
git mv docs/phase-1-execution-notes.md docs/archive/pre-guide/
git mv docs/phase-1-issue-gap.md docs/archive/pre-guide/
git mv docs/phase-1-qa.md docs/archive/pre-guide/
git mv docs/phase-1-review.md docs/archive/pre-guide/
git mv docs/phase-1-scope.md docs/archive/pre-guide/
git mv docs/phase-1-status.md docs/archive/pre-guide/
git mv docs/phase-2-final-review.md docs/archive/pre-guide/
git mv docs/phase-2-status.md docs/archive/pre-guide/
git mv docs/phase-3-acceptance-audit.md docs/archive/pre-guide/
git mv docs/phase-3-completion-checklist.md docs/archive/pre-guide/
git mv docs/phase-3-final-review.md docs/archive/pre-guide/
git mv docs/phase-3-latest-reconciliation.md docs/archive/pre-guide/
git mv docs/phase-3-native-validation.md docs/archive/pre-guide/
git mv docs/phase-3-reconciliation-plan.md docs/archive/pre-guide/
git mv docs/phase-3-safety-review.md docs/archive/pre-guide/
git mv docs/phase-3-status.md docs/archive/pre-guide/
git mv docs/phase-4-completion-checklist.md docs/archive/pre-guide/
git mv docs/phase-4-final-review.md docs/archive/pre-guide/
git mv docs/phase-4-safety-privacy.md docs/archive/pre-guide/
git mv docs/phase-4-status.md docs/archive/pre-guide/
git mv docs/phase-5-completion-checklist.md docs/archive/pre-guide/
git mv docs/phase-5-final-hardening-findings.md docs/archive/pre-guide/
git mv docs/phase-5-final-review.md docs/archive/pre-guide/
git mv docs/phase-5-safety-privacy.md docs/archive/pre-guide/
git mv docs/phase-5-status.md docs/archive/pre-guide/
git mv docs/phase-definitions.md docs/archive/pre-guide/
```

### 1.2 Historical planning docs

```bash
git mv docs/mvp-build-order.md docs/archive/pre-guide/
git mv docs/issue-map.md docs/archive/pre-guide/
git mv docs/next-20-issues.md docs/archive/pre-guide/
git mv docs/project-board-setup.md docs/archive/pre-guide/
git mv docs/implementation-roadmap.md docs/archive/pre-guide/
git mv docs/issue-seeding-plan.md docs/archive/pre-guide/
git mv docs/task-catalog.md docs/archive/pre-guide/
git mv docs/architecture-phase1.md docs/archive/pre-guide/
git mv docs/end-to-end-code-review-agent-prompt.md docs/archive/pre-guide/
git mv docs/final-review-static-audit-notes.md docs/archive/pre-guide/
git mv docs/END_TO_END_SHIP_PLAN.md docs/archive/pre-guide/
```

### 1.3 Repo-root historical summaries

```bash
git mv PHASE_A_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv PHASE_B_IMPLEMENTATION.md docs/archive/pre-guide/root-summaries/
git mv POLISH_PASS_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv POLISH_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv IMPLEMENTATION_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv CONSUMER_DESIGN_PASS_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv CSS_DIFF_HIGHLIGHTS.md docs/archive/pre-guide/root-summaries/
git mv MOBILE_TRANSFORMATION.md docs/archive/pre-guide/root-summaries/
git mv PRODUCTION_AUDIT_RESPONSE.md docs/archive/pre-guide/root-summaries/
git mv QA_FIXES_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv ASSETS_SUMMARY.md docs/archive/pre-guide/root-summaries/
git mv TESTING_CHECKLIST.md docs/archive/pre-guide/root-summaries/
```

### 1.4 Archive index

Create `docs/archive/pre-guide/README.md` stating: these are historical implementation records from the pre-Guide phases; they are **not** product requirements; canonical direction is `docs/CANONICAL_PRODUCT_DIRECTION.md` + `docs/GUIDE_ARCHITECTURE.md` + `docs/EXPERIENCE_SYSTEM.md`.

### 1.5 Docs kept at `docs/` root (operational, still current)

`deployment-and-rollback.md`, `branching-policy.md`, `dependency-update-policy.md`, `how-to-run.md`, `privacy-safety-boundaries.md`, `release-gates.md`, `qa-checklist.md`, `accessibility-static-review-checklist.md`, `mobile-setup.md`, `phone-install.md`, `connected-health-*.md`, `native-health-bridge-contract.md`, `data-model-notes.md`, `coaching-principles.md`, `design-direction.md`, `verification-blockers.md`, `status.md`, `acceptance-criteria.md`, `implementation-issue-template.md`, `10-year-lifecycle.md`, plus the canonical set and this matrix.

`docs/release-gates.md` must be edited to state explicitly that **#82 is the legacy integrity/migration-input gate and #157 is the Guide-first product release gate.**

### 1.6 README reconciliation

`README.md` must state: canonical product direction is Guide-first; historical phase docs are archived; no claim that the live site runs the Guide-first refactor until separately verified.

---

## 2. Draft PR #97 disposition

**#97** — `chore/ai-repository-readiness`, DRAFT, stale since 2026-09-04.

Prepared procedure (requires shell + `gh`):

```bash
gh pr view 97 --repo camster91/human-health --json title,body,files,isDraft,headRefName,mergeable,commits
gh pr diff 97 --repo camster91/human-health
```

Then, for each file #97 touches:

1. If the change is still useful and not already present on `main`/the active docs branch → re-apply it onto the active branch and note it in that PR body.
2. If it duplicates work already merged or already in the planning branch → do not re-apply.
3. Leave exactly **one** active source-of-truth documentation PR: **#158** (`planning/guide-first-health-os-refactor`) or its successor feature branch.
4. Close #97 as superseded **only after** confirming no unique useful work remains unaccounted for. Do **not** close it while unique content is unresolved.

Disposition when executed must be recorded as a comment on #97 with the specific files re-applied.

**Not executed in this run** (no shell/`gh`).

---

## 3. Branch audit

Remote branches observed via `.git/packed-refs` (read-only):

| Branch | Last observed tip | Prepared audit question |
|---|---|---|
| `main` | `f1c9913606ca4091f2d35bd168267052e15977b7` | default branch |
| `planning/guide-first-health-os-refactor` | `df538ac2d08ee2c7c059dec9472ddc30674e9472` | **active** — planning PR #158 |
| `post-phase2-hardening` | `48801ad60c51f412eda66b2bbe3de1bba8c126ea` | referenced by `verify.yml` triggers; check before archiving |
| `training-storage-integrity` | `285ef95b8f4e1e64b30172637e59a13e133384a6` | likely #85–#112 work; **confirm merged or extract unique safety fix** |
| `integrate-phase-2` | `8bce91c04ca655c271f736eede76969000e4cbf0` | check merge status |
| `phase-1-adaptive-training-coach` | `d88136b05a485a68ea88fec0f7e827fd69d505dd` | historical |
| `phase-2-verification` | `5f6b6909001530133a1948b97e7664975753b083` | historical |
| `phase-2-whole-person-fitness` | `3afd2457753b4387b67ee69e95fbe821ffddf2f4` | historical |
| `phase-3-connected-health` | `182be92dba9e26be23287497bfe058340c080805` | referenced by `verify.yml` triggers |
| `phase-3-lifestyle-intelligence` | `bf8e4650b0fa153e9788cc1aab34d0202cba3c48` | historical |
| `phase-4-coaching-intelligence` | `0378fa3f8bfe0e3ffafc67a7db0525a63a887c37` | historical |
| `phase-5-health-platform` | `0e4349eacd985cc0b798075fe82e36f13a1f1873` | historical |
| `final-independent-review` | `f8a306382641447f7b39b5bac2eb773dcdbab6d9` | check for unique findings |
| `chore/ai-repository-readiness` | `a2b688f6eec98d7ef76d9b4228200e264fe99e00` | PR #97 |
| `chore/ci-concurrency-sep3` | `d6b528fe20757eb9152bc0b73a97a3f969954b03` | CI work; check if merged into verify.yml |
| `chore/ci-docs-filter-sep4` | `e85f2585ae921547808a8f0572efa83a10a34398` | CI work; check merge status |
| `cursor/custom-app-graphics-d32f` | `3ac12afed12010f9263e94de630a67d11edbdce6` | check merge status |
| `cursor/daily-driver-finish-c326` | `519b71572afe2fe95b02f0bf305b60d247e87cbc` | check merge status |
| `cursor/end-to-end-ship-plan-1aec` | `8fccda5e8e451f044b712184dce2610ce201c46b` | check merge status |
| `cursor/figma-v3-density-06aa` | `7c11e59ed996f9d44681508265b2b1f1ddb393a3` | design work; check |
| `cursor/fix-qa-residuals-3d92` | `73cd6a065f2731b5d88728b7da4b07c1a077d98b` | check for unmerged fix |
| `cursor/fix-verify-gate-failures-c0b9` | `593ad124c3719a65ec7503927fe548e4e16bcdba` | CI/reliability; check for unique fix |
| `cursor/phone-android-apk-pwa-4a19` | `21e8a8f6b41d81acd7cacd098ef718245550d56f` | check for unique native fix |
| `cursor/ux-gaps-store-ready-1815` | `ba9e8cae3542c68a703de984397962e059808aba` | check merge status |
| `cursor/visual-polish-mobile-density-e1fa` | `e4acb34c4e06cb0c3c822a85fe92c9c36d6ef1d9` | check merge status |

Audit procedure per branch (do **not** delete blindly):

```bash
gh pr list --repo camster91/human-health --state all --head <branch> --json number,state,title,mergedAt
git log --oneline main..origin/<branch>          # unique commits?
git diff --stat main...origin/<branch>           # unique changes?
```

Delete a branch only when **all** are true: work is merged; no unique safety fix exists; no unmerged migration evidence is needed. Record the audit result (branch, verdict, reason) as a comment on #146.

**Not executed in this run.**

---

## 4. CI / toolchain reconciliation → one documented toolchain

**Target toolchain (documented, single):** Node **22**, npm with a committed lockfile, pinned GitHub Action SHAs, self-hosted verify runner `[self-hosted, Linux, X64, ashbi-vps]`.

### 4.1 Android workflow mismatch (Node 20 → 22) + floating actions

`.github/workflows/android-apk.yml` currently: `node-version: '20'`, `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-java@v4`, `android-actions/setup-android@v3`, `actions/upload-artifact@v4`.

Changes required:

1. `node-version: '22'` (match `verify.yml`).
2. Pin every action to a full commit SHA with a trailing `# vX` comment (mirroring `verify.yml`'s existing pinned style), instead of floating `@v4`/`@v3`.
3. Keep `npm ci` (this workflow already uses it; note `verify.yml` still uses `npm install` with a TODO — reconciling that is tracked below).

### 4.2 `verify.yml` trigger hygiene

Replace the stale branch trigger list

```yaml
on:
  push:
    branches: [main, post-phase2-hardening, phase-3-connected-health]
```

with `main` only (plus `workflow_dispatch` and `pull_request`), since `post-phase2-hardening` and `phase-3-connected-health` are historical. This does **not** weaken verification: PRs and `main` remain fully verified.

### 4.3 `npm install` → `npm ci` (do **not** weaken CI)

`verify.yml` has a TODO to switch to `npm ci` once the reviewed lockfile is committed. A `package-lock.json` **is** present in the repo root. Prepared change:

```yaml
      - name: Install dependencies
        run: npm ci --no-audit --no-fund
```

This **strengthens** reproducibility. It must only be applied together with a green run on the supported runner; if `npm ci` fails due to lockfile drift, the fix is to regenerate/commit the lockfile, **not** to revert to `npm install`.

### 4.4 Dependency-update policy

Ensure `docs/dependency-update-policy.md` states the single supported Node major and the pinned-action policy, and that Dependabot (if enabled) targets that toolchain.

**Prepared, not applied** (no shell; and CI config edits are the kind of change that must be validated by an actual CI run, which this run cannot trigger).

---

## 5. What this run actually changed

Only additive documentation artifacts were written; no source code, workflow, or data file was modified, and nothing was deleted:

- `docs/GUIDE_FIRST_MIGRATION_MATRIX.md` (new).
- `docs/refactor/147-verification.md` (new).
- `docs/refactor/147-repository-cleanup.md` (this file, new).
- `docs/refactor/ai-evaluation-suite.md` (new).

No `git mv`, no branch deletion, no CI edit, no PR action was performed — see §6 blockers.
