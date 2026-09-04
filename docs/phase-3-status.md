# Phase 3 status — Connected health context

Phase 3 adds user-controlled connected and imported health context without turning Human Health into a medical authority.

## Source scope status: COMPLETE AND REVIEWED

The planned Phase 3 web/PWA feature scope is implemented on `phase-3-connected-health` in draft PR #62. The branch is ancestry-current with the latest `post-phase2-hardening` head and is 0 commits behind that base.

### Implemented and source-reviewed

- [x] Provider-neutral observation model with canonical units and original type/unit preservation
- [x] Provenance for provider, ingestion method, source application, device, external record ID/version, and import time
- [x] IndexedDB repository separated from Phase 1/2 workout localStorage
- [x] Deterministic upsert/version/deletion handling and selected-source aggregation to avoid duplicate provider totals
- [x] Health Connect native bridge adapter contract
- [x] Apple Health/HealthKit native bridge adapter contract
- [x] Explicit unavailable state in a browser-only PWA
- [x] Incremental source sync with cursor, batch limit, partial, failed, stale, and deletion handling
- [x] Apple Health XML import with chunked browser parsing and unsupported-record reporting
- [x] Canonical connected-health JSON import/export
- [x] Complete local archive containing training and connected-health data
- [x] Validation-first merge/replace import, rollback-aware full import, and atomic connected-repository replacement
- [x] Source-scoped deletion and rollback-aware complete local deletion
- [x] Steps, sleep, heart rate, resting heart rate, cardio fitness, distance, active energy, workout, hydration, protein, and fibre mappings
- [x] Optional fruit/vegetable and meal-quality habit logging
- [x] Freshness-aware summaries and recent-versus-prior trend views
- [x] Overlapping sleep-stage intervals are merged before sleep duration is summarized
- [x] Fresh connected sleep can inform effective readiness; a recent manual sleep check remains authoritative
- [x] Dedicated `/health/` route, source/permission UI, provenance details, habits, import/export, and offline route caching
- [x] Reconciled Phase 2 workout finalization/deduplication, storage failure handling, readiness logic, and final acceptance tests
- [x] Safety/privacy and native-validation documentation
- [x] Unit-test source coverage for conversions, deduplication, native mapping, Apple XML, summaries, trends, sync, portability, source state, connected readiness, and sleep-overlap accounting

## Automated/browser verification still required

- [x] Reconcile PR #62 with latest `post-phase2-hardening`
- [ ] TypeScript check
- [ ] Unit-test suite
- [ ] Production static build
- [ ] PWA static checks including `/health/`
- [ ] Browser QA for IndexedDB persistence, imports, source deletion, full archive restore, offline Health route, and responsive/accessibility states

### Current infrastructure blocker

GitHub creates the verification runs, but the Human Health job is waiting for an eligible runner. The known working Ashbi runner documented in `camster91/magic-type-quest` is repository-scoped to that repository, so it cannot be assumed eligible for `human-health`. Issue #51 now tracks provisioning/authorizing a dedicated Human Health runner as an approval-gated infrastructure action.

## Native validation release dependencies

- [ ] Compatible Android host validation for Health Connect permissions, reads, cursors, revocation, provider deletions, and source deletion
- [ ] Compatible Apple host validation for HealthKit permissions, reads, revocation, and disconnect
- [ ] Large real Apple Health export validation locally without server upload

The browser/PWA cannot prove these native integrations. Their unverified state is explicit rather than inferred from adapter source code.

## Completion definition

Phase 3 is **source-complete and source-reviewed**. It becomes **verified complete for the web/PWA surface** only after the automated and browser gates pass. Native Health Connect and HealthKit integrations remain release dependencies until compatible native hosts implement and test the documented bridge contracts.

## Safety boundary

Connected observations are contextual data, not diagnosis. The app must not prescribe insulin or medication, perform emergency monitoring, provide injury clearance, or infer a medical condition from sleep, heart rate, glucose-adjacent context, or fitness trends.
