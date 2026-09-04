# Connected health privacy and consent

## Phase 3 data location

Connected observations are stored in IndexedDB in the current browser profile. Training data remains in localStorage. Apple Health XML and Human Health archives are read locally by browser code; this phase does not upload them to a Human Health server.

This local-only design reduces exposure but is not the same as encrypted cloud backup. Browser data can be lost if site storage is cleared, the device is lost, or the browser removes storage. Users should export an archive before clearing data or changing devices.

## Consent rules

- Native provider connection begins only after the user selects Connect.
- Permissions are requested by metric and the granted set is displayed.
- File import begins only after the user chooses a file.
- Fresh connected sleep affects readiness only when the preference is enabled.
- A recent manual sleep check overrides connected sleep.
- Nutrition and hydration habits are optional and can be left disabled/unlogged.
- No background cloud account or sharing is created in Phase 3.

## Transparency

Every observation exposes provider, ingestion method, source name, original type/unit, device where available, external ID, timestamp, and direct/derived quality. Source cards show current, stale, partial, failed, unavailable, permission-required, or syncing state.

When multiple sources contain the same metric, Human Health selects one source rather than adding all providers together. The selected source is visible and can be changed.

## Deletion and portability

Users can:

- delete one connected source without deleting other providers or training history
- disconnect a native adapter while retaining or separately deleting local observations
- export only connected-health data
- export a complete archive containing both training and connected data
- import by merge or replace after validation
- delete all Human Health data in the current browser after confirmation

## Medical boundary

The connected-health layer provides descriptive context only. It must not:

- diagnose a condition
- clear an injury or illness
- prescribe medication or insulin
- calculate treatment carbohydrates
- provide emergency monitoring
- interpret heart-rate or sleep changes as a medical conclusion

Symptoms, concerning readings, or treatment decisions require the user’s established care plan and qualified healthcare guidance.
