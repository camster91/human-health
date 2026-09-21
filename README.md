# Human Health

Human Health is being refactored into a **Guide-first personal health operating system**: one simple, visual app that helps a person understand what their body needs next and guides them through it.

The target experience is:

**Open → understand what matters → do the next useful thing → see meaningful progress → leave.**

The user interacts with one calm Guide. Behind it, the system can coordinate specialist reasoning, deterministic training/recovery logic, connected health context, trusted web/media tools, personal history, and long-term planning.

## Canonical product direction

Read these first:

1. [Canonical Product Direction](docs/CANONICAL_PRODUCT_DIRECTION.md)
2. [Guide-First Architecture](docs/GUIDE_ARCHITECTURE.md)
3. [Experience System](docs/EXPERIENCE_SYSTEM.md)
4. [Refactor Plan](docs/REFACTOR_PLAN.md)
5. [Agent Mission](docs/AGENT_MISSION_GUIDE_FIRST.md)

When historical docs conflict with these, the documents above win.

## Current implementation

The repository already contains a substantial local-first fitness/health PWA with:

- adaptive training;
- exercise/equipment knowledge;
- workout history;
- readiness and recovery logic;
- connected-health context and provenance;
- import/export;
- offline/PWA/native foundations;
- safety/privacy rules;
- long-horizon health work.

That implementation is now an **asset inventory**, not a requirement to preserve every current screen or product assumption.

The refactor should preserve good engines/data, adapt useful subsystems, and replace user-facing architecture that conflicts with the Guide-first direction.

The current production experience must not be described as already refactored until the new work is implemented, verified, approved, and deployed.

## Target product shell

- **Today** — what matters now.
- **Body** — body state, capability, soreness/pain, mobility, recovery.
- **Progress** — meaningful trajectories without one fake health score.
- **Guide** — natural help, explanations, learning, planning.
- **You** — goals, personal rules, integrations, privacy, data and preferences.

Workout/session mode is immersive rather than a permanent tab.

## AI direction

The preferred initial model backend is **DeepSeek through a provider-agnostic model gateway**.

The LLM:

- reasons;
- coordinates specialist roles;
- requests tools;
- explains;
- composes structured UI intent.

The application:

- owns authoritative health/training state;
- validates output;
- enforces personal rules;
- enforces deterministic programme logic;
- enforces safety;
- handles privacy/consent;
- renders accessible UI.

Core training guidance must degrade safely when the LLM or internet is unavailable.

## Safety

Human Health is a fitness/health-support product, not a medical authority.

It must not autonomously diagnose disease, prescribe medication/insulin, provide emergency monitoring, or clear injuries.

Safety and personal rules outrank model output.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:pwa
```

`npm run verify` runs the consolidated source/build/PWA gate.

## Delivery rules

- Mobile-first and Figma-first.
- Work through feature branches and PRs.
- Do not merge or deploy without explicit approval.
- Preserve data meaning and historical workout evidence.
- Prefer deterministic rules for authoritative programme/safety decisions.
- Treat observed facts, user reports, preferences, inferences, and external evidence separately.
- Keep recommendations explainable and reversible.
- Build progressive disclosure: simple by default, deep on demand.
- Accessibility, privacy, offline behaviour, security, testing, deployment and rollback are acceptance criteria, not polish tasks.
