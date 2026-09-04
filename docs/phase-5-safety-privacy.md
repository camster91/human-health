# Phase 5 safety and privacy boundary

Phase 5 extends Human Health's user-owned data and integration surface. It does not authorize medical diagnosis or treatment.

## Preventive reminders
- reminders are entered by the user or reflect guidance they were given
- the app does not generate age/sex/disease-specific screening or vaccination schedules by itself
- an overdue reminder means only that its entered date has passed

## Clinician export
- generated locally from data already held by the app
- intended for discussion, not as a complete medical chart
- source/provenance and data-quality limitations remain visible
- export occurs only from an explicit user action

## Personal baselines
- generated on device
- no cross-user training
- no automatic remote upload
- descriptive, deterministic and explainable
- no diagnosis, risk prediction, treatment, dosing, emergency monitoring or injury clearance

## Integrations
- scopes are explicit and versioned
- only selected scopes enter an export bundle
- no integration provider or credential is bundled
- a future host must be explicitly connected and sharing must still be user initiated
- receiving systems must preserve provenance and safety context

## Regulatory escalation
The regulatory gate is a release-process checkpoint, not legal advice. Diagnostic, treatment, clinical-decision-support, patient-specific risk and clinical camera use require specialist review. Medication/insulin dosing and emergency monitoring remain blocked in the current product scope.

## Data ownership
Phase 5 preventive records are stored locally in the current architecture and can be individually deleted. Personal-model snapshots are generated on demand rather than silently persisted. Integration and clinician exports are user-triggered files unless a future explicitly reviewed host is connected.