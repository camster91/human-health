# Guide-First Execution Readiness Plan

Status: canonical execution-hardening companion to epic #146.

Purpose: convert the approved Guide-first product direction into a dependency-safe implementation plan that agents can execute without inventing product, safety, data, or release decisions mid-build.

## 1. Execution rule

Do not start a downstream slice until its prerequisites have:
- implementation evidence;
- green reproducible verification in the canonical CI environment;
- migration/rollback notes where persistent data is touched;
- unresolved safety/integrity blockers explicitly linked rather than hidden by the refactor.

No merge or production deployment is authorized by this document.

## 2. Canonical dependency graph

### Foundation
- R0 — execution readiness / CI / issue reconciliation / design and contract gates.
- #147 — architecture inventory + Preserve / Adapt / Replace / Quarantine / Retire matrix.
- #148 — Guide-first shell + one-screen Today.
- #149 — Context Engine foundation.

### Intelligence and safety spine
- #150 depends on #149.
- #151 depends on #149 + #150.

### Product surfaces
- #152 depends on #149 + #151.
- #153 depends on #148 + #150 + safety/tool policy contracts from #151.
- #154 depends on #149 + #151.
- #155 depends on #149 + #151.

### Later capabilities
- #156 depends on stable outputs from #152 + #153 + #154 + #155 and does not block the core refactor.

### Final gate
- #157 depends on #148–#155 complete, all surviving P0/P1 integrity blockers resolved or explicitly accepted, and representative platform QA recorded.
- #156 is required for #157 only for capabilities actually selected for the release.

## 3. R0 — execution readiness gate

Before broad implementation:

### CI and reproducibility
- Resolve PR #161 or replace it with a verified equivalent.
- Establish one supported Node/npm toolchain.
- Prefer a committed lockfile + `npm ci`.
- Verify `npm run verify` in CI.
- Preserve read-only CI permissions and checkout credential hardening.
- Record the canonical runner strategy.
- Do not treat local-only evidence as equivalent to CI.

### Open-issue reconciliation
Every open pre-#146 issue must receive exactly one disposition:
- prerequisite/blocker;
- absorbed by a Guide-first issue;
- independent release gate;
- superseded;
- completed after verification.

P0/P1 integrity issues must not disappear because the UI is changing.

Priority reconciliation set:
#9, #21, #30, #42, #43, #47, #51, #61, #82, #85–#87, #90–#95, #98–#112.

### Repository truth cleanup
- Update stale status/handoff docs.
- Move historical phase/implementation summaries under an archive namespace.
- Keep history; remove ambiguity about product authority.
- Reconcile PR #97 and any unmerged hardening branches for unique safety fixes.
- Normalize #159/#160 so #148 builds on one verified #147 baseline rather than carrying duplicate history.

### Design gate
Before a major user-facing slice is considered implementation-ready, its Figma/source-of-truth design must define:
- phone;
- tablet;
- desktop;
- loading;
- empty;
- offline;
- error;
- reduced-motion;
- large-text;
- keyboard/screen-reader interaction where applicable.

Minimum canonical designs:
Today, Body, Progress, Guide, You, active session, trust/memory controls, escalation/safety states.

## 4. #149 Context Engine decomposition

Implement as reviewable sub-slices rather than one large PR:

1. **Contracts**
   - BodyProfile
   - DailyState
   - memory record types
   - life context
   - personal rules
   - provenance/freshness/confidence

2. **Persistence + migration**
   - additive namespaced storage
   - migration marker
   - old-state preservation
   - export/import compatibility
   - rollback test

3. **Context composer**
   - deterministic DailyState composition
   - task-specific context selector
   - stale/unknown handling
   - no-model path

4. **Memory lifecycle**
   - observed vs user-reported vs preference vs rule vs inference vs external evidence
   - expiry
   - contradiction/supersession
   - inference never silently becomes fact

5. **Trust controls**
   - inspect
   - correct
   - disable
   - export
   - delete

6. **Verification**
   - migration
   - corruption/fail-closed
   - privacy minimization
   - representative UX/accessibility

## 5. #150 Model gateway contract

Define before provider implementation:

- provider-neutral TypeScript interface;
- versioned structured-output schemas;
- prompt/system-policy versioning;
- provider/model configuration;
- secret handling;
- context budget;
- token/output ceiling;
- timeout;
- retry;
- cancellation;
- rate limiting;
- maximum tool loop depth;
- malformed-output handling;
- model/provider fallback;
- no-model fallback;
- redaction/minimization;
- audit events that exclude sensitive raw payloads by default;
- prompt/tool injection handling;
- deterministic evaluation fixtures;
- latency and cost telemetry;
- explicit mutation command validation.

The model never writes authoritative training/health state directly.

## 6. #151 deterministic safety policy contract

Create a versioned policy result model with at least:

- allow;
- modify;
- hold;
- professional assessment;
- urgent/emergency escalation.

Each result must include:
- triggering inputs;
- deterministic reason code;
- allowed/prohibited actions;
- whether progression is paused;
- user-facing explanation key;
- provenance;
- review/version metadata.

Explicitly test:
- pain;
- injury flags;
- illness;
- corrupt/stale health context;
- unsupported model claims;
- medication/insulin/dosing requests;
- treatment-carbohydrate requests;
- emergency-risk language;
- personal-rule conflict;
- conflicting specialist recommendations.

Model output cannot downgrade a stricter deterministic result.

## 7. #152 Body contract

Define before implementation:
- canonical body regions;
- front/back mapping;
- bilateral state handling;
- ready / trained / recovering / tight / sore / pain states;
- optional intensity/severity semantics;
- simultaneous states;
- expiry/freshness;
- edit/delete;
- history;
- mapping to programme restrictions;
- conflict resolution with DailyState;
- keyboard alternative;
- screen-reader alternative;
- no diagnostic/anatomical certainty from a tap.

## 8. #153 tool/media security contract

For every external tool/provider:
- allowlisted capability;
- minimum query context;
- permission/consent requirement;
- request validation;
- URL/domain sanitization;
- provenance;
- freshness;
- licence/usage metadata where stored;
- untrusted-content treatment;
- prompt/tool-injection containment;
- timeout/retry/rate limit;
- caching/expiry;
- privacy leakage review;
- failure fallback;
- unsafe/inappropriate-media handling.

External media never silently becomes canonical exercise instruction.

## 9. #154 Progress and long-horizon contract

Progress must define concrete user-visible trajectories before implementation:
- strength;
- cardio/aerobic coverage/capacity where valid;
- mobility;
- balance/coordination;
- capability assessments;
- recovery pattern;
- training consistency/adherence;
- quality-of-life checkpoints;
- maintenance state;
- goal progress;
- sparse-data/low-confidence states.

No single opaque health score.

Every trend should define:
- data source;
- minimum evidence;
- comparison window;
- excluded samples;
- confidence/unknown handling;
- reason for change where explainable.

## 10. #155 optional module contract

Each optional health/lifestyle module requires:
- separate opt-in;
- data inventory;
- authoritative vs contextual fields;
- provenance/freshness;
- safety hooks;
- remote-model-sharing policy;
- disable/export/delete behaviour;
- no-diagnosis/no-dosing boundary;
- deterministic fallback.

Meal-photo guidance must remain qualitative and conservative.

## 11. Observability

Add a dedicated implementation slice before release for privacy-safe telemetry:

Track:
- structured-output failures;
- model fallback;
- tool failure/latency;
- safety blocks;
- user overrides;
- stale context;
- inference correction;
- migration failure;
- sync failure;
- session/finalization failure;
- PWA/offline failure;
- crash/error rate.

Do not log raw health conversations, secrets, exports, or sensitive payloads by default.

## 12. Release/distribution contract

Before #157 can close, define and verify:
- preview environment;
- production environment;
- configuration/secrets;
- PWA deployment;
- Android build/signing/update path if included;
- iOS build/signing/update path if included;
- versioning;
- migration backup/export;
- staged rollout where applicable;
- rollback;
- post-release smoke checks;
- error/crash monitoring;
- recovery from a bad service worker or data migration.

## 13. QA rule for every vertical slice

Do not defer all QA to #157.

Every user-facing slice records:
- phone QA;
- tablet QA;
- desktop QA;
- keyboard;
- screen reader basics;
- text scaling;
- reduced motion;
- offline/failure behaviour when applicable;
- forms/controls/links/navigation;
- persistence/migration;
- security/privacy impact;
- performance;
- tests;
- rollback.

#157 aggregates evidence and performs cross-product release verification.

## 14. Ready-to-build definition

A Guide-first issue is ready for autonomous implementation only when:
- dependencies are complete;
- required design states exist;
- data contracts are explicit;
- safety/privacy boundaries are explicit;
- acceptance criteria are testable;
- migration/rollback is defined;
- unresolved P0/P1 blockers are linked;
- verification commands and manual QA matrix are defined.

## 15. Current recommended execution order

1. Stabilize CI/reproducibility (#161/#94/#51 reconciliation).
2. Reconcile old P0/P1 issues.
3. Normalize and verify #147 / PR #159.
4. Rebase/verify #148 / PR #160 on the accepted #147 baseline.
5. Complete #149 in the sub-slices above.
6. Complete #150.
7. Complete #151.
8. Implement #152/#153/#154/#155 in dependency-ready order.
9. Implement only approved #156 capabilities.
10. Run #157 as an evidence aggregation + release gate.

This document hardens execution; it does not change the approved product direction.
