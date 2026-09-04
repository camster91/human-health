# Phase 3 safety review

Phase 3 treats connected health data as context, not medical authority.

## Boundaries
- Native Health Connect and HealthKit access is opt-in and only available through an explicit compatible host bridge.
- Browser/PWA mode must show native providers as unavailable rather than fabricating connection state.
- Connected sleep, movement, heart rate, cardio fitness, hydration, and nutrition observations can support summaries and conservative fitness context only.
- No diagnosis, emergency monitoring, injury clearance, medication dosing, insulin dosing, carbohydrate dosing, or correction advice is generated.
- Missing, stale, partial, failed, imported, manual, and measured data remain distinguishable.
- Every imported/provider observation retains provenance.
- Connected health processing remains local-only in this phase; no remote health-data upload is introduced.

## Type 1 diabetes boundary
Raw glucose or treatment data are not required for Phase 3 connected-health completion. If glucose context is introduced in a later approved scope, it must remain optional and must not generate insulin or carbohydrate dosing instructions. Training recommendations may only become more conservative when a user explicitly supplies concerning context, with reference back to the user's established diabetes safety plan or clinician guidance.