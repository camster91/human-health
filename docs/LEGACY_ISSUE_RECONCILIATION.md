# Legacy Issue Reconciliation for Guide-First Refactor

Status: execution-readiness working record for #162.

Purpose: ensure pre-#146 safety, integrity, CI, device, and release work is not silently lost during the Guide-first redesign.

## Disposition rules

Each legacy issue is classified as one of:
- **Prerequisite/blocker** — must be resolved before a dependent Guide-first slice.
- **Absorb** — implementation/acceptance moves into a Guide-first issue, but the old issue remains open until evidence is migrated.
- **Independent release evidence** — remains a separate QA gate and feeds #157.
- **Supersede after evidence migration** — old umbrella/roadmap issue can close only after all surviving evidence is linked to the new roadmap.
- **Verification pending** — source may exist, but the issue is not complete until executable/browser evidence exists.

## Critical repository-truth correction

PR #102, **Harden persisted training storage integrity**, is **closed and unmerged**.

Current `main` is `f1c9913606ca4091f2d35bd168267052e15977b7`.

Searches on current `main` did not find key PR #102 symbols including:
- `captureRecoverySnapshot`
- `parseConnectedSourceState`
- `observationEvidenceTime`
- `ConnectedReadinessGate`

Therefore issues that describe PR #102 work as "source complete" must **not** be treated as implemented on `main` until the relevant changes are independently compared, recovered, adapted, reviewed, and verified.

Do not blindly merge or cherry-pick PR #102: it diverged substantially from current `main`. Recover only the still-relevant integrity fixes into the new architecture.

## CI / reproducibility

| Issue | Disposition | Guide-first mapping | Current action |
|---|---|---|---|
| #51 eligible CI runner | Prerequisite/blocker until replacement verified | #162 | PR #161 proposes GitHub-hosted runner. Keep #51 open until a real Verify run executes successfully or the runner strategy is otherwise proven. |
| #94 reproducible builds | Prerequisite/blocker | #162 / #157 | A `package-lock.json` is now present on `main`, but Verify still uses `npm install` and `.nvmrc` is absent. Reconcile the supported Node/npm contract and switch to verified `npm ci`. |
| #95 independent whole-repo hardening | Absorb + reconciliation gate | #162 / #157 | Re-audit its claims against current `main`; PR #102 references are stale because that PR is closed/unmerged. |

## Core privacy / safety umbrella

| Issue | Disposition | Guide-first mapping | Current action |
|---|---|---|---|
| #9 privacy/security/consent/clinical boundary umbrella | Supersede only after evidence migration | #149, #151, #155, #157 | Keep open until child integrity work is reconciled and the new deterministic safety/privacy contracts cover the same invariants. |
| #82 old Phases 0–5 final release gate | Supersede after evidence migration | #157 | Do not use as the new release authority. Migrate still-valid QA evidence/dependencies into #157, then close as superseded when reconciliation is complete. |

## Training integrity

| Issue | Disposition | Guide-first mapping | Current action |
|---|---|---|---|
| #85 workout finalization atomic/idempotent | Preserve + verification pending | #148 session runtime / #151 / #157 | Keep existing journal/idempotency behaviour and regression tests. Run browser storage-failure evidence before release. |
| #86 deep archive validation | Preserve + verification pending | #149 persistence / #157 | Keep as import boundary; ensure new context data extends validators rather than weakening them. |
| #87 archive rollback | Preserve + verification pending | #149 persistence / #157 | New migrations must remain all-or-recoverable. |
| #91 chronology/future evidence | Preserve + verification pending | #149, #151, #154, #155 | Carry the same fail-closed chronology rule into DailyState, Progress and connected health. |
| #92 poor-form evidence exclusion | Preserve + verification pending | #151 / #154 | Keep shared comparable-strength evidence rules. |
| #93 stale skill state | Preserve + verification pending | #151 / #154 | Keep fail-closed progression state; verify reset/review UX. |

## PWA / accessibility / device / deployment evidence

| Issue | Disposition | Guide-first mapping | Current action |
|---|---|---|---|
| #21 timer/Wake Lock/interruption | Independent release evidence | #148 session + #157 | Re-run against the new immersive session UI. |
| #30 PWA install/offline/update | Independent release evidence | #148 shell + #157 | Update route assertions for Guide-first shell and retain fail-safe update behaviour. |
| #42 responsive/accessibility | Independent release evidence + per-slice requirement | #148–#155 / #157 | Do not defer to final gate; record phone/tablet/desktop/keyboard/screen-reader evidence on each UI slice. |
| #43 preview/update/rollback rehearsal | Independent release evidence | #157 | Becomes part of the canonical release/distribution contract. |
| #47 Wake Lock device QA | Independent release evidence | #148 session + #157 | Keep until real-device supported/fallback evidence exists. |
| #90 fail-safe service-worker upgrades | Preserve + verification pending | #148 shell / #157 | Do not regress candidate-cache fail-closed behaviour while routes change. |

## Connected-health integrity

### Preserve from merged/current code, verify and adapt
| Issue | Disposition | Guide-first mapping |
|---|---|---|
| #96 recoverable Apple Health XML import | Preserve + verification pending | #155 / #157 |
| #98 deletion independent of native disconnect | Preserve + verification pending | #155 / #157 |
| #99 corrupt-row quarantine/fail closed | Preserve + verification pending | #149 / #155 / #157 |
| #100 timezone/day semantics | Preserve + verification pending | #149 / #155 / #157 |

### Closed PR #102 work that is NOT established on current main
| Issue | Disposition | Guide-first mapping | Required action |
|---|---|---|---|
| #103 corrupt-state validated replace recovery | Prerequisite before trusting connected-health migration | #149 / #155 | Recover/adapt the still-relevant raw rollback design; add current-architecture tests. |
| #104 strict source/preferences trust | Prerequisite | #149 / #155 | Reimplement/adapt strict persisted-state validation if absent. |
| #105 restore only attempted archive domains | Prerequisite for cross-domain import | #149 / #155 / #157 | Recover the attempted-domain rollback semantics. |
| #106 strict observation scalar/provenance schema | Prerequisite | #149 / #155 | Reconcile into the canonical connected-health validator. |
| #107 observation/source relationship integrity | Active defect / prerequisite | #149 / #155 | Implement on current architecture; fail closed on orphan/duplicate/provider/metric conflicts. |
| #108 canonical source state + merged relationships | Prerequisite | #149 / #155 | Recover/adapt from PR #102 or implement equivalent. |
| #109 duplicate canonical observation IDs | Prerequisite | #149 / #155 | Implement fail-closed duplicate detection on persisted reads. |
| #110 event-time freshness/latest | Prerequisite | #149 / #155 | Ensure event chronology, not provider creation/import time, drives freshness/latest. |
| #111 cached connected-sleep trust gate | Safety prerequisite | #149 / #151 / #155 | Require live current-runtime integrity before connected sleep affects planning. |
| #112 rejected observations => partial sync | Active defect / prerequisite | #155 | Implement and verify rejected-count partial semantics. |

## Connected-health release QA

| Issue | Disposition | Guide-first mapping | Current action |
|---|---|---|---|
| #61 connected-health privacy/browser/native QA | Independent release evidence | #155 / #157 | Re-run after the optional-module migration; include permission denial, partial permission, disconnect, deletion, provenance and export/delete. |

## Recommended closure strategy

1. Do **not** mass-close legacy issues.
2. For each implementation slice, link the old issue(s) whose invariant is being preserved/adapted.
3. When equivalent current-architecture code + tests + required browser/device evidence exist, close the old issue with a link to the new evidence.
4. Close #82 only after its still-valid release evidence is represented in #157.
5. Close #9 only after all surviving privacy/security/safety children are resolved or explicitly represented as blocking #157.

## Immediate blockers before #149/#150

- #161/#51/#94: establish reproducible executable verification.
- #95: reconcile stale PR #102 assumptions.
- #103–#112: determine exact current-main gaps, then recover only relevant connected-health integrity work.
- #42/#30/#43: migrate their QA requirements into the Guide-first per-slice and final release evidence model.

This document records planning truth only. It does not authorize merge, deployment, permission changes, or production release.
