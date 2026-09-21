# Agent Handoff — Human Health

**Repository:** `camster91/human-health`

## Current direction

Human Health is entering a Guide-first product refactor.

The current live/legacy implementation contains valuable engines and data models, but its existing information architecture and historical phase roadmap are not the target product.

Do not continue old Today/Lift/Log/You or phase-driven UX work unless it is explicitly reconciled with the canonical documents.

## Read first

1. `docs/CANONICAL_PRODUCT_DIRECTION.md`
2. `docs/GUIDE_ARCHITECTURE.md`
3. `docs/EXPERIENCE_SYSTEM.md`
4. `docs/REFACTOR_PLAN.md`
5. `docs/AGENT_MISSION_GUIDE_FIRST.md`
6. Open Guide-first refactor issues

## Current implementation status

Existing app foundations include training, recovery, connected-health, coaching, local data, PWA/native packaging and long-horizon platform work.

These are **candidates for reuse**, not proof that the new product is already implemented.

## Immediate next track

1. Perform architecture/migration inventory.
2. Classify current subsystems: Preserve / Adapt / Replace / Quarantine / Retire.
3. Design the target module boundaries.
4. Implement the new Guide-first shell.
5. Add Context + Memory.
6. Add DeepSeek-first orchestration behind strict application contracts.
7. Integrate deterministic programme/safety.
8. Add multimodal UI/media/tools.
9. Verify end-to-end before any merge/deploy decision.

## Important

- Do not delete old code before migration inventory.
- Do not make production changes from the planning branch.
- Do not merge or deploy without explicit approval.
- The current production site must not be described as running the Guide-first refactor until separately verified.
