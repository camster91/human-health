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
- Connected-health archive parsing validates before replacement, and full archive operations retain rollback behaviour.
- Source-scoped deletion leaves unrelated sources and training history intact.
- Phase 2 volume-scaling, progression, workout accounting, recovery trend, and minimum-effective-day behaviours remain preserved on the Phase 3 branch.

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
