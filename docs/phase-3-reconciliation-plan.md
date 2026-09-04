# Phase 3 reconciliation plan

`phase-3-connected-health` was originally stacked on an earlier Phase 2 hardening head. Before Phase 3 can be reviewed as complete, its connected-health additions must be reconciled with the latest `post-phase2-hardening` branch without discarding either side.

Resolution strategy:

1. Use the latest Phase 2 hardening tree as the baseline for workout/runtime code.
2. Add the Phase 3 connected-health UI, IndexedDB repository, adapters, importers, sync model, summaries, habits, portability, and documentation unchanged where files are Phase-3-only.
3. Manually reconcile the shared files: storage, readiness, app layout, PWA service worker/checks, verification workflow, roadmap, and package version.
4. Preserve Phase 2 workout finalization/deduplication and storage-failure handling while retaining Phase 3 connected-sleep context and full archive import/export.
5. Keep native Health Connect/HealthKit bridges explicitly unverified until compatible hosts are available.

The resulting reconciliation commit should have both the latest Phase 3 head and latest Phase 2 hardening head as parents.