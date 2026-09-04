# Connected health architecture

## Purpose

Phase 3 introduces connected health context while preserving the local-first workout app. The design keeps provider-specific APIs outside the canonical health model and makes source, freshness, and sync state visible.

## Storage boundaries

### Training store

Phase 1/2 workout, readiness, programme, preference, assessment, and active-session data remain in browser localStorage through `lib/storage.ts`. Active workout writes are synchronous so a completed set can be persisted immediately.

### Connected-health store

Connected observations, provider/source states, sync cursors, and connected-health preferences use IndexedDB through `lib/connected-health/repository.ts`. This avoids forcing potentially large health histories into localStorage.

A complete user-owned archive combines both stores. No server upload is required by the Phase 3 implementation.

## Canonical observation

Every observation includes:

- canonical metric, value, and unit
- start/end/recorded timestamps
- source identifier
- direct or derived quality
- provider and ingestion method
- source application and device when supplied
- provider-native type and unit
- stable external record identifier and optional version
- local import timestamp

Provider records are never treated as interchangeable merely because they measure the same metric. Daily totals and trends select one source per metric unless the user explicitly changes the preferred source.

## Adapter boundary

`HealthDataAdapter` exposes four operations:

1. inspect availability and granted permissions
2. request granular permissions after a user action
3. read one incremental batch using a time range and optional cursor
4. disconnect where the host supports it

The web app provides Health Connect and Apple Health adapter implementations that call a documented native bridge. In an ordinary browser they return an explicit unavailable state and direct the user to local file import.

## Sync state machine

Each source records one of:

- not connected
- unavailable
- permission required
- syncing
- current
- partial
- stale
- failed

A successful partial batch is retained. An incomplete provider response must supply a new continuation cursor; repeated or missing cursors stop the loop and mark the source partial rather than spinning indefinitely. Provider tombstones are applied only to observations owned by that source.

## Freshness and recommendation use

Freshness is evaluated independently for the source and each observation. Stale, partial, and failed data remain visible but are not silently presented as current.

Fresh connected sleep may contribute sleep duration/quality to effective readiness. A recent manual sleep check has priority, while manual stress, soreness, fatigue, pain, and illness fields remain user-controlled. Connected data does not authorize diagnosis or treatment.

## Import paths

- Apple Health XML: parsed locally in chunks; supported opening tags are normalized and unsupported types are counted.
- Connected-health JSON: validates schema, observations, sources, preferences, and duplicates before storage.
- Complete Human Health archive: validates training and connected sections first, supports merge or replace, and attempts rollback if either store fails.

## Future server/cloud layer

Authentication, encrypted cloud sync, sharing, clinician export, and multi-device reconciliation are deliberately outside Phase 3. Any future cloud layer must preserve immutable source provenance, explicit consent, source-scoped deletion, and user-owned export.
