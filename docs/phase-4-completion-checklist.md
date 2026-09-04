# Phase 4 completion checklist

## Product/source scope
- [x] Explainable trend detection
- [x] Plateau/regression detection
- [x] Conservative deload recommendation logic
- [x] Multi-goal balancing
- [x] Readiness/recent-load/life-mode context
- [x] Connected-health freshness boundary
- [x] Deterministic-first explanation model
- [x] Optional AI narrative provider contract
- [x] Conversational adaptation input
- [x] Symptom/dosing safety routing
- [x] Movement/video reliability gate
- [x] Dedicated Coach route
- [x] PWA/offline route coverage in source
- [x] Source tests
- [x] Source review and documentation

## Executable verification
- [ ] TypeScript check
- [ ] Unit-test suite
- [ ] Production static export
- [ ] PWA static checks including `coach/index.html`
- [ ] Verify workflow assigned to an eligible runner

## Browser QA
- [ ] Coach route at representative mobile, tablet and desktop widths
- [ ] keyboard navigation and visible focus
- [ ] form labels and screen-reader names
- [ ] no horizontal overflow
- [ ] connected-health loading/error/stale states
- [ ] conversational parser with ambiguous and safety-sensitive wording
- [ ] offline reload of `/coach/` after initial cache

## Integration gates
- [ ] Optional AI narrative provider tested if connected; deterministic action must remain unchanged
- [ ] Movement/video runtime remains disabled unless a separate reliability/privacy review explicitly authorizes implementation

Phase 4 must not be called release-verified while any applicable executable/browser gate is missing.
