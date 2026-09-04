# Phase 4 coaching safety and privacy

## Deterministic coaching boundary

Phase 4 recommendations are generated locally from deterministic application rules. The coaching snapshot can use local training history, readiness check-ins, goal preferences and summarized connected-health trends. It does not diagnose conditions or calculate medication, insulin, treatment carbohydrates, emergency actions, or injury clearance.

Stale, partial, failed and insufficient connected-health signals remain visible but do not receive current coaching confidence. Directional connected-health changes are described value-neutrally rather than labelled medically better or worse.

## Conversational input

Conversational adaptation is a local parser, not an open-ended medical assistant. It recognizes bounded training context such as time, energy, gym/equipment, life mode and goal hints. The resulting workout is a preview only; it does not change history, preferences or the rolling schedule.

When symptom or treatment language is detected, the workout preview is withheld. The parser does not interpret symptoms, insulin/medication questions, correction doses, treatment carbohydrates or medical clearance.

## Optional AI narrative provider

Phase 4 does not bundle an AI provider, API key or remote account. If a future/native host exposes `window.HumanHealthCoachAI`, the user must explicitly request an AI explanation. The provider receives the already-decided coaching actions plus the evidence summaries needed to explain them. Depending on the host implementation, this may transmit those summaries outside the local browser; the host must disclose its destination, retention and privacy behaviour before use.

The AI return value is narrative text only. It cannot directly mutate the deterministic coaching snapshot, workout history, preferences, evidence confidence or action order. The request contract instructs the provider not to diagnose, provide injury clearance, prescribe medication/insulin, calculate treatment carbohydrates or create a universal health score.

## Movement/video gate

Phase 4 does not request camera access, upload video or generate pose/movement-quality scores. A future movement/video implementation requires separate review of benchmark quality, false-positive risk, device performance, privacy flow, retention, accessibility and explicit user permission. Passing the configuration gate alone does not approve a runtime camera feature.

## Data minimization

- Raw connected-health records are not required by the AI narrative contract; it receives coaching evidence summaries.
- Historical training records remain in the existing local stores.
- Conversational text is processed locally by Phase 4 unless a separately reviewed future integration explicitly changes that boundary.
- No Phase 4 source change creates a cloud account or background health-data upload.
