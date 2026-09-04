# Final review static-audit notes

Review branch: `final-independent-review`

This file records source-review boundaries that must not be confused with executable verification.

## Completed source-hardening themes

- workout finalization is journaled and idempotent across history/activity persistence
- training archive input is deeply validated before mutation and replace/merge can roll back exact touched localStorage state
- complete local export/delete spans training, connected health, connected sleep context and Phase 5 platform data
- pain/illness is a zero-prescription safety hold rather than implicit clearance for lighter exercise
- current/recent planning evidence rejects invalid/materially future timestamps
- comparable strength evidence excludes warm-up, pain, poor-form and invalid evidence
- stale bodyweight progression state fails closed
- streamed Apple Health XML import is recoverable at the touched-source boundary
- service-worker v9 installation fails closed and activation removes only stale Human Health caches
- third-party GitHub Actions are pinned to reviewed immutable SHAs
- release-safety invariant tests encode critical health-product and sharing boundaries

## Remaining source-review items

### Connected-health source deletion

The UI currently attempts native-adapter disconnect before deleting local source data. A native disconnect failure therefore prevents the local deletion requested by the user. The failure is visible, so this is not silent data loss or a false success, but local deletion should ultimately be independent of best-effort host disconnection. Treat this as privacy/UX hardening and verify the final behavior in browser/native-host QA.

### Connected-health persisted-row integrity

IndexedDB writes/imports normalize observations, but `listObservations()` reads stored rows directly. Review whether a future schema migration should normalize or quarantine legacy/corrupt rows on read without silently discarding user data.

### Local-day semantics

Connected-health daily summaries and trends use the runtime local timezone. This is internally consistent for the current device but does not yet use each observation's optional `timezoneOffsetMinutes` to define travel-day semantics. This needs an explicit product rule rather than an implicit refactor.

### Component size

`app/human-health-app.tsx`, `app/connected-health-panel.tsx`, and `app/platform-panel.tsx` remain large. Do not perform cosmetic decomposition during final hardening without executable tests. Extract logic only when it creates a testable safety/data-integrity boundary.

### npm reproducibility

A trustworthy `package-lock.json` still requires a dependency-capable Node 22/npm environment. Do not hand-author or infer transitive dependency metadata. Once generated and reviewed, switch CI from `npm install` to `npm ci`.

## Verification boundary

None of the above source review is evidence that TypeScript, unit tests, production build, PWA checks, browser accessibility, native-host behavior, or device behavior passed. Those remain separate release gates in #82.
