# Native health bridge contract

The installed PWA cannot directly call platform-native Health Connect or HealthKit APIs. A compatible Android or Apple app host can expose a narrow bridge at `window.HumanHealthNative`.

```ts
window.HumanHealthNative = {
  healthConnect?: NativeHealthBridge,
  appleHealth?: NativeHealthBridge,
};
```

The TypeScript contract is defined in `lib/connected-health/types.ts`.

## Required methods

### `status()`

Returns whether the platform API is available and which canonical metrics are already authorized. It must not trigger a permission prompt.

### `requestPermissions(metrics)`

Must be called only after a user action. The host maps canonical metrics to platform permissions and returns only the metrics actually granted. Denied permissions must remain distinguishable from unavailable APIs.

### `read(request)`

Accepts canonical metrics, an ISO start/end range, and an optional provider cursor. Returns:

- native records
- provider-deleted external IDs where available
- a new continuation cursor/change token
- whether the batch is complete
- warnings that make a source partial

The host must keep provider-native identifiers and versions stable across syncs. Record ownership/data origin, source name, device, native type/unit, time range, and timezone offset should be supplied when available.

### `disconnect()`

Optional platform cleanup. Local imported observations are deleted separately only after an explicit user confirmation.

## Supported canonical metrics

- steps
- sleep duration and stages
- heart rate and resting heart rate
- cardio fitness/VO2 max
- distance and active energy
- workout duration
- water, protein, and fibre

Unsupported platform types must be omitted and reported, not guessed into a nearby metric.

## Health Connect record mapping

The web adapter currently recognizes records such as `StepsRecord`, `SleepSessionRecord`, `SleepStageRecord`, `HeartRateRecord`, `RestingHeartRateRecord`, `Vo2MaxRecord`, `DistanceRecord`, `ActiveCaloriesBurnedRecord`, `ExerciseSessionRecord`, `HydrationRecord`, and `NutritionRecord` fields.

For change-token sync, provider deletions should return the original external record IDs. Heart-rate series can be supplied as sample arrays; the web mapper creates stable sample-level observations.

## Apple Health/HealthKit mapping

The bridge can supply native identifiers such as step count, sleep analysis, heart rate, resting heart rate, VO2 max, walking/running distance, active energy, workouts, water, protein, and fibre. The same canonical bridge response is used so provider-specific APIs do not leak into the app model.

## Security and privacy expectations

- Do not expose unrelated native APIs through the bridge.
- Do not request permissions before a user gesture.
- Do not send health records to a remote server in Phase 3.
- Return the minimum fields needed for provenance, sync, and display.
- Treat revoked permissions and provider errors as source-state changes.
- Never return insulin doses, medication changes, diagnoses, or emergency decisions from this bridge.
