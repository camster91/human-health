# Phase 3 completion checklist

## Product scope
- [x] Canonical connected-health observation/provenance model
- [x] Health Connect native bridge contract with browser-unavailable state
- [x] Apple Health/HealthKit bridge contract and local XML import
- [x] Sleep, movement, heart-rate, cardio-fitness, distance, energy and workout summaries
- [x] Optional hydration/nutrition habits
- [x] Source freshness/current/partial/stale/failed states
- [x] IndexedDB connected-health repository
- [x] Local JSON/archive import/export and source-scoped deletion
- [x] Consent-first Health dashboard with provenance details
- [x] Connected sleep can contribute to readiness only when fresh and clearly sourced

## Integration gate
- [ ] Reconcile with latest Phase 2 hardening tree
- [ ] TypeScript check
- [ ] Unit tests
- [ ] Production static build
- [ ] PWA static checks including `/health/`
- [ ] Browser QA: import, IndexedDB persistence, source deletion, archive restore, offline Health route, responsive/accessibility states

## Native validation gate
- [ ] Health Connect bridge tested in a compatible Android host
- [ ] HealthKit bridge tested in a compatible Apple host
- [ ] Large real Apple Health export validated locally without server upload

Native validation is a platform release dependency; its absence must not be misrepresented as verified device integration.