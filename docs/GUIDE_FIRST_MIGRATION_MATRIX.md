# Guide-First Migration Matrix (#147)

Status: **canonical refactor inventory**. Produced for epic #146, issue #147 (Phase 1 architecture/migration inventory from `docs/REFACTOR_PLAN.md`).

Scope: classify every major current subsystem as **Preserve / Adapt / Replace / Quarantine / Retire** before broad UI replacement. No code is deleted by this document.

Companion artifacts:

- Classification rules: `docs/REFACTOR_PLAN.md` §Inventory rule.
- Target layers: `docs/GUIDE_ARCHITECTURE.md`.
- Acceptance evidence: `docs/refactor/147-verification.md`.

---

## 1. How to read this matrix

Each subsystem entry records:

| Field | Meaning |
|---|---|
| Path | Files that make up the subsystem. |
| Current purpose | What it does today. |
| Tests/evidence | Existing tests and how the subsystem is proven. |
| Data owned | Local persistent state the subsystem is authoritative for. |
| Dependencies | What it reads/writes that other subsystems own. |
| Classification | Preserve / Adapt / Replace / Quarantine / Retire. |
| Target module | Guide-first module it maps to (names from `GUIDE_ARCHITECTURE.md`). |
| Migration risk | What can break data, safety, or trust during migration. |
| Rollback requirement | What must remain true to be able to revert safely. |

Classification legend:

- **Preserve** — aligned with the Guide-first direction and dependable; reuse as-is behind the new shell.
- **Adapt** — engine/data is sound but needs a new interface, contract, or provenance model.
- **Replace** — current implementation actively blocks the canonical product.
- **Quarantine** — potentially useful but unsafe, unclear, or unverified; isolate until reviewed.
- **Retire** — duplicated, stale, or product-conflicting; keep history, stop shipping it as product.

---

## 2. Current user-facing IA (must be separated from reusable engines)

The legacy shell and reusable engines live in the **same component**. This is the single most important migration boundary: the engines in `lib/` are reusable; the shell in `app/human-health-app.tsx` is not.

| Path | Current purpose | Classification | Target module | Notes |
|---|---|---|---|---|
| `app/human-health-app.tsx` (710 lines) | Owns legacy IA (`useState<'today'\|'log'\|'progress'\|'settings'>`), 4-tab bottom nav (Today / Lift / Log / You), the immersive session view, readiness chips, "Adjust plan" quick actions, and all data wiring (`store.load*`, `startWorkout`, `logSet`, `finishWorkout`). | **Replace** (shell) / **Adapt** (logic inside) | `Today`, `Body`, `Progress`, `Guide`, `You` + session mode | The IA and tab model are Retire. The orchestration logic it contains (workout start/adapt/finalize, readiness handling, rest-timer, wake-lock) is real product logic that must be **extracted into modules** before the file is replaced, not rewritten from scratch. |
| `app/page.tsx` | Renders `HumanHealthApp`. | Adapt | Today entry | Becomes the Guide-first Today route. |
| `app/coach/page.tsx` + `app/coaching-panel.tsx` | Separate "Coach" route exposing chat-like interpretation, snapshot, AI explanation button. | **Replace** (UI) / **Adapt** (snapshot logic) | `Guide` | "Coach" is not a canonical surface name. The deterministic `CoachingSnapshot` engine behind it is valuable; the text-terminal panel is Retire. |
| `app/health/page.tsx` + `connected-*.tsx`, `full-archive-controls.tsx` | Connected-health dashboards, habit coverage, archive controls. | **Replace** (dashboard IA) / **Adapt** (panels' data access) | `You` (integrations, data) + `Body`/`Progress` summaries | Dashboard-first surfaces conflict with the canonical direction. Underlying adapters are Preserve. |
| `app/platform/page.tsx` + `app/platform-panel.tsx` | Exposes platform/regulatory preventive-care surfaces to the user. | **Replace** (user-facing IA) | `You` (preventive records where still useful) | Exposing platform architecture to the user is explicitly Retire. |
| `app/privacy/page.tsx` | Static privacy/data-practices page. | **Preserve** | `You` privacy | Accurate, non-diagnostic, consent-oriented. Re-point from new shell; keep content. |
| `app/settings-panel.tsx`, `settings` tab | Preferences, units, gym profiles, data controls. | **Adapt** | `You` | Preference model is sound; the tab and density are Retire. |
| `app/icon-component.tsx` + `public/icons/*` (`today-*`, `lift-*`, `log-*`, `you-*`) | Legacy tab + check-in iconography. | **Adapt** | Design system | `ready/flat/sore/peak` check-in icons remain useful for Body/Today. `today/lift/log/you` tab icons are Retire with the old IA. |
| `app/globals.css`, `app/connected-health.css` | Current visual identity (accent `#c84712`, card system, bottom-nav, session styles). | **Adapt** | Design system | Valuable primitives (session view, rest dock, log inputs, focus states, reduced-motion rule). Bottom-nav grid (`repeat(4,1fr)`) must adapt to 5-tab Guide IA. |
| `app/service-worker-registration.tsx`, `app/offline-indicator.tsx`, `app/ErrorReporting.tsx` | Offline/PWA/native foundation. | **Preserve** | shell | Proven, defensive, aligned with graceful degradation. |
| `app/lift-progress-panel.tsx`, `capability-*-panel.tsx`, `skill-progress-panel.tsx`, `whole-person-dashboard.tsx`, `mind-reflection-panel.tsx`, `fuel-habits-panel.tsx` | Legacy presentation surfaces. | **Adapt** (data/logic) / **Replace** (presentation) | `Progress`, `Body`, optional modules | The trend/assessment computations behind them are reusable; the panel composition is dashboard-shaped. |

**Acceptance check — old IA separated from engines:** the shell owns navigation and layout; the engines (`lib/engine.ts`, `lib/schedule.ts`, `lib/whole-person*.ts`, etc.) own no navigation and take plain data in/out. This boundary holds today: every `lib/` engine is importable without React. **Met.**

---

## 3. Training engine and domain core

| Path | Current purpose | Tests/evidence | Data owned | Dependencies | Classification | Target module | Migration risk | Rollback requirement |
|---|---|---|---|---|---|---|---|---|
| `lib/domain.ts` | Canonical types: `Exercise`, `SetLog` (kg-canonical load), `WorkoutExercise`, `Workout`, `HistoryEntry`, `GymProfile`, `SessionId`, `TrainingMode`, `AdaptContext`. | Consumed by all engine tests | None (types only) | None | **Preserve** | programme/domain | Changing these types silently rewrites historical meaning. | Must not change kg-canonical `SetLog.weight` or `HistoryEntry.session` semantics. |
| `lib/engine.ts` | `adaptWorkout`, `nextLoadRecommendation`, `applyVolumeMultiplier`, `summarizeWorkout`, `platePlan`, `workingLogs`, `comparableStrengthLogs`. | `engine.test.ts`, `engine-volume.test.ts` | None (pure) | `program.ts` | **Preserve** → Adapt interface | deterministic programme engine | LLM must not bypass these; keep as authoritative validator. | Pure functions; safe to revert. |
| `lib/program.ts` | Exercise catalogue assembly, `starterProgramDefinition` (upper/lower v2), `gyms`, `buildSession`, `exerciseIsAvailable`, `rankedSubstitutions`. | `program.test.ts` | None (pure) | `exercises-*.ts` | **Preserve** | programme engine / exercise knowledge | Substitution scoring is load-history-preserving; do not merge unlike-equipment loads. | Keep stable exercise ids. |
| `lib/exercises-lower.ts`, `exercises-upper-pull.ts`, `exercises-upper-push.ts` | Exercise knowledge graph with `ExerciseMetadata` (muscles, stability, fatigue, skill, loadType). | Covered via programme tests | None | `domain.ts` | **Preserve** | exercise knowledge graph | Exercise ids are referenced by history, skill trees, swap prefs. Renaming breaks user history. | Never rename/remove ids; add only. |
| `lib/exercise-definition.ts` | Exercise definition helpers. | via programme | None | domain | **Preserve** | exercise knowledge | Low. | Revert-safe. |
| `lib/schedule.ts` | Rolling upper/lower sequence, `nextRollingSession`, `contextualRollingSession` (travel/return/maintenance), `createScheduleOverride`, `workoutCompletionRatio`. | `schedule.test.ts`, `schedule-overrides.test.ts` | Reads `HistoryEntry`; writes `ScheduleEvent` (via store) | `workout-accounting.ts` | **Adapt** | programme engine → long-horizon planner | Fixed 4-session rotation is narrower than canonical whole-person coverage; adapt to weekly coverage model without losing the rolling/reflow behaviour. | Keep `ScheduleEvent` log; rolling decisions are recomputable from history. |
| `lib/load-management.ts` | `recentTrainingLoad`, `coordinateCardio`, `powerAllowed`, `strengthLoadAdjustment`. | `load-management.test.ts` | None (pure) | `whole-person.ts` | **Preserve** | deterministic programme engine | Strong safety-relevant logic (lower-body/cardio stacking). | Pure; revert-safe. |
| `lib/rest-timer.ts` | Rest timer state machine + sanitizer. | `rest-timer.test.ts` | `human-health:rest-timer` | — | **Preserve** | session tooling | Persisted shape; must stay backward-compatible. | Keep sanitizer tolerant of older shapes. |
| `lib/workout-accounting.ts` | `plannedExercises`, `exerciseCountsTowardPlannedWork` — truthful partial-session accounting. | via schedule/storage tests | None | domain | **Preserve** | programme engine | Correctness-sensitive: defines "planned work". | Pure; revert-safe. |
| `lib/workout-finalization.ts` | `deduplicateHistory`, `deduplicateWorkoutActivity`, `activeWorkoutWasFinalized` — idempotent finalization. | `workout-finalization.test.ts`, `storage-finalization.test.ts` | None | domain, whole-person | **Preserve** | data integrity | Guards duplicate history on retry; central to not corrupting history. | Pure; revert-safe. |
| `lib/training-archive-validation.ts` | Validators for active/history/activity/readiness/assessments/preferences/etc. on import. | `storage-import.test.ts` | None | domain, preferences, whole-person, schedule | **Preserve** | import/export | Import gate; weakening it risks trusting corrupt archives. | Keep fail-closed semantics. |
| `lib/release-safety-invariants.test.ts`, `pain-illness-prescription-block.test.ts`, `phase2-completion.test.ts` | Safety invariant regression tests. | Self | — | — | **Preserve** | safety test suite | These encode fail-closed safety; must keep passing. | Must not be deleted or weakened. |

---

## 4. Whole-person / capability / readiness

| Path | Current purpose | Tests/evidence | Data owned | Classification | Target module | Migration risk | Rollback requirement |
|---|---|---|---|---|---|---|---|
| `lib/whole-person-types.ts` | `CapabilityDomain` union (10 domains). | via tests | types | **Preserve** | capability model | Domain union is referenced by preferences, trends, planner. | Add-only migration. |
| `lib/whole-person-foundation.ts` | `ActivityDose`, `weeklyTargets`, `capabilityMetrics`. | `whole-person.test.ts` | types + constants | **Preserve** | weekly coverage | Weekly targets are the seed of canonical whole-person coverage. | Keep `ActivityDose` shape (idempotency relies on `workoutId`). |
| `lib/whole-person-recovery.ts` | `readinessDecision`, `readinessDecisionFromRecords`, `readinessTrend`, cardio options/prescription. | `whole-person.test.ts`, `pain-illness-prescription-block.test.ts` | None (pure) | Reads `ReadinessRecord` | **Preserve** → Adapt | safety/policy + DailyState | **Safety-critical**: pain/illness → `recovery` level with 0 volume and paused progression. This is the deterministic safety spine the LLM must never outrank. | Pure; must not be weakened. |
| `lib/whole-person-movement.ts` | `coreSessions`/`corePrescription`, `mobilityPrescription`, `microSessions`, `progressionTracks`. | via tests | None | **Preserve** | programme engine / minimum useful day | `microSessions` already implements "minimum useful day" concepts. | Pure; revert-safe. |
| `lib/whole-person-bodyweight.ts` | `skillTrees`, `nextSkillStep`. | via performance tests | None | **Preserve** | exercise knowledge / capability | Skill step ids persisted in user state. | Keep ids stable. |
| `lib/whole-person-skills.ts` | Re-export barrel. | — | — | **Preserve** | — | Low. | Revert-safe. |
| `lib/whole-person-assessments.ts` | `Assessment`, `athleticPlan`, `weeklyMinutes`, `targetProgress`, `minimumEffectiveOptions`, `workoutActivityDoses`. | `whole-person.test.ts` | None | **Preserve** | progress + minimum useful day | `workoutActivityDoses` derives activity from history; keep idempotent. | Pure; revert-safe. |
| `lib/capability-trends.ts` | `strengthTrends`, `normalizedStrengthTrend`, `cardioCoverage`, `recoveryPattern`, `consistencyPattern`, `assessmentDue`. | `capability-trends.test.ts` | None | **Preserve** | progress | Excludes pain/poor-form/future/warm-up samples — trust-sensitive. | Pure; revert-safe. |
| `lib/performance.ts` | `SkillAssessment`, `recommendSkillProgression`, `domainDeficits`, `minimumEffectiveDay`, `LifeMode`. | `performance.test.ts` | None | **Preserve** → Adapt | programme engine / long-horizon planner | `minimumEffectiveDay` is the backbone of minimum useful day. | Pure; revert-safe. |
| `lib/athletic-progression.ts` | Athletic progression helpers. | `athletic-progression.test.ts` | None | **Preserve** | programme engine | Low. | Revert-safe. |
| `lib/preferences.ts` | `UserPreferences` (lifeMode, gym, units, domain priorities, swap prefs, plate config, module toggles), `normalizePreferences`. | `preferences.test.ts` | `human-health:preferences` | **Adapt** | You / Context Engine | Must grow to hold BodyProfile/DailyState-backed personal rules and module permissions while preserving normalization. | Keep normalization tolerant; keep existing key. |

---

## 5. Persistence and local data (highest migration risk)

| Path | Current purpose | Tests/evidence | Data owned | Classification | Target module | Migration risk | Rollback requirement |
|---|---|---|---|---|---|---|---|
| `lib/storage.ts` | Single localStorage façade + schema-v2 export/import with pre-import snapshot and rollback, finalization journal, dedupe. | `storage.test.ts`, `storage-import.test.ts`, `storage-finalization.test.ts` | `human-health:*` (active, history, activity, readiness, skills, assessments, progressions, skill-assessments, rest-timer, preferences, schedule-events, finalization-journal, fuel-checks, soft-habit-completions, mind-checks, weekly-reflections, connected-sleep-context) | **Preserve** (mechanism) → Adapt (context/memory keys) | persistence layer | **Any new Context Engine / memory store must use new namespaced keys and an additive migration.** Rewriting these keys loses user history. | Keep `schemaVersion: 2` import path working; keep `exportData()` capable of exporting old keys. |
| `lib/domain.ts` (persisted shapes) | Shapes stored verbatim in localStorage/IndexedDB. | via storage tests | — | **Preserve** | domain | Historical entries may omit `workoutId`, `status`, `programId`. | Never require new fields on read. |

**Data-migration rule (acceptance requirement):** before any schema replacement, each migration must (1) read the old key, (2) transform, (3) write the new key, (4) keep the old key until the new one is verified, and (5) record a migration marker. No destructive rename.

---

## 6. Coaching / current "AI" layer

| Path | Current purpose | Tests/evidence | Data owned | Classification | Target module | Migration risk | Rollback requirement |
|---|---|---|---|---|---|---|---|
| `lib/coaching/engine.ts` | `createCoachingSnapshot`: deterministic evidence, trends, plateaus, goal allocation, typed `CoachAction`s with `evidenceIds`, readiness level, safety boundary. | `engine.test.ts` | None (pure) | **Preserve** → Adapt | Context Engine + deterministic evidence for Guide | This is real deterministic assessment logic (plateau/trend/evidence), not "AI". It should feed the Guide coordinator as validated evidence. | Pure; revert-safe. |
| `lib/coaching/types.ts` | `CoachEvidence`, `CoachTrend`, `CoachAction`, `PlateauAssessment`, `CoachingSnapshot`, `ConversationInterpretation`. | via engine tests | types | **Preserve** | Guide contracts | `CoachAction.reversible: true` and `evidenceIds` are exactly the provenance model the Guide needs. | Add-only. |
| `lib/coaching/conversation.ts` | Regex intent interpretation: minutes, low energy, travel/return/maintenance, gym pick, unavailable equipment, goal hints, **safety flags** (pain/injury/insulin/medication/treatment-carbs). | `conversation.test.ts` | None | **Adapt** (safety flags: Preserve) / **Replace** (regex NLU: later) | Guide | The regex NLU is a stopgap for a model-backed Guide, but its **safety-flag regexes must be preserved as a deterministic pre-filter** that runs regardless of model availability. | Extract safety flags into a deterministic safety module; keep tests. |
| `lib/coaching/planner.ts` | `previewConversationPlan`: blocks plan preview on safety flags or recovery readiness. | `planner.test.ts` | None | **Preserve** | safety/policy | Fail-closed preview blocking is canonical behaviour. | Pure; revert-safe. |
| `lib/coaching/explanation.ts` | `CoachExplanationProvider` seam (optional window-injected AI), `buildCoachExplanationRequest` with hard rules, `requestAIExplanation` (truncates, rejects empty). | via tests | None | **Adapt** | model gateway | This is the only existing "AI" seam. It sends **deterministic actions + evidence summaries** and forbids the model from adding/removing actions — an excellent precedent for the provider-agnostic gateway. | Keep `window.HumanHealthCoachAI` optional provider working during migration. |
| `lib/coaching/movement-video.ts` | `movementVideoGate` — 6-evidence fail-closed gate for camera/video analysis. | via tests | None | **Preserve** | camera/movement (later) | Encodes conservative, review-gated camera policy. Reuse for #156. | Pure; revert-safe. |
| `lib/coaching/index.ts` | Barrel export. | — | — | Adapt | — | Low. | Revert-safe. |

---

## 7. Connected health (strong preserve candidate)

All under `lib/connected-health/` (≈45 files incl. tests). Provenance, fail-closed integrity, and source-state handling are exactly the canonical direction.

| Path | Current purpose | Tests/evidence | Data owned | Classification | Target module |
|---|---|---|---|---|---|
| `repository.ts` | IndexedDB `human-health-connected`: observations, sources, meta(preferences). | `connected-readiness.test.ts` + others | IndexedDB DB v1 | **Preserve** | integrations / connected-health |
| `sync.ts`, `adapters.ts`, `events.ts` | Adapter lifecycle, permission requests, sync batches, change events. | `sync.test.ts` | source state | **Preserve** | integrations |
| `types.ts` | `HealthObservation` with `HealthProvenance`, `HealthSourceState`, freshness/status unions. | via tests | types | **Preserve** | integrations contract |
| `freshness.ts`, `local-day.ts`, `metrics.ts`, `merge.ts` | Freshness classification, device-local-day policy, canonical unit conversion, FNV-1a stable hashing + `normalizeObservation`. | `freshness.test.ts`, `local-day.test.ts`, `metrics-merge.test.ts` | None | **Preserve** | integrations |
| `summary.ts`, `trends.ts` | `ConnectedHealthSummary` (per-metric status + source attribution), `MetricTrend` (additive vs averaged metrics). | `summary-trends.test.ts` | None | **Preserve** → Adapt | Context Engine / Progress |
| `connected-readiness.ts` | `connected-sleep-context` bridge into `ReadinessRecord` with 48h freshness. | `connected-readiness.test.ts` | `human-health:connected-sleep-context` | **Preserve** | DailyState |
| `portability.ts` | Full archive (training + connected + platform), import with rollback, **complete deletion contract** across all persistence domains. | `portability.test.ts`, `portability-deletion.test.ts`, `source-deletion.test.ts` | orchestrates all | **Preserve** | data controls (`You`) |
| `import/apple-health-xml.ts`, `import/recoverable-apple-import.ts` | Apple Health XML import with recovery. | `apple-health-xml.test.ts`, `recoverable-apple-import.test.ts`, `repository-import-validation.test.ts` | observations | **Preserve** | import |
| `import/canonical-json.ts`, `import/source-state.ts` | Canonical envelope + source-state import. | via import tests | — | **Preserve** | import |
| `repository-integrity.ts` (tested in `repository-integrity.test.ts`) | Integrity validation. | self | — | **Preserve** | data integrity |
| `native-mapping.ts`, `bridge.ts` | Health Connect / Apple Health native record mapping + `window.HumanHealthNative` bridge. | `native-mapping.test.ts` | None | **Preserve** | integrations |
| `habits.ts`, `fuel.ts`, `soft-habits.ts`, `mind.ts`, `weekly-reflection.ts` | Opt-in lifestyle modules: manual habit observations, fuel checks, soft habits, mind checks, weekly reflections. | `habits.test.ts`, `fuel.test.ts`, `soft-habits.test.ts`, `mind.test.ts`, `weekly-reflection.test.ts` | `human-health:fuel-checks`, `soft-habit-completions`, `mind-checks`, `weekly-reflections` | **Adapt** (→ optional modules #155, opt-in/permissioned) | optional modules |
| `test-helpers.ts` | Test utilities. | — | — | **Preserve** | test infra |

---

## 8. Platform / regulatory / clinician

| Path | Current purpose | Tests/evidence | Data owned | Classification | Target module | Migration risk |
|---|---|---|---|---|---|---|
| `lib/platform/personal-model.ts` | `createPersonalModelSnapshot`: device-only deterministic baseline, `personalModelPolicy` (no network training, no cross-user learning, `medicalPrediction: false`). | `personal-model.test.ts` | None | **Preserve** → Adapt | Context Engine / BodyProfile | Directly relevant to #149. Policy strings must survive as the privacy contract for the personal model. |
| `lib/platform/regulatory.ts` | `regulatoryGate` — blocks medication/insulin dosing + emergency monitoring; escalates diagnostic/treatment/clinician-support/risk-score/camera-clinical. `phase5RegulatoryCheckpoints`. | `regulatory.test.ts` | None | **Preserve** | safety/policy | This is the canonical safety hierarchy in code. Reuse for health-module policy hooks (#151) and #155. |
| `lib/platform/capability-models.ts` | Registry of capability models with `validationStatus`, evidence, `medicalUseAllowed: false`, limitations. | `capability-models.test.ts` | None | **Preserve** | evidence/trust | Encodes "no false authority" claims. |
| `lib/platform/preventive.ts`, `storage.ts` | Preventive records/reminders + `human-health:platform:v1` with fail-closed mutation blocking on invalid rows. | `preventive.test.ts`, `storage.test.ts` | `human-health:platform:v1` (localStorage) | **Adapt** (→ `You` where still useful) | optional modules / data controls | Preventives are "where still useful" per canonical; storage fail-closed behaviour must be preserved. |
| `lib/platform/clinician-export.ts` | `buildClinicianSummary` — per-source metric grouping (never merges providers into "one truth"), framing, data notes. | `clinician-export.test.ts` | None | **Preserve** | professional escalation | Directly supports "organize context for a professional". |
| `lib/platform/integrations.ts` | Scoped integration bundles with `integrationBundleContainsOnlyScopes` + sanitize-for-share. | `integrations.test.ts` | None | **Preserve** | integrations | Explicit-scope sharing is the canonical permission model. |
| `lib/platform/types.ts` | Platform contracts. | via tests | types | Adapt | — | Add-only. |

---

## 9. Assets, PWA, native packaging, CI

| Path | Current purpose | Tests/evidence | Classification | Target module | Migration risk |
|---|---|---|---|---|---|
| `public/sw.js` | Offline app-shell precache with fail-closed install, explicit activation, stale-cache pruning scoped to `human-health-`. | `scripts/check-pwa.mjs` | **Adapt** | offline runtime | `CORE` hardcodes `/health/`, `/coach/`, `/platform/` and `check-pwa.mjs` asserts the SW references `'/health/'`, `'/coach/'`, `'/platform/'`. **The new IA routes (e.g. `/guide/`, `/body/`) must be added to `CORE` and to the checker in the same change that adds the routes**, or the PWA check fails/regresses. |
| `public/manifest.webmanifest` | PWA manifest with legacy "Today"/"Log" shortcuts and training-only description. | `check-pwa.mjs` | **Adapt** | shell | Description and shortcuts still describe the training app; update with new IA. Keep `start_url`/`scope` root. |
| `public/offline.html` | Offline fallback page. | `check-pwa.mjs` | **Adapt** | offline runtime | Must remain non-empty and referenced. |
| `public/icons/*`, `public/illustrations/*`, `screenshots/` | Legacy visual identity. | visual | **Adapt**/Retire | design system | Keep check-in + inline icons; retire tab icons with old IA. |
| `android/`, `ios/`, `capacitor.config.ts` | Capacitor native packaging. | `android-apk.yml` | **Preserve** | native packaging | Node-version mismatch is a CI/toolchain issue, not a product issue. |
| `.github/workflows/verify.yml` | Verify gate on `[self-hosted,Linux,X64,ashbi-vps]`, Node 22, `npm install` (TODO → `npm ci`). | self | **Adapt** | CI | Trigger list includes stale branches (`post-phase2-hardening`, `phase-3-connected-health`). Self-hosted runner availability is a known external dependency (#51). |
| `.github/workflows/android-apk.yml` | Android debug APK, `ubuntu-latest`, **Node 20** (mismatch), floating `@v4` actions. | self | **Adapt** | CI | Must move to Node 22 and pin SHAs; see `docs/refactor/147-repository-cleanup.md`. |
| `scripts/check-pwa.mjs`, `scripts/generate-icons.mjs`, `scripts/serve-static.mjs` | PWA static gate, icon generation, static server for `output: export`. | self | **Preserve**/Adapt | tooling | `check-pwa.mjs` route assertions must track route changes. |

---

## 10. Documentation and roadmap

| Path group | Classification | Action |
|---|---|---|
| Canonical docs (`MASTER_PRODUCT_BLUEPRINT.md`, `CANONICAL_PRODUCT_DIRECTION.md`, `GUIDE_ARCHITECTURE.md`, `EXPERIENCE_SYSTEM.md`, `REFACTOR_PLAN.md`, `AUTONOMOUS_COMPLETION_MISSION.md`, `AGENT_MISSION_GUIDE_FIRST.md`, `AGENT_HANDOFF.md`) | **Preserve** | Stay at `docs/` root as source of truth. |
| Phase docs (`phase-1..5-*.md`, `phase-*-checklist.md`, `phase-*-status.md`, `phase-*-review.md`, `phase-definitions.md`) | **Retire** (to archive) | Move to `docs/archive/pre-guide/`. |
| Historical planning (`mvp-build-order.md`, `issue-map.md`, `next-20-issues.md`, `project-board-setup.md`, `implementation-roadmap.md`, `task-catalog.md`, `issue-seeding-plan.md`) | **Retire** (to archive) | Move to `docs/archive/pre-guide/`. |
| Repo-root summaries (`PHASE_A_SUMMARY.md`, `PHASE_B_IMPLEMENTATION.md`, `POLISH_PASS_SUMMARY.md`, `POLISH_SUMMARY.md`, `IMPLEMENTATION_SUMMARY.md`, `CONSUMER_DESIGN_PASS_SUMMARY.md`, `CSS_DIFF_HIGHLIGHTS.md`, `MOBILE_TRANSFORMATION.md`, `PRODUCTION_AUDIT_RESPONSE.md`, `QA_FIXES_SUMMARY.md`, `ASSETS_SUMMARY.md`, `TESTING_CHECKLIST.md`) | **Retire** (to archive) | Move to `docs/archive/pre-guide/root-summaries/`. |
| Operational docs (`deployment-and-rollback.md`, `branching-policy.md`, `dependency-update-policy.md`, `how-to-run.md`, `privacy-safety-boundaries.md`, `release-gates.md`, `qa-checklist.md`, `accessibility-static-review-checklist.md`, `mobile-setup.md`, `phone-install.md`, `connected-health-*.md`, `native-health-bridge-contract.md`, `data-model-notes.md`, `coaching-principles.md`, `design-direction.md`, `verification-blockers.md`, `status.md`, `acceptance-criteria.md`, `implementation-issue-template.md`, `end-to-end-*.md`, `final-review-static-audit-notes.md`, `10-year-lifecycle.md`, `END_TO_END_SHIP_PLAN.md`) | **Preserve**/Reconcile | Keep non-phase operational docs; reconcile `release-gates.md` so #82 is explicitly the legacy integrity gate, not the product gate. |

---

## 11. Independent blockers that must remain tracked

The redesign must **not** close these. They are migration prerequisites and independent safety/data-integrity work:

- **#9** privacy/security/consent/clinical-boundary umbrella.
- **#30** PWA/offline QA.
- **#42** accessibility QA.
- **#43** preview/rollback rehearsal.
- **#47** Screen Wake Lock.
- **#51** CI runner (self-hosted `ashbi-vps` availability).
- **#61** connected-health privacy/browser/native QA.
- **#82** legacy release gate — **re-scope**: legacy integrity/migration-input gate only; Guide-first product gate is **#157**.
- **#85–#112** P1/P2 integrity, storage, connected-health, CI reproducibility, PWA, archive import.
- **#63 + #64–#73** post-v1 lifestyle/metabolic epic — extract unique requirements into #146/#149/#155, mark superseded, do **not** close independent safety/data-integrity children.

---

## 12. Target module map (from `GUIDE_ARCHITECTURE.md`)

| Target module | Fed by (Preserve/Adapt) | New work |
|---|---|---|
| Context Engine | `preferences.ts`, `platform/personal-model.ts`, `connected-health/summary.ts`, `coaching/engine.ts` | BodyProfile, DailyState, memory record types (#149) |
| Memory | `storage.ts` (new keys), `coaching/types.ts` provenance shape | typed records: observed / user_reported / preference / rule / inference / external_evidence (#149) |
| Programme | `engine.ts`, `program.ts`, `schedule.ts` (adapt), `performance.ts`, `whole-person-movement.ts`, `workout-accounting.ts` | whole-person coverage + minimum useful day integration (#151) |
| Safety/policy | `whole-person-recovery.ts`, `coaching/planner.ts`, `coaching/conversation.ts` (safety flags), `platform/regulatory.ts` | pain/symptom holds, professional escalation, module policy hooks (#151) |
| Guide/orchestrator | `coaching/engine.ts`, `coaching/explanation.ts` seam | model gateway, coordinator, specialists (#150) |
| Tools | — | typed tool layer, permissions, trusted media registry (#153) |
| Media | `coaching/movement-video.ts` (gate precedent) | trusted media registry + adapters (#153) |
| UI composer | `globals.css` primitives, `icon-component.tsx` | typed UI blocks (#153) |
| Body state | `whole-person-recovery.ts` readiness inputs | interactive body map (#152) |
| Progress | `capability-trends.ts`, `coaching/engine.ts` trends | multi-trajectory progress (#154) |
| Integrations | entire `lib/connected-health/`, `platform/integrations.ts` | module permissions (#155) |

---

## 13. Acceptance criteria check (#147)

| Criterion | Status | Evidence |
|---|---|---|
| No major subsystem unclassified | **Met** | §2–§10 classify routes, shell, engines, persistence, coaching, connected-health, platform, assets/PWA/native/CI, docs. |
| Old user-facing IA clearly separated from reusable engines | **Met** | §2 boundary: shell owns IA; `lib/` engines are React-free and data-in/out. |
| Data migrations identified before any schema replacement | **Met** | §5 + §6 data-migration rule; §9 PWA `CORE`/checker coupling called out. |
| Independent blockers still tracked | **Met** | §11 lists #9, #30, #42, #43, #47, #51, #61, #82 (re-scoped), #85–#112, #63/#64–#73. |
| Next vertical slice obvious | **Met** | §14. |
| No code deleted in #147 | **Met** | This document only; no source files changed. |

---

## 14. Next vertical slice (obvious next step)

**#148 — Guide-first shell + Today.** Concrete ordering constraints discovered during inventory:

1. Add the five canonical routes/surfaces (Today / Body / Progress / Guide / You) with session as an immersive mode, **without deleting** `app/human-health-app.tsx`.
2. Extract the session orchestration logic currently inside `human-health-app.tsx` (`startWorkout`, `logSet`, `selectSwap`, `finishWorkout`, readiness chips, rest timer, wake lock) into a React-free or thin-React module so the old shell and the new shell can share it during coexistence.
3. Update `public/sw.js` `CORE` and `scripts/check-pwa.mjs` route assertions in the same change that introduces new routes, so the PWA gate keeps failing closed rather than silently regressing.
4. Ship a Today that renders without any model or network (deterministic `schedule` + `engine` + `whole-person-recovery` only), with a feature flag to return to the legacy shell during QA.

Rollback requirement for #148: keep the legacy shell reachable behind a flag until the new shell passes phone/tablet/desktop + offline QA (#30, #42).
