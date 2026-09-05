# Final review static-audit notes

Current follow-up review branch: `training-storage-integrity` / PR #102  
First independent hardening branch: `final-independent-review` / merged PR #84

This file records source-review boundaries. It is not executable verification evidence. Current release truth is issue #82.

## Completed source-hardening themes

Merged through PR #84:
- workout finalization is journaled/idempotent across history/activity persistence
- training archive input is deeply validated and import rollback is recoverable
- complete local export/delete spans training, connected health, connected sleep context and Phase 5 platform data
- pain/illness is a zero-prescription safety hold rather than implicit clearance for lighter exercise
- current/recent planning evidence rejects invalid/materially future timestamps
- comparable strength evidence excludes warm-up, pain, poor-form and invalid evidence
- stale bodyweight progression state fails closed
- streamed Apple Health XML import is recoverable at the touched-source boundary
- service-worker v9 installation fails closed and activation removes only stale Human Health caches
- third-party GitHub Actions are pinned to reviewed immutable SHAs
- critical health-product/sharing invariants have static regression coverage
- native/provider disconnect failure cannot block explicit local connected-health deletion (#98)
- corrupt connected observation rows fail closed instead of becoming health context (#99)
- current-device local-day semantics are explicitly documented for travel/timezone behaviour (#100)

Source-complete on draft PR #102, verification pending:
- persisted training runtime reads use canonical validation and complete export refuses corrupt/unreadable state (#101)
- a read-only root preflight detects all authoritative training-key corruption before runtime cleanup/migration can mutate state
- exact raw training, connected-health and Phase 5 recovery snapshots support cross-domain replace rollback
- validated replace can recover corrupt connected-health IndexedDB without first pretending it is a trusted export (#103)
- connected source/preference state and archive timestamps are strictly validated (#104)
- full-archive rollback restores only domains whose import was actually attempted (#105)
- connected observation scalar/provenance/tag fields are now a strict canonical boundary and undeclared imported properties are not propagated (#106)
- corruption recovery defaults to validated Replace and rechecks the training gate after successful recovery/delete
- Node/npm review tooling is pinned to Node 22.16.0 + npm 10.9.2; workflow Action SHAs remain immutable

## Deliberately deferred source refactoring

### Large components

`app/human-health-app.tsx`, `app/connected-health-panel.tsx`, and `app/platform-panel.tsx` remain large. Cosmetic decomposition is intentionally deferred while executable verification is unavailable. Extract logic only when it creates a specific testable safety/data-integrity boundary.

### npm reproducibility

A trustworthy `package-lock.json` still requires a dependency-capable Node 22.16.0/npm 10.9.2 environment with npm-registry access. Do not hand-author or infer transitive dependency metadata. Once generated/reviewed, switch Verify from `npm install` to `npm ci`. Issue #94 is canonical.

## Remaining source-review work

- continue the tracked-file/dead-code/documentation/accessibility pass for any material release-impacting finding
- reconcile each new material finding into an issue before claiming source review complete
- keep PR #102 draft/unmerged unless Cameron explicitly approves merge

## Verification boundary

None of the source work above proves that TypeScript, the full unit suite, the production build, PWA checks, browser accessibility, IndexedDB/localStorage recovery, native-host behaviour, Wake Lock/timer behaviour, offline updates, or staging rollback passed. Those remain explicit release gates under #82 and require actual executable/browser/device evidence.
