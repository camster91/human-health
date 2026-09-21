# AGENTS.md — Human Health

## Canonical read order

Before product work:

1. `docs/MASTER_PRODUCT_BLUEPRINT.md`
2. `docs/CANONICAL_PRODUCT_DIRECTION.md`
3. `docs/GUIDE_ARCHITECTURE.md`
4. `docs/EXPERIENCE_SYSTEM.md`
5. `docs/REFACTOR_PLAN.md`
6. `docs/AGENT_MISSION_GUIDE_FIRST.md`

Historical phase/ship docs are implementation evidence only. They do not override the Guide-first product direction.

## Mission

Refactor the existing app into one simple, visual, multimodal health/body Guide backed by coordinated specialist reasoning and deterministic safety/programme systems.

Treat current code as an inventory to classify:

- Preserve
- Adapt
- Replace
- Quarantine
- Retire

Do not preserve old IA or feature visibility merely because it exists.

## Product rules

- Normal use should not require prompting an AI.
- One useful next action on Today.
- Target IA: Today / Body / Progress / Guide / You.
- Active workout is immersive.
- Chat is one surface, not the product.
- Prefer rich UI, media and controls when better than text.
- No guilt, streak punishment, fake health score, or dashboard homework.
- Inferences never silently become facts.

## AI rules

- DeepSeek-first through a provider-agnostic gateway.
- Structured output only for authoritative flows.
- LLM recommendations are advisory until validated.
- Programme and safety engines remain authoritative.
- Remote model context must be minimized and consent-aware.
- Core training must work without the model.

## Safety

- Fail closed on corrupt health/training state.
- Pain/illness/symptom flags must route through deterministic safety policy.
- Do not diagnose.
- Do not prescribe medication or insulin.
- Do not provide emergency monitoring.
- Do not clear injuries.
- Professional escalation is a valid result.

## Delivery

- Feature branch + PR.
- Do not merge or deploy without Cameron's explicit approval.
- Preserve historical user data.
- Include tests, responsive QA, accessibility, privacy/safety impact and rollback notes.
