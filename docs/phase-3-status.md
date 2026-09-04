# Phase 3 status — Connected health context

Phase 3 adds user-controlled connected and imported health context without turning Human Health into a medical authority.

## Source scope status

The planned Phase 3 feature scope is implemented on `phase-3-connected-health` in draft PR #62.

### Implemented in source

- [x] Provider-neutral observation model with canonical units and original type/unit preservation
- [x] Provenance for provider, ingestion method, source application, device, external record ID/version, and import time
- [x] IndexedDB repository separated from Phase 1/2 workout localStorage
- [x] Health Connect native bridge adapter contract
- [x] Apple Health/HealthKit native bridge adapter contract
- [x] Explicit unavailable state in a browser-only PWA
- [x] Incremental source sync with cursor, batch limit, partial, failed, stale, and deletion handling
- [x] Apple Health XML import with chunked browser parsing and unsupported-record reporting
- [x] Canonical connected-health JSON import/export
- [x] Complete local archive containing training and connected-health data, with merge/replace and rollback behaviour
- [x] Source-scoped deletion and complete local deletion
- [x] Steps, sleep, heart rate, resting heart rate, cardio fitness, distance, active energy, workout, hydration, protein, and fibre mappings
- [x] Optional fruit/vegetable and meal-quality habit logging
- [x] One selected source per metric to avoid silently adding duplicate provider totals
- [x] Freshness-aware summaries and recent-versus-prior trend views
- [x] Fresh connected sleep can inform effective readiness; a recent manual sleep check overrides it
- [x] Dedicated Health route, source/permission UI, provenance details, habits, import/export, and offline route caching
- [x] Unit tests for conversions, deduplication, native mapping, Apple XML, summaries, trends, sync, portability, source state, and connected readiness

## Verification still required

- [ ] Reconcile PR #62 with the latest `post-phase2-hardening` head after PR #52 stabilizes
- [ ] TypeScript check
- [ ] Unit-test suite
- [ ] Production static build
- [ ] PWA static checks including `/health/`
- [ ] Browser QA for IndexedDB, imports, source deletion, full archive restore, offline Health route, and responsive/accessibility states
- [ ] Compatible Android native-host validation for Health Connect permissions, reads, cursors, and deletions
- [ ] Compatible Apple native-host validation for HealthKit permissions and reads
- [ ] Large real Apple Health export validation without server upload

## Completion definition

Phase 3 is **source-complete** when every planned feature above is present and reviewed. It is **verified complete for the web/PWA surface** only after the automated and browser gates pass. Native Health Connect and HealthKit integrations remain explicitly unverified until compatible native hosts implement and test the documented bridge contracts.

## Safety boundary

Connected observations are contextual data, not diagnosis. The app must not prescribe insulin or medication, perform emergency monitoring, provide injury clearance, or infer a medical condition from sleep, heart rate, glucose-adjacent context, or fitness trends.
