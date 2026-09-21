# Agent Mission — Guide-First Human Health Refactor

## Read order

Before changing product code, read:

1. `docs/CANONICAL_PRODUCT_DIRECTION.md`
2. `docs/GUIDE_ARCHITECTURE.md`
3. `docs/EXPERIENCE_SYSTEM.md`
4. `docs/REFACTOR_PLAN.md`
5. `AGENTS.md`

Historical phase docs may contain useful implementation details, but they do not override the canonical direction above.

## Goal

Turn Human Health into a simple visual personal health guide that feels like one coordinated team of specialists while hiding backend complexity.

## Never assume

Do not assume:

- current routes are the desired IA;
- old epics remain product truth;
- an existing feature must stay visible;
- AI is limited to narrative generation;
- a chat transcript is the memory model;
- a dashboard is useful because data exists;
- health/wearable inputs deserve permanent UI.

## Preserve evidence, not accidental structure

Use the current app as an implementation inventory.

Before replacing anything:

1. find the current data/logic;
2. identify tests;
3. classify preserve/adapt/replace/quarantine/retire;
4. define migration;
5. implement the smallest vertical slice;
6. verify;
7. record evidence.

## Product bar

A normal user should be able to:

- open the app;
- immediately understand what to do;
- complete the action;
- get useful feedback;
- leave.

No prompt engineering.

## Safety

The LLM cannot override deterministic safety.

Pain, symptom, treatment, medication/insulin, emergency, and injury-clearance boundaries remain fail-closed.

## Delivery

Do not merge or deploy without explicit approval.

Prefer focused PRs with:

- rationale;
- migration impact;
- test evidence;
- responsive/accessibility QA;
- privacy/safety notes;
- rollback.

## First engineering task

Perform the Phase 1 architecture/migration inventory from `docs/REFACTOR_PLAN.md` before broad UI replacement. Do not begin by deleting old code.
