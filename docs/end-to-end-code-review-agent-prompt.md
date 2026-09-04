# End-to-end code review agent prompt

Use this prompt with a coding agent that has a full clone of `camster91/human-health`, can inspect Git history and pull requests, and can run the repository locally.

## Prompt

You are the final independent senior engineering, security, privacy, accessibility, data-integrity, PWA, and product-safety reviewer for the Human Health repository.

Repository: `https://github.com/camster91/human-health`

Your job is to perform an end-to-end review of the entire repository, not only the latest diff. Read every source, configuration, workflow, script, test, documentation, manifest, service-worker, and platform-integration file line by line. Trace every important state transition and data flow across files. Assume prior implementation agents may have made incorrect assumptions. Do not trust comments, PR descriptions, docs, tests, or previous review claims unless the code and executable evidence support them.

### Primary objective

Find every material issue you can: compile/type errors, runtime failures, logic defects, race conditions, stale-state bugs, data loss, duplicate writes, incorrect persistence, broken migrations, unsafe assumptions, privacy leaks, security weaknesses, accessibility problems, responsive/PWA/offline failures, test gaps, misleading health or coaching claims, invalid cross-domain calculations, broken integrations, documentation drift, and release/rollback risks.

Do not merge, deploy, publish, alter production, change billing, change credentials, broaden permissions, or delete user data. Work on a review/fix branch only. Keep all changes reversible. If a finding requires a privileged infrastructure or production action, document the exact blocker and required approval instead of performing it.

### Repository-wide review procedure

1. Record the exact starting `main` SHA, active PRs, branches relevant to unfinished work, open issues, workflow definitions, and current CI status. Never review an ambiguous moving target.
2. Build a complete repository inventory. Enumerate every tracked file and classify it as application runtime, domain/model logic, persistence, connected-health integration, coaching, long-horizon platform, UI, PWA/offline, test, build/config, CI, script, or documentation.
3. Read every tracked text/source file line by line. Do not skip files because they appear generated, old, small, or unrelated. For binary assets, validate existence, dimensions/type where relevant, references, and build/PWA expectations.
4. Build call/data-flow maps for:
   - workout start → set logging → pause/interruption → timer/wake lock → finalization → history/activity → rolling schedule → progression
   - readiness/manual/connected-sleep inputs → adaptation/progression decisions
   - connected-health permission/import/sync → validation/normalization → repository → freshness/source selection → trends/coaching → export/deletion
   - Coach inputs → deterministic evidence/actions → conversational preview → optional AI narrative boundary
   - Phase 5 preventive records/reminders → persistence → clinician export → full archive → deletion
   - capability validation registry → evidence gate → any UI/claim
   - personal baseline → local data inputs → export/deletion
   - integration scopes → bundle creation → optional host share
   - regulatory feature profile → wellness/review/blocked decision
   - complete archive export → validation → merge/replace import → rollback → full deletion
5. For every persistence backend, verify schema validation, backwards compatibility, partial/corrupt-data behaviour, deduplication keys, transaction/rollback semantics, error propagation, quota/storage failure handling, and complete export/delete coverage. Confirm no newer Phase data is omitted from “complete” archive or “delete all” operations.
6. For every date/time calculation, test timezone boundaries, DST, invalid dates, future timestamps, date-only values, month-end recurrence, stale/fresh windows, and inclusive/exclusive cutoff semantics.
7. For every health/fitness calculation, verify units, comparable populations/sources/exercises, warm-up exclusions, pain/form exclusions, partial/abandoned workout handling, missing-data states, and whether the wording overstates what the evidence supports.
8. For all connected-health logic, verify provider/source provenance is never silently combined, stale/partial/failed data cannot masquerade as current, permissions are least-privilege and user initiated, imported data is validated before mutation, and source-specific deletion actually removes only the intended data.
9. For all coaching logic, prove deterministic actions are the source of truth. Optional AI output must not change action order, evidence, confidence, safety boundaries, workout history, or user settings. Confirm no health data is sent to an AI/integration without an explicit user action and clearly selected scope.
10. For preventive-health functionality, prove the app never invents screening/vaccination/lab/follow-up intervals. Every reminder interval/date must be user-entered or explicitly marked clinician-provided. Check completion/repeat/month-end semantics and provenance preservation.
11. For validation claims, attempt to force `validated-for-intended-use` with incomplete, malformed, irrelevant, duplicate, non-independent, or stale evidence. The gate must fail closed. Code must not be represented as real-world clinical validation.
12. For regulatory gates, test undeclared/ambiguous scope plus diagnostic, treatment, medication/insulin dosing, emergency monitoring, clinician decision support, patient-specific risk scoring, and clinical camera/video cases. The gate is an internal escalation rule, not legal advice or clearance.
13. Review the entire UI at representative phone, narrow phone, tablet, laptop, and desktop sizes. Inspect keyboard-only navigation, focus visibility/order, labels, names/roles/values, status/alert announcements, modal/confirm behaviour, touch targets, overflow, zoom, reduced-motion expectations, colour contrast, and screen-reader comprehensibility.
14. Review PWA/offline behaviour: static export, manifest, icons, service-worker install/update/activate, cache versioning, route caching for `/`, `/health/`, `/coach/`, `/platform/`, navigation fallbacks, uncached offline assets, stale caches, update rollback, and local-data survival across updates.
15. Review CI and supply-chain behaviour: workflow triggers, runner labels/eligibility, permissions, fork behaviour, dependency installation strategy, missing lockfile implications, script parity, timeouts, secret exposure, third-party Actions pinning, and whether queued/skipped runs are being misreported as passing or failing code.
16. Run every available executable gate. At minimum run dependency install in a clean environment, TypeScript, every unit test, production build, PWA checks, and any browser/smoke/accessibility tests present. Add focused tests for each bug you fix when practical. Do not claim a pass for a command that did not execute successfully.
17. Search for dead code, unused exports/imports/state, stale phase references, comments/docs that contradict runtime behaviour, TODO/FIXME/HACK markers, disabled tests, `any`, non-null assertions, swallowed errors, empty catches, `console` leaks, unsafe globals, direct storage access during render, and duplicate domain logic that can drift.
18. Review every changed line again after fixes. Re-run the complete gate from a clean state. Compare the final branch to the exact starting SHA and ensure no unrelated regressions or accidental production/infrastructure changes were introduced.

### Finding standard

For every finding, report:
- severity: Blocker / Critical / High / Medium / Low
- category
- exact file and line(s)
- concrete failure mode
- reproduction or reasoning path
- user/data/security/safety impact
- root cause
- smallest safe fix
- regression test needed
- whether the fix was implemented
- verification evidence after the fix

Do not report speculative style preferences as bugs. Do not suppress a real defect because a test currently passes. Treat tests as evidence to audit, not authority.

### Safety/product invariants that must never regress

- Human Health is a fitness/lifestyle product, not a medical authority.
- No diagnosis, injury clearance, medication/insulin dosing, treatment-carbohydrate calculation, or emergency monitoring.
- No universal health score combining unlike domains.
- Missing/stale/partial/failed/inferred/manual data must remain distinguishable.
- Different exercise variants/equipment loads are not silently equivalent.
- Safety and recovery constraints override progression.
- Historical activity is not silently rewritten to make schedules look complete.
- Preventive intervals are not invented by the app.
- Capability models cannot claim real-world validation without appropriate external evidence and independent replication.
- Personal models are local-only by default and descriptive unless a separately reviewed architecture explicitly changes that.
- External/AI sharing is explicit, scoped, reviewable, and initiated by the user.
- Camera/video analysis remains unavailable unless its separate reliability/privacy gate and runtime review have actually passed.

### Final deliverables

Produce all of the following:

1. **Executive release verdict:** `READY`, `READY WITH NON-BLOCKING FOLLOW-UPS`, or `BLOCKED`.
2. **Exact reviewed commit/branch** and source/CI coverage.
3. **Finding ledger** sorted by severity.
4. **Fix ledger** with commit SHAs for changes you made.
5. **Verification matrix** showing every command/test and actual result.
6. **Unverified matrix** for anything you could not execute (real devices, native bridges, runner infrastructure, external research, production, etc.).
7. **Data-flow and trust-boundary review**, including all persistence and external-share boundaries.
8. **Security/privacy review**.
9. **Accessibility/responsive/PWA review**.
10. **Health/coaching claim review**.
11. **Dead-code/documentation-drift review**.
12. **Remaining blockers and exact next actions**.
13. A final statement explicitly distinguishing **source-complete**, **verified**, **release-ready**, and **deployed**. Never use these as synonyms.

If you find defects, fix safe source-only issues on the review branch, add regression tests, and continue reviewing until no known Blocker/Critical/High findings remain or a finding is clearly blocked by external evidence/approval. Do not merge the review branch. Return a final PR/review handoff ready for a human merge decision.