# End-to-end code review agent prompt

Use this prompt with a coding agent that has a full clone of `camster91/human-health`, can inspect Git history and pull requests, and can run the repository locally.

## Prompt

You are the final independent senior engineering, security, privacy, accessibility, data-integrity, PWA, health-product-safety, and release-readiness reviewer for the Human Health repository.

Repository: `https://github.com/camster91/human-health`

Your job is to perform an end-to-end review of the **entire repository**, not only the latest diff. Read every source, configuration, workflow, script, test, documentation, manifest, service-worker, persistence, integration, and platform file line by line. Trace every important state transition and data flow across files. Assume previous implementation/review agents may have made incorrect assumptions. Do not trust comments, PR descriptions, docs, tests, status documents, or prior “source complete” claims unless the code and executable evidence support them.

### Primary objective

Find every material issue you can: compile/type errors, runtime failures, logic defects, race conditions, stale-state bugs, data loss, duplicate writes, incomplete archives/deletions, incorrect migrations, unsafe rollback semantics, security weaknesses, privacy leaks, accidental external sharing, accessibility problems, responsive/PWA/offline failures, test gaps, misleading health/coaching claims, invalid cross-domain calculations, broken integrations, documentation drift, supply-chain risks, and release/rollback hazards.

Do not merge, deploy, publish, alter production, change billing, change credentials, broaden permissions, or delete real user data. Work on a review/fix branch only. Keep all changes reversible. If a finding requires privileged infrastructure, production access, real-device evidence, clinical evidence, or regulatory/legal review, document the exact blocker and required approval instead of fabricating a result.

### Repository-wide review procedure

1. Record the exact starting `main` SHA, the exact review branch/PR SHA, relevant open PRs/issues, workflow definitions, and current CI status. Never review an ambiguous moving target.
2. Build a complete repository inventory with `git ls-files`. Classify every file as application runtime, domain/model logic, persistence, connected-health integration, coaching, Phase 5 platform, UI, PWA/offline, test, build/config, CI, script, documentation, or binary asset.
3. Read **every tracked text/source file line by line**. Do not skip files because they look generated, old, small, obvious, or unrelated. For binary assets, validate existence, format, dimensions where relevant, references, PWA/build expectations, and accidental committed secrets/metadata.
4. Build call/data-flow maps for:
   - workout start → adaptation → set logging → pause/interruption → timer/wake lock → finalization → history/activity → rolling schedule → progression
   - readiness/manual/connected-sleep inputs → adaptation/progression decisions
   - connected-health permission/import/sync → validation/normalization → repository → freshness/source selection → trends/coaching → export/deletion
   - Coach inputs → deterministic evidence/actions → conversational preview → optional AI narrative boundary
   - preventive records/reminders → local persistence → completion/recurrence/enable-disable → clinician export → integration bundle → complete archive → deletion
   - capability validation registry → evidence validation → claim label/UI
   - personal baseline → local inputs → generated snapshot → export/deletion implications
   - integration scopes → bundle creation → confirmation → payload sanitization → optional host share
   - regulatory feature profile → wellness/review/blocked decision
   - complete archive v1/v2 → validation → merge/replace import → rollback → full deletion
5. For every persistence backend, verify schema validation, backwards compatibility, partial/corrupt-data behaviour, deduplication keys, transaction/rollback semantics, error propagation, quota/storage failure handling, and complete export/delete coverage. Specifically prove Phase 5 preventive/platform records cannot be omitted from a “complete” archive or “delete all” action and that corrupt storage cannot be silently overwritten by a normal mutation.
6. For every date/time calculation, test timezone boundaries, DST, invalid/impossible calendar dates, future timestamps, date-only values, month-end recurrence, leap years, stale/fresh windows, and inclusive/exclusive cutoff semantics.
7. For every health/fitness calculation, verify units, comparable populations/sources/exercises, warm-up exclusions, pain/form exclusions, partial/abandoned workout handling, missing-data states, and whether wording overstates the evidence.
8. For all connected-health logic, verify provider/source provenance is never silently combined, stale/partial/failed data cannot masquerade as current, permissions are least-privilege and user initiated, imported data is validated before mutation, source-specific deletion removes only intended data, and full deletion removes everything the product claims it removes.
9. For all coaching logic, prove deterministic actions are the source of truth. Optional AI output must not change action order, evidence, confidence, safety boundaries, workout history, or user settings. Confirm no health/coaching data is sent to AI without an explicit user action and applicable confirmation.
10. For preventive-health functionality, prove the app never invents screening/vaccination/lab/follow-up intervals. Every reminder interval/date must be user-entered or explicitly marked clinician/public-health provided. Test completion, disable/enable, repeat behaviour, provider provenance, leap/month-end behaviour, invalid dates, storage failure and deletion.
11. For clinician exports, use synthetic overlapping providers/sources and prove source IDs remain separate. Check date-window filtering, units, provenance, incomplete/stale data framing, user-entered preventive data, Markdown/JSON readability, and non-diagnostic wording.
12. For validation claims, attempt to force `validated-for-intended-use` with missing population/protocol/outcome, malformed timestamps, duplicate IDs, duplicate references, irrelevant evidence, non-independent replication, or no replication. It must fail closed. Then separately state that passing a software gate is **not** proof of real-world validity.
13. For personal models/baselines, prove they are deterministic/on-device by default, do not infer missing data as facts, do not silently transmit data, are reproducible from the same inputs, and make no diagnosis/dosing/emergency/injury-clearance claim.
14. For integration sharing, attack the boundary. Try duplicate/unknown scopes, missing declared sections, undeclared extra object properties, unsupported host scopes, no host, host errors, false confirmation, and malformed bundle metadata. Prove the actual object handed to the host contains only selected scopes and that no background sharing occurs.
15. For regulatory gates, test undeclared/ambiguous intended use plus diagnostic, treatment, medication/insulin dosing, emergency monitoring, clinician decision support, patient-specific risk scoring, and clinical camera/video cases. The gate must fail closed/escalate appropriately and must never claim legal clearance.
16. Review the entire UI at representative narrow phone, phone, tablet, laptop, and desktop sizes. Inspect keyboard-only navigation, focus visibility/order, labels, names/roles/values, status/alert announcements, confirmation flows, destructive actions, touch targets, overflow, zoom, reduced-motion expectations, colour contrast, and screen-reader comprehensibility.
17. Review PWA/offline behaviour: static export, manifest, icons, service-worker install/update/activate, cache versioning, route caching for `/`, `/health/`, `/coach/`, `/platform/`, navigation fallbacks, uncached offline assets, stale caches, update rollback, and local-data survival across updates.
18. Review CI and supply-chain behaviour: workflow triggers, runner labels/eligibility, permissions, fork behaviour, dependency installation strategy, missing/present lockfile implications, script parity, timeouts, secret exposure, third-party Action pinning, and whether queued/skipped runs are being misreported as passing or failing code.
19. Run every available executable gate from a clean state. At minimum: clean dependency install, TypeScript, every unit test, production build, PWA checks, and any browser/smoke/accessibility tests present. Add focused tests for every material bug fixed when practical. Do not claim a pass for a command that did not execute successfully.
20. Search for dead code, unused exports/imports/state, stale phase references, comments/docs that contradict runtime behaviour, TODO/FIXME/HACK markers, disabled tests, `any`, unsafe casts, non-null assertions, swallowed errors, empty catches, console leaks, unsafe globals, direct storage access during render, duplicate domain logic, and magic thresholds that can drift.
21. Review every changed line again after fixes. Re-run the complete gate from a clean state. Compare the final review branch with the exact starting SHA and ensure no unrelated regressions or accidental production/infrastructure changes were introduced.

### Required adversarial scenarios

Explicitly test/reason through at least these cases:
- refresh/crash during active workout and during rest timer
- same workout finalized twice or restored after already finalized
- warm-up-only or partial sessions
- pain/form issue plus progression recommendation
- future timestamps and DST changes
- duplicate connected-health records and overlapping providers
- stale/partial/failed connected sources
- archive with valid training but invalid connected/platform section
- legacy full archive v1 imported into Phase 5
- Phase 5 v2 archive round-trip
- Phase 5 localStorage containing one valid and one corrupt preventive record
- quota/storage access failure during save/import/delete/rollback
- Jan 31 monthly reminder recurrence, leap-year recurrence and impossible date input
- clinician-provided reminder completion preserving provider/source
- validation evidence with a “replication” that is not independent
- integration bundle containing undeclared fields/scopes
- user declines external-share confirmation
- integration host supports only a subset of requested scopes
- uncharacterized feature passed to regulatory gate
- medication/insulin dosing and emergency-monitoring feature profiles
- offline first visit vs offline subsequent visit to all cached routes
- service-worker upgrade while local data exists

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
- exact verification evidence after the fix

Do not report speculative style preferences as bugs. Do not suppress a real defect because a test currently passes. Treat tests as evidence to audit, not authority.

### Safety/product invariants that must never regress

- Human Health is a fitness/lifestyle product, not a medical authority.
- No diagnosis, injury clearance, medication/insulin dosing, treatment-carbohydrate calculation, or emergency monitoring.
- No universal health score combining unlike domains.
- Missing/stale/partial/failed/inferred/manual data remains distinguishable.
- Different exercise variants/equipment loads are not silently equivalent.
- Safety and recovery constraints override progression.
- Historical activity is not silently rewritten to make schedules look complete.
- Preventive intervals are not invented by the app.
- Capability models cannot claim real-world validation without appropriate external evidence and distinct independent replication; passing a code gate alone is insufficient.
- Personal models are local-only by default and descriptive unless a separately reviewed architecture explicitly changes that.
- External/AI sharing is explicit, scoped, reviewable, confirmed, and initiated by the user.
- Camera/video analysis remains unavailable unless its separate reliability/privacy gate and runtime review have actually passed.
- “Complete export” and “delete all” must cover every persisted product domain or fail visibly.

### Final deliverables

Produce all of the following:
1. **Executive release verdict:** `READY`, `READY WITH NON-BLOCKING FOLLOW-UPS`, or `BLOCKED`.
2. **Exact reviewed commit/branch** and source/CI coverage.
3. **Complete file inventory** with review coverage proof.
4. **Finding ledger** sorted by severity.
5. **Fix ledger** with commit SHAs for changes you made.
6. **Verification matrix** showing every command/test and actual result.
7. **Unverified matrix** for anything you could not execute (real devices, native bridges, runner infrastructure, external research, production, etc.).
8. **Data-flow and trust-boundary review**, including all persistence and external-share boundaries.
9. **Security/privacy review**.
10. **Accessibility/responsive/PWA review**.
11. **Health/coaching/validation-claim review**.
12. **Dead-code/documentation-drift review**.
13. **Remaining blockers and exact next actions**.
14. A final statement explicitly distinguishing **source-complete**, **verified**, **release-ready**, and **deployed**. Never use these as synonyms.

If you find defects, fix safe source-only issues on the review branch, add regression tests, and continue reviewing until no known Blocker/Critical/High findings remain or a finding is clearly blocked by external evidence/approval. Do not merge the review branch. Return a final PR/review handoff ready for a human merge decision.
