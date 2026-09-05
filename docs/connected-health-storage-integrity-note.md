# Connected-health storage integrity

Connected-health trust is domain-specific and fail-closed.

- Observation rows must normalize through the canonical observation validator before summaries, coaching, clinician export, or complete export can use them.
- Persisted source-state rows must satisfy the same strict provider/status/metric/timestamp requirements used for imported connected-health archives.
- Persisted connected-health preferences may omit legacy optional fields, but any stored field that is present must have a valid type/range; malformed preference state is not silently converted into a trusted complete export.
- A normal complete export refuses when any required connected-health store is corrupt or unreadable.
- A validated **replace** import may use an internal raw recovery snapshot to repair corrupt IndexedDB state. Raw recovery snapshots are rollback material only and are never presented as trusted health exports.
- Merge import continues to require trustworthy current connected-health state.
- Delete-all remains available regardless of corruption.
- Connected-health integrity errors clear connected-sleep readiness context and prevent corrupted connected-health evidence from entering coaching, clinician exports, or connected-health integration scopes.

Browser/IndexedDB verification remains required before release.