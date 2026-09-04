# Phase 3 final source review — Connected health context

Date: 2026-09-03 (America/Toronto)
PR: #62
Base: `post-phase2-hardening`

## Review conclusion

Phase 3 is **feature-scope complete and source-reviewed** for the web/PWA implementation. It is not yet release-verified because the automated verification job is waiting for a repository-eligible runner, browser QA has not run against the final candidate, and native Health Connect/HealthKit hosts are not available for device validation.

The Phase 3 branch is ancestry-current with `post-phase2-hardening` and is 0 commits behind that base.

## Completed and reviewed

### Data architecture
- Provider-neutral observation model with canonical values and original provider units/types.
- Stable source ownership plus provider external record IDs/versions for deterministic updates/deletions.
- Direct/derived quality and native-sync/file-import/manual/archive-import provenance.
- IndexedDB repository remains separate from workout localStorage.
- Connected archive replacement is validation-first and writes observations/sources/preferences in one IndexedDB transaction.
- Full archive import backs up both training and connected data and attempts rollback if either storage layer fails.
- Full local deletion is rollback-aware rather than intentionally leaving half-deleted stores.
- Batched localStorage mutations preserve the first failure instead of allowing a later successful write/remove to erase the actionable error.

### Providers and import
- Health Connect and HealthKit share a narrow canonical native bridge contract.
- Browser/PWA mode explicitly reports native providers unavailable rather than pretending to have permission/API access.
- Health Connect/HealthKit permissions are only requested after user action.
- Apple Health XML import runs locally, supports bounded batching, and reports malformed/unsupported records.
- Canonical connected JSON and complete Human Health archive export/import are supported.
- Imported source states are validated for provider, status, metrics, permissions, freshness windows and timestamps before being accepted.
- Unknown non-empty measurement units are rejected rather than guessed into a canonical unit.

### Health context
- Steps/daily movement, sleep, heart rate, resting heart rate, cardio fitness, distance, active energy and workouts have canonical mappings/summaries.
- Water, protein, fibre, fruit/vegetable servings and meal quality are optional habits.
- Aggregated totals select one provider per metric instead of silently adding likely duplicate sources.
- Source freshness and current/partial/stale/failed states remain visible.
- Overlapping sleep-stage intervals are merged before duration is calculated.
- Connected sleep only contributes to readiness while current; recent manual sleep remains authoritative.
- Heart-rate/workout summaries remain descriptive and explicitly non-diagnostic.
- Native heart-rate sample IDs are independent of array ordering and measured value so provider reordering does not duplicate samples and a corrected value can update the same sample identity.

### UX/PWA/privacy
- Dedicated `/health/` route exposes sources, permission scopes, data provenance, summaries, trends, habits and import/export controls.
- The Health route uses the committed static PWA icon assets; an obsolete runtime icon-generator import found during review was removed.
- Source-scoped delete does not remove unrelated providers or training history.
- Service-worker/PWA checks include `/health/` and offline fallback behaviour.
- Phase 3 introduces no remote health-data upload.
- Safety boundary explicitly excludes diagnosis, emergency monitoring, injury clearance, medication dosing, insulin dosing and carbohydrate dosing.

## Final source-review corrections

The final review caught and corrected:
1. Phase 3 branch divergence from the final Phase 2 hardening head.
2. Phase 2 progression tests referencing a non-existent `formRating` field instead of canonical `formQuality`.
3. Final Phase 2 volume scaling not yet propagated into the Phase 3 stack.
4. Full local deletion that could otherwise leave training and connected stores intentionally out of sync after a storage failure.
5. Connected archive replacement that previously cleared data across separate operations before all replacement writes were complete.
6. Sleep-stage summaries that could double-count overlapping intervals.
7. Summary copy that described every latest observation as direct even when provenance marked it derived.
8. Native heart-rate sample IDs that depended on provider array ordering and then, after the first correction, on the measured value.
9. A removed `pwa-icons.server` module still imported by the new Health route.
10. Local-storage batch operations where later successes could clear the first mutation failure message.
11. Unknown connected-health units being silently interpreted as canonical values.
12. Connected archive source metadata being normalized even when provider/status/metric metadata was malformed.

## Verification status

### Automated verification — BLOCKED BY RUNNER ACCESS
GitHub creates the workflow run, but `human-health` does not currently have a confirmed eligible self-hosted runner. The known `ashbi-vps-magic-type-quest` runner is repository-scoped to `magic-type-quest`, so it cannot be assumed eligible here. Issue #51 tracks the approval-gated runner action.

Still required:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check:pwa`

### Browser/PWA QA — PENDING
Still required on the final candidate:
- IndexedDB availability/persistence/reload
- canonical JSON merge import
- full archive merge + replace + rollback paths
- Apple Health XML local import, duplicate re-import and unsupported-record reporting
- source-scoped deletion
- complete local deletion confirmation/rollback behaviour
- `/health/` offline reload after initial cache
- mobile/tablet/desktop responsive review
- keyboard/focus/labels/contrast and serious accessibility checks

### Native validation — PENDING PLATFORM HOSTS
- Android Health Connect compatible host
- Apple Health/HealthKit compatible host
- large real Apple Health `export.xml`

These are release dependencies and are intentionally not inferred from source code.

## Merge/deploy gate

Keep PR #62 draft. Do not merge or deploy Phase 3 until the web verification/browser gates pass and Cameron separately approves the merge. Native integrations may remain documented release dependencies if the web/PWA surface is being reviewed independently, but they must remain visibly unverified.
