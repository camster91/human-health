# Phase 4 final source review — Coaching intelligence

PR: #80
Base: `main`
Branch: `phase-4-coaching-intelligence`
Tracking: #77; verification #78; runner #51

## Review conclusion

Phase 4 is **feature-scope complete and source-reviewed** for the deterministic-first coaching surface. It is not release-verified because automated verification and representative browser QA have not yet run on the final candidate.

## Architecture review

The new coaching layer does not replace Phase 1–3 engines. It consumes their persisted training history, activity, readiness, goal preferences and connected-health trends, then produces a separate evidence ledger, trends and reversible actions.

The recommendation itself is deterministic. The optional AI contract receives the already-decided actions plus evidence and safety rules. It is intentionally unable to mutate workout history, preferences, confidence labels or deterministic action order.

## Trend review

- Strength uses repeated comparable primary-lift performance and keeps different exercise variants separate.
- Cardio uses planned aerobic coverage against the configured target; incidental movement is not silently counted as planned cardio.
- Consistency compares qualifying recent sessions with the preceding period.
- Recovery uses explicit readiness check-ins.
- Connected-health trends retain current/stale/partial/failed state. Only current signals with a comparable trend window receive usable coaching confidence.
- Connected-health up/down directions remain value-neutral; the coaching layer does not label a resting-heart-rate, sleep, steps or cardio-fitness direction medically better or worse.
- No cross-domain universal health score is created.

## Plateau / deload review

A plateau is not inferred from one poor exposure. The implementation requires at least four comparable primary-lift exposures spanning at least 14 days. It compares early and recent repeated performance. Deload is advisory only and is suggested only when plateau/regression evidence aligns with repeated constrained recovery check-ins. The app does not automatically rewrite training history or permanently change the programme.

## Multi-goal review

Existing Focus / Maintain / Deprioritize / Off preferences are used as planning weights. Deprioritized/off domains do not drive catch-up recommendations. Recovery can temporarily take precedence without rewriting the user's durable goal preferences. Percentages shown in the Coach UI are planning allocation shares, not a health score.

## Context-aware review

Recommendations can account for:
- current readiness level
- recent lower-body working-set concentration
- recent hard planned cardio
- explicit travel, return-to-training and maintenance modes
- training consistency
- current goal priorities
- plateau/deload evidence
- current connected-health trend context

Recent workload can cause the coach to advise against stacking another hard lower-body stressor. Life modes shape the coaching recommendation before deficit chasing. Fresh connected sleep can also influence readiness through the existing Phase 3 readiness bridge while stale connected signals remain non-authoritative.

## Conversational adaptation review

The parser recognizes bounded time limits, low-energy wording, travel/return/maintenance context, known gym profiles, unavailable equipment and goal hints.

Recognized context is now passed into the existing adaptive workout, readiness, workload and rolling-schedule engines to create a **preview-only workout plan**. The preview can show compatible substitutions, reduced set volume and held progression without creating an active workout or changing history, preferences or schedule events.

Symptom and treatment language is not interpreted as medical coaching. Pain, injury, dizziness, illness, glucose-adjacent warning language, insulin, medication, correction or carbohydrate-treatment wording causes the workout preview to be withheld and routes the user to the safety boundary instead of diagnosis, dosing advice or training clearance.

## AI explanation review

The optional `window.HumanHealthCoachAI` adapter is narrative-only. The request contains:
- deterministic actions
- evidence observations and confidence
- the safety boundary
- explicit rules prohibiting action changes, confidence upgrades, diagnosis, medication/insulin/carb dosing and universal health scoring

No provider is bundled with credentials. Deterministic explanations remain available without AI. Source tests preserve the snapshot before and after an injected narrative provider call to demonstrate that narrative generation does not mutate deterministic actions or evidence.

The provider contract receives evidence summaries rather than raw connected-health records. A host that connects a remote provider is responsible for disclosing destination, retention and privacy behaviour before use; Phase 4 itself creates no cloud account or background AI upload. See `docs/phase-4-safety-privacy.md`.

## Movement/video review

Camera/video analysis is not enabled. The reliability gate requires explicit review of benchmark quality, false-positive risk, device performance, privacy flow, retention policy and accessibility. Even when those flags are complete, a separate reviewed runtime implementation and explicit user permission are still required.

## UX/PWA review

A dedicated `/coach/` route presents next actions, evidence, plateau/deload review, multi-goal planning, conversational adaptation with workout preview, explanation-layer status and the movement/video gate. The global quick-route control exposes Coach and Health outside the focused live-workout screen. `/coach/` is included in the service-worker precache and static PWA check expectations.

The existing compact Coach tab in the training shell remains a session-note surface; the advanced Phase 4 coaching experience is the dedicated `/coach/` route. This avoids a risky wholesale rewrite of the mature live-workout shell during the coaching phase.

## Source-review risks / limits

1. No executable TypeScript/test/build evidence exists yet for the final branch.
2. No representative browser/accessibility QA exists yet for `/coach/`.
3. The optional AI adapter is an integration boundary, not a bundled remote AI service.
4. Connected-health source usefulness still depends on Phase 3 data quality and freshness.
5. Movement/video remains deliberately unavailable.
6. The self-hosted Actions runner issue remains external to Phase 4 source completeness.

## Merge/deploy gate

Keep PR #80 draft and unmerged until Cameron explicitly approves merge. Production deployment remains a separate approval and verification decision.
