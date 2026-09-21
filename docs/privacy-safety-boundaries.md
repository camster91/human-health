# Privacy and safety boundaries

Human Health is a fitness/health-support product, not a medical authority.

## The product may

- track user-entered and connected health/fitness observations;
- provide general wellness and training recommendations;
- surface trends;
- adapt exercise based on fitness/recovery context;
- retrieve current trusted information/media through controlled tools;
- encourage qualified professional follow-up when appropriate;
- generate user-controlled summaries/exports.

## The product must not autonomously

- diagnose disease;
- prescribe medication or insulin;
- calculate treatment doses;
- provide emergency monitoring;
- clear injuries for return to sport;
- present arbitrary scores as medical truth;
- let an LLM override deterministic safety constraints;
- hide the material data/reason behind consequential recommendations.

## AI privacy

When remote models are used:

- send only context required for the task;
- minimize identifiers;
- honour user consent/settings;
- do not upload raw health exports when a smaller summary is enough;
- record the context class/provider used where practical;
- treat model inferences as editable inferences, not facts;
- provide no-model fallback for core training.

## Web/media tools

External web/media content should have provenance.

Safety-sensitive exercise demonstrations should prefer curated/approved sources over arbitrary web results.

## Sensitive data

Sensitive data should be minimized, encrypted where appropriate, exportable and deletable by the user, and excluded from analytics/logs unless strictly necessary.

## Professional escalation

The application should fail safely when a request crosses its fitness/wellness boundary and can help the user organize relevant history for a qualified professional.
