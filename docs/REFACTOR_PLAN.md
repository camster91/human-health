# Guide-First Refactor Plan

## Mission

Refactor the existing Human Health app into the canonical Guide-first personal health operating system described in:

1. `docs/CANONICAL_PRODUCT_DIRECTION.md`
2. `docs/GUIDE_ARCHITECTURE.md`
3. `docs/EXPERIENCE_SYSTEM.md`

Do not treat the current UI, phase structure, or historical roadmap as a specification when it conflicts with these documents.

## Safety of the refactor

- Work on feature branches.
- Do not merge or deploy without Cameron's explicit approval.
- Preserve user data and proven low-level logic wherever practical.
- Do not rewrite immutable workout history to fit a new schema.
- Add migrations/adapters instead of silently changing historical meaning.
- Keep rollback possible until the new shell and context engine are verified.

## Inventory rule

Before replacing a subsystem, classify it:

- **Preserve** — already aligned and dependable.
- **Adapt** — useful engine/data with a new interface or contract.
- **Replace** — current implementation blocks the canonical product.
- **Quarantine** — potentially useful but unsafe/unclear/unverified.
- **Retire** — duplicated, stale, or product-conflicting.

Do not delete code merely because it is old. Do not preserve code merely because it exists.

## Known preserve candidates

- training/workout history;
- exercise knowledge graph;
- equipment profiles;
- progression utilities;
- readiness/recovery primitives;
- connected-health source/provenance handling;
- import/export;
- local persistence;
- offline/PWA/native foundation;
- safety/privacy rules;
- existing verification utilities.

These still require code review before reuse.

## Known refactor/replace candidates

- primary navigation;
- Today screen;
- Lift/Log user-facing model;
- Coach route;
- platform/health user-facing complexity;
- AI contract limited to narrative explanation;
- long-horizon experience;
- progress presentation;
- body-state input;
- media system;
- onboarding;
- context selection;
- internal roadmap/phase assumptions exposed to agents.

## Phase 0 — Product reset and source-of-truth cleanup

- Make canonical docs explicit.
- Mark old UX/roadmap issues as superseded or historical.
- Update README, AGENTS, handoff, and status.
- Create one canonical refactor epic and child issues.
- Record current release/verification blockers separately from product redesign.
- No production changes.

**Exit:** an agent can enter the repo and identify the new product direction within two minutes without relying on chat history.

## Phase 1 — Architecture and migration inventory

Audit the current codebase and produce:

- route/component inventory;
- data-store inventory;
- engine/service inventory;
- current AI integration;
- connected-health boundaries;
- native bridges;
- media/assets;
- test coverage;
- offline/PWA behaviour;
- production-only assumptions.

Create a preserve/adapt/replace/quarantine/retire matrix.

Define target modules:

- context;
- memory;
- programme;
- safety;
- guide/orchestrator;
- tools;
- media;
- UI composer;
- body state;
- progress;
- integrations.

**Exit:** every major current subsystem has a disposition and migration path.

## Phase 2 — Guide-first shell

Build the target IA:

- Today
- Body
- Progress
- Guide
- You

Session is immersive.

Requirements:

- mobile-first;
- useful one-screen Today;
- one primary CTA;
- progressive disclosure;
- responsive tablet/desktop;
- accessibility basics;
- offline-safe shell;
- no old phase terminology in user-facing UI.

**Exit:** the app feels like the new product even while some old engines remain behind it.

## Phase 3 — Context + memory foundation

Implement:

- BodyProfile;
- DailyState;
- personal rules;
- preferences;
- life mode;
- equipment/environment;
- structured memory types;
- provenance/freshness;
- inference correction;
- timeline;
- data minimization selectors for model context.

**Exit:** the app can explain what it knows, why, and which context is being used.

## Phase 4 — DeepSeek-first Guide orchestration

Implement a provider-agnostic model gateway with DeepSeek as the initial preferred backend.

Add:

- coordinator;
- specialist-role prompts/contracts;
- strict schemas;
- tool permissions;
- context budgets;
- error/fallback handling;
- evidence/provenance;
- privacy controls;
- cost/latency metrics;
- deterministic no-model fallback.

The LLM may not directly mutate authoritative training/health state without validated application commands.

**Exit:** Guide can reason across specialists but output remains controlled, structured, and reversible.

## Phase 5 — Programme + safety integration

Connect coordinator output to deterministic systems.

Implement:

- whole-person coverage;
- daily adaptation;
- minimum useful day;
- progression/regression;
- recovery coordination;
- personal-rule enforcement;
- pain/symptom holds;
- professional escalation;
- health-module policy hooks.

**Exit:** every AI recommendation is validated before becoming a plan.

## Phase 6 — Multimodal UI composer and trusted media

Implement typed UI blocks:

- exercise;
- set/rest;
- body map;
- charts;
- short video;
- image guide;
- warning;
- evidence;
- route/map;
- completion;
- voice step.

Add media registry and external content provenance.

Add web/research/image/video/route/weather tools through controlled adapters.

**Exit:** ordinary use is visual/action-based rather than chat-terminal based.

## Phase 7 — Long-term adaptive guide

Implement time-horizon planning:

- daily;
- weekly coverage;
- 4–8 week adaptation;
- quarterly reviews;
- annual review;
- maintenance modes;
- return-after-gap;
- behaviour/adherence learning;
- transparent experiments;
- quality-of-life checkpoints.

**Exit:** the app can change priorities over years without asking the user to restart programs.

## Phase 8 — Optional health/lifestyle modules

Build optional, separately permissioned modules:

- nutrition/hydration;
- sleep;
- stress/recovery;
- condition/life-stage-aware safety context;
- wearable/native health connections;
- preventive records where still useful.

Modules must collapse into one clear recommendation rather than adding permanent dashboard clutter.

## Phase 9 — Hands-free and movement intelligence

After core product quality is proven:

- voice workout mode;
- better media;
- camera rep/tempo assistance;
- movement feedback within validated limits;
- widgets/watch experiences;
- contextual outdoor/travel experiences.

Camera features remain optional and conservative.

## Legacy issue treatment

Old issues should be handled by one of:

- linked into the new epic if still relevant;
- rewritten to the new acceptance criteria;
- closed as superseded;
- kept open only if they represent an independent safety/release blocker.

Do not keep two competing product roadmaps active.

## Engineering acceptance criteria

Every refactor slice should include:

- unit tests for logic;
- migration/persistence tests;
- accessibility checks;
- representative phone/tablet/desktop QA;
- offline behaviour where applicable;
- error/fallback states;
- privacy review;
- safety regression tests;
- performance review;
- rollback notes.

## Product acceptance criteria

A successful release should demonstrate:

- a first-time user gets useful value with minimal onboarding;
- a returning user normally needs only Today;
- the user can reduce time or report soreness without restarting a plan;
- the app adjusts without guilt states;
- Guide can answer "why";
- Guide can retrieve trusted media/evidence through tools;
- the user can inspect/correct stored inferences;
- safety rules can block model recommendations;
- core workout planning continues without a model;
- progress shows meaningful trajectories rather than one opaque score;
- no normal flow requires prompt engineering.

## Refactor completion definition

The refactor is complete when:

1. canonical product docs match the actual UI and architecture;
2. legacy user-facing IA is removed or intentionally preserved with rationale;
3. core old engines are either migrated, adapted, or retired;
4. the Guide-first shell is the only primary experience;
5. DeepSeek/model failure does not break core training;
6. multimodal/tool outputs are safely rendered;
7. privacy, safety, data portability, offline behaviour, accessibility, and rollback are verified;
8. production deployment is separately approved and validated.
