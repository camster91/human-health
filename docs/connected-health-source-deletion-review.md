# Connected-health source deletion contract

This review note defines the intended privacy behavior for a future source-deletion hardening change.

When a user explicitly chooses **Delete source data**, deleting Human Health's local copy of that source must not depend on a native provider/bridge disconnect succeeding.

Required order:

1. Ask for explicit deletion confirmation.
2. Delete the source observations and source state owned by Human Health locally.
3. Attempt provider/bridge disconnect as a separate best-effort action, or clearly separate the two controls.
4. If native disconnect fails after local deletion, report that local Human Health data was deleted but the external provider/host connection may still require attention.
5. Never report local deletion success if the local IndexedDB transaction failed.
6. Never imply that deleting Human Health's local data deletes source records from Apple Health, Health Connect, or another upstream provider.

This is a privacy/UX contract, not evidence that native-host behavior has been verified. Browser/native-host verification remains under the final release gate.
