# Phase 3 acceptance audit

This audit records source-level acceptance checks that remain meaningful while CI is blocked on a repository-eligible runner.

## Confirmed in source

- Connected observations are source-owned and carry canonical plus original provider/unit provenance.
- Provider imports and manual observations are not silently treated as the same record.
- Source selection avoids summing duplicated provider totals by default.
- Fresh, stale, partial, failed, unavailable, permission-required, and not-connected states remain distinguishable.
- Connected sleep can constrain readiness only when fresh and enabled; recent manual sleep input remains authoritative.
- Apple Health XML import is local and batched, reports unsupported/malformed records, and does not require server upload.
- Health Connect and HealthKit are explicit native-host bridge contracts; an ordinary browser reports them as unavailable instead of fabricating connectivity.
- Connected-health archive parsing validates observations and source metadata before replacement.
- Connected archive source provider/status/metric/freshness/timestamp metadata is rejected when malformed instead of silently coerced.
- Unknown non-empty measurement units are rejected instead of being assumed canonical.
- Native heart-rate sample IDs remain stable if a provider reorders samples or corrects a value at the same timestamp.
- Full archive operations retain rollback behaviour and connected repository replacement is transactional.
- Source-scoped deletion leaves unrelated sources and training history intact.
- Batched localStorage cleanup/import retains the first storage failure even when later mutations succeed.
- Phase 2 volume-scaling, progression, workout accounting, recovery trend, and minimum-effective-day behaviours remain preserved on the Phase 3 branch.
- The Health route no longer references the removed runtime PWA icon generator; committed icon assets remain the source of truth.

## Still requires executable evidence

- TypeScript compiler
- complete unit-test suite
- production static export
- PWA static checks including `/health/`
- IndexedDB/browser persistence and restore paths
- source deletion and full archive round-trip in a real browser
- mobile/tablet/desktop keyboard and accessibility review
- Android Health Connect native-host validation
- Apple HealthKit native-host validation
- a large real Apple Health export

## Safety boundary

Do not call Phase 3 release-verified from source inspection. Do not infer diagnosis, medication/insulin dosing, emergency monitoring, injury clearance, or causal health conclusions from connected data.
