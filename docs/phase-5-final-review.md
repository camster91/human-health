# Phase 5 final source review — Long-horizon health platform

PR: #83
Base: `main`
Branch: `phase-5-health-platform`
Tracking: #81; verification #82; runner #51

## Review conclusion

Phase 5 is **feature-scope complete and final-source-hardened** for the final planned Human Health platform layer. It is not release-verified because the final TypeScript/test/build/PWA/browser gates have not executed on an eligible runner/environment.

A second review pass after the initial feature-complete implementation found material portability, provenance, validation, sharing and storage-failure gaps. Those source issues were corrected before this final review. See `docs/phase-5-final-hardening-findings.md`.

## Preventive records/reminders

The product does not ship a hidden table of screening, vaccination, laboratory or follow-up schedules. A reminder exists only because the user entered it or recorded guidance received from a clinician/public-health source. Repeat intervals are explicit user data.

Records/reminders preserve manual versus clinician-provided provenance and optional provider/source names. Reminder completion is one local write that creates the completed record and, only when an explicit repeat interval exists, the next reminder. Month-end recurrence is clamped rather than rolling unexpectedly into the following month. Reminder enable/disable is explicit and reversible.

## Complete data portability

The previous full archive format predated Phase 5. The full archive is now schema v2 and contains training, connected-health and preventive/platform data. Legacy v1 archives remain importable with an empty Phase 5 section.

Full import validates all sections before mutation, and rollback covers all three local stores. Delete-all also includes Phase 5 data. If Phase 5 storage is unavailable or partially unreadable, a normal “complete archive” is refused rather than silently omitting data. Normal platform mutations are blocked over partially corrupt storage so malformed records are not silently destroyed by the next save.

## Clinician-friendly export

The clinician discussion summary is generated locally. It separates training history, connected-health observations and user-entered preventive context. Connected metric summaries remain separated by `sourceId`, with source names, units, sample counts and date windows visible rather than combining overlapping providers into one value.

It carries explicit language that Human Health is not a diagnosis, medication/insulin recommendation, emergency monitor, injury clearance or replacement for source clinical records. The export is for discussion, not a medical chart or claim of clinical completeness.

## Capability-model validation

Phase 5 implements a validation registry rather than declaring algorithms validated by fiat. Each model has an intended use, inputs, output, limitations, validation status and evidence list.

The `validated-for-intended-use` software claim gate now fails closed unless it has complete external-study evidence and a distinct explicitly independent replication record with populated population/protocol/outcome fields, unique evidence identifiers, valid review timestamps and different references. Even when the software gate can be satisfied, actual evidence quality/applicability still requires external scientific and specialist review.

All current built-in models remain `experimental`. Actual external validation cannot be completed by source code alone.

## Privacy-preserving personal models

The personal-model layer is an on-device deterministic baseline derived from the user's own training/readiness/activity history. It performs no cross-user learning, background network training or automatic sharing. Missing data is not guessed. The snapshot is exportable and descriptive, and its limitations explicitly prohibit diagnosis, dosing, emergency monitoring and injury clearance.

## API/integration platform

Phase 5 defines versioned read scopes (`training:read`, `connected-health:read`, `preventive:read`, `coaching:read`). Bundles contain only selected scopes.

A future `window.HumanHealthIntegrationHost` may be supplied by a separately reviewed host. The sharing boundary now requires a positive confirmation argument from the immediate user action and reconstructs a new payload containing only declared scopes before giving it to the host. The UI additionally names the destination and selected scopes in the confirmation prompt. No third-party provider, credential or background sync target is bundled.

## Regulatory checkpoints

The internal regulatory gate is deliberately conservative:
- medication/insulin dosing and emergency-monitoring profiles are blocked in the current product
- diagnostic claims, patient-specific treatment, clinician decision support, patient-specific risk scores and camera-based clinical assessment require specialist review before implementation/release
- an otherwise uncharacterized feature no longer defaults to wellness scope; wellness intended use must be explicitly declared
- explicitly declared wellness education remains in normal product/privacy/security/accessibility/evidence review

This gate is an internal escalation mechanism. It does not provide legal advice, regulatory clearance or a medical-device determination.

## Product integrity

Phase 5 does not introduce a universal health score. It preserves separation between fitness capabilities, connected observations, user-entered records, deterministic coaching and future evidence claims.

## UX/PWA review

A dedicated `/platform/` route exposes preventive records/reminders, clinician export, validation status, local personal baseline, scoped integration export/share and regulatory review controls. The route is included in the service-worker precache and PWA static-check expectations. The complete archive UI now describes Phase 5 data explicitly.

## Source-review risks / remaining evidence

1. Final TypeScript/test/build evidence has not run on an eligible runner.
2. Browser persistence/deletion/recurrence, complete archive migration/round-trip and offline QA remain required.
3. Clinician export should be reviewed with synthetic representative data before release.
4. No current capability model has real external validation evidence recorded; this is intentionally visible.
5. No live third-party integration host is bundled or validated.
6. The regulatory gate is not a substitute for specialist legal/regulatory/clinical review.
7. Production deployment remains a separate approval.
8. An independent repository-wide line-by-line review should still be performed before treating the full multi-phase codebase as release-ready; the exact agent prompt is saved in `docs/end-to-end-code-review-agent-prompt.md`.

## Merge/deploy gate

Keep PR #83 draft and unmerged until Cameron explicitly approves merge. Production deployment remains a separate decision. Source completion, executable verification, release readiness and deployment are distinct states.