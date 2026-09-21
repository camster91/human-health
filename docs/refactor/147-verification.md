# #147 Verification and Evidence

Issue: #147 (Phase 1 architecture/migration inventory).
Branch (intended): `feat/guide-first-shell` off `main` (`f1c9913606ca4091f2d35bd168267052e15977b7`).
Date: 2026-09-21 (America/Toronto).

## 1. What was produced

| Artifact | Purpose |
|---|---|
| `docs/GUIDE_FIRST_MIGRATION_MATRIX.md` | Preserve / Adapt / Replace / Quarantine / Retire classification of every major subsystem. |
| `docs/refactor/147-repository-cleanup.md` | Docs archival plan, PR #97 disposition, branch audit plan, CI/toolchain reconciliation. |
| `docs/refactor/ai-evaluation-suite.md` | Repeatable AI evaluation cases with expected safe behaviour. |
| `docs/refactor/147-verification.md` | This file. |

## 2. Method

Every subsystem classification was derived by **reading the actual source** in the checkout (not from the reconnaissance summary alone). Files read included:

- Shell/IA: `app/human-health-app.tsx` (all 710 lines), `app/page.tsx`, `app/layout.tsx`, `app/coach/page.tsx`, `app/health/page.tsx`, `app/platform/page.tsx`, `app/privacy/page.tsx`, `app/coaching-panel.tsx`, `app/icon-component.tsx`, `app/globals.css`.
- Domain/engine: `lib/domain.ts`, `lib/engine.ts`, `lib/program.ts`, `lib/schedule.ts`, `lib/load-management.ts`, `lib/performance.ts`, `lib/capability-trends.ts`, `lib/workout-accounting.ts`, `lib/whole-person-*.ts`, `lib/preferences.ts`, `lib/storage.ts`.
- Coaching: `lib/coaching/{engine,types,conversation,planner,explanation,movement-video,index}.ts`.
- Connected health: `lib/connected-health/{portfolio types,repository,portability,freshness,merge,local-day,summary,trends,sync,bridge,native-mapping,connected-readiness,mind,soft-habits,weekly-reflection,fuel,habits,index}.ts`.
- Platform: `lib/platform/{personal-model,regulatory,preventive,capability-models,integrations,clinician-export,storage,types}.ts`.
- PWA/tooling: `public/sw.js`, `public/manifest.webmanifest`, `scripts/check-pwa.mjs`, `next.config.mjs`, `tsconfig.json`, `package.json`.
- CI: `.github/workflows/verify.yml`, `.github/workflows/android-apk.yml`.
- Repo state: `.git/packed-refs`, `.git/refs/heads/main`, `.git/logs/HEAD`.

## 3. Acceptance criteria evidence (#147)

| Criterion | Status | Evidence |
|---|---|---|
| No major subsystem unclassified | Met (static) | Matrix §2–§10. |
| Old user-facing IA clearly separated from reusable engines | Met (static) | Matrix §2; verified all `lib/` engines are React-free (no `react` imports in `lib/`). |
| Data migrations identified before any schema replacement | Met (static) | Matrix §5 migration rule; Matrix §9 PWA `CORE`/checker coupling. |
| Independent blockers still tracked | Met (static) | Matrix §11 (incl. #82 re-scope). |
| Next vertical slice obvious | Met (static) | Matrix §14. |
| No code deleted in #147 | Met (static) | Only additive `docs/` files written; no `git rm`/`git mv` executed. |

## 4. Verification commands — honest status

**Nothing executable in this run was run.** This agent session has read/write file tools only and **no shell/exec tool**, so `git`, `gh`, and `npm` could not be invoked. Therefore:

| Command | Status | Why |
|---|---|---|
| `npm run typecheck` | **NOT RUN** | No shell; `node_modules/` absent (dependencies not installed). |
| `npm test` (vitest) | **NOT RUN** | Same. |
| `npm run build` | **NOT RUN** | Same. |
| `npm run check:pwa` | **NOT RUN** | Same. |
| `npm run verify` | **NOT RUN** | Same. |
| `git status` / `git add` / `git commit` / `git push` | **NOT RUN** | No shell. |
| `gh pr create` / `gh issue comment` / `gh pr edit` | **NOT RUN** | No shell / no `gh`. |

This does **not** mean the artifacts are unverified in the sense of being untested claims about code: every classification is grounded in source that was actually read, and file paths were taken from the repository. But it does mean **no build/test/CI evidence exists for this run**, and the docs-only change set is not yet committed or pushed.

## 5. Prepared commands (for an agent or human with shell)

```bash
cd /Users/Cameron/.openclaw/workspace/reviews/human-health/repo
git checkout main
git pull --ff-only
git checkout -b feat/guide-first-shell
# (docs already written in the working tree)
git add docs/GUIDE_FIRST_MIGRATION_MATRIX.md docs/refactor/
git commit -m "docs(#147): Guide-first migration matrix, cleanup plan, AI eval suite"
npm ci          # or npm install if lockfile drift is confirmed and fixed
npm run verify  # typecheck + test + build + check:pwa
git push -u origin feat/guide-first-shell
gh pr create --draft --repo camster91/human-health \
  --title "docs(#147): Guide-first migration inventory + repository cleanup plan" \
  --body-file docs/refactor/147-verification.md
```

Expected `npm run verify` outcome is unknown in this run; it must be recorded truthfully after execution, and if it fails the PR body must say so rather than claim green.

## 6. Explicit unknowns

- Whether `npm run verify` passes on Node 22 with the committed lockfile — **not verified**.
- Whether `check-pwa.mjs` still passes after any route changes — **not applicable yet** (no route changed in this run), but flagged as a coupling in Matrix §9.
- Whether PR #97 contains unique work — **not verified** (requires `gh`); disposition procedure recorded instead.
- Whether `training-storage-integrity` / `cursor/fix-verify-gate-failures-*` hold unique safety fixes — **not verified** (requires git history).
- CI does not run in this environment, and the self-hosted runner `ashbi-vps` availability is an external dependency (#51).
