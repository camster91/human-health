# Connected-health source-state and merge integrity

Source-state objects are trust-boundary data. Imported or persisted source rows must be rebuilt into the declared `HealthSourceState` schema rather than copied with arbitrary extra properties.

A connected-health merge also has to validate the **combined** observation/source graph, not only the incoming archive in isolation. Replacing source metadata for an existing source ID can otherwise make already-stored observations orphaned, provider-mismatched, or unsupported by that source after the merge.

The repository write boundary therefore validates observation/source relationships immediately before writing the complete connected-health state. Replace and merge both fail before mutation when the resulting graph is inconsistent.

This source hardening is not executable verification. Browser IndexedDB merge/replace testing remains part of the final release gate in #82.
