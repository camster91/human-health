# Phase 5 completion checklist

## Source scope
- [x] preventive records/reminders with manual/clinician-provided provenance
- [x] reminder enable/disable, completion and explicit recurrence handling
- [x] clinician-friendly local export with source-id separation
- [x] capability-model validation registry and evidence claim gate
- [x] privacy-preserving on-device personal baseline
- [x] scoped versioned integration bundle and host contract
- [x] regulatory escalation checkpoints
- [x] dedicated Platform UI
- [x] PWA/offline route integration
- [x] source tests and final source review
- [x] end-to-end code-review agent prompt

## Data-integrity hardening
- [x] complete archive v2 includes Phase 5 platform/preventive data
- [x] legacy full archive v1 remains importable
- [x] import rollback includes training, connected-health and platform stores
- [x] delete-all includes platform data and rollback path
- [x] incomplete/corrupt platform reads cannot silently produce a “complete” archive
- [x] normal mutations are blocked when existing platform storage contains unreadable records
- [x] destructive UI operations report failures rather than throwing out of the event handler
- [x] preventive provider/source provenance survives reminder completion
- [x] month-end recurrence is clamped predictably and calendar dates are validated

## Truthfulness / privacy gates
- [x] no automatic clinical preventive schedule is invented
- [x] no built-in capability model is falsely marked validated
- [x] validated status requires complete external-study evidence plus distinct explicitly independent replication evidence
- [x] no universal health score
- [x] no medication/insulin dosing
- [x] no emergency-monitoring claim
- [x] integration payload contains only selected scopes
- [x] external integration host share requires explicit positive confirmation
- [x] ambiguous regulatory intended use escalates rather than defaulting to wellness scope
- [x] regulatory gate is not labelled legal clearance

## Executable/runtime gates
- [ ] TypeScript check
- [ ] complete unit-test suite
- [ ] production build
- [ ] PWA static checks including `/platform/`
- [ ] responsive/accessibility browser QA
- [ ] preventive persistence/complete/disable/delete QA
- [ ] full archive v1 migration and v2 round-trip/delete browser QA
- [ ] clinician export review with synthetic representative data
- [ ] personal baseline export/local-only QA
- [ ] integration scope and explicit-share QA
- [ ] regulatory scenario QA
- [ ] offline `/platform/` reload

## External evidence programmes
- [ ] appropriate external validation study before any capability model claims `validated-for-intended-use`
- [ ] distinct independent replication evidence before validated claim gate passes
- [ ] specialist regulatory/legal/clinical review whenever the feature-risk gate escalates scope

Phase 5 source completion and final hardening do not satisfy executable, external-evidence, deployment, or regulatory-review gates by themselves.