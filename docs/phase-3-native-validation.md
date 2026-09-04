# Phase 3 native validation gate

The browser/PWA implementation cannot prove native Health Connect or HealthKit behaviour by itself.

## Android Health Connect
Before describing Health Connect as device-verified, test a compatible Android host implementing `window.HumanHealthNative.healthConnect` for availability, user-initiated permissions, incremental reads, continuation cursors/change tokens, source metadata, partial batches, permission revocation, provider deletions, reconnect, and local source deletion.

## Apple Health / HealthKit
Before describing HealthKit as device-verified, test a compatible Apple host implementing `window.HumanHealthNative.appleHealth` for availability, user-initiated permissions, reads, source/device metadata, denied/revoked permission states, and disconnect behaviour.

## Apple Health export
Validate at least one large real `export.xml` locally in a browser/device environment. Record processing time, memory behaviour, unsupported-record reporting, duplicate re-import behaviour, and confirmation that no server upload occurs.

These gates are intentionally distinct from web/PWA source completion and browser QA.