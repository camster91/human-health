# Human Health — Autonomous Completion Mission

## Mission

Act as the autonomous product, design, engineering, architecture, QA, safety, documentation, and delivery agent for:

- Repository: `https://github.com/camster91/human-health`
- Canonical product epic: `#146`
- Current planning branch: `planning/guide-first-health-os-refactor`
- Current planning PR: `#158`
- Primary implementation sequence: `#147–#157`

Your goal is to move Human Health from its current legacy implementation into the completed **Guide-first personal health operating system** defined by the repository's canonical product documents.

Do not optimize for number of commits, issues closed, or features added.

Optimize for a coherent, maintainable, safe, delightful product that is genuinely usable every day for years.

---

# Primary Goal

Complete the Guide-first Human Health refactor end to end.

The finished product should feel like:

> One simple, intelligent health and body Guide that understands the person, decides what matters next, guides them through it visually, learns over time, and quietly coordinates the equivalent of a team of specialists behind the scenes.

The normal user experience should remain:

**Open → understand what matters → do the next useful thing → see meaningful progress → leave.**

The user should not need to:

- choose complicated programmes;
- interpret health dashboards;
- prompt an AI repeatedly;
- coordinate different specialist recommendations;
- understand training science;
- manually reorganize missed workouts;
- hunt through exercise libraries;
- manage AI context;
- understand the backend architecture.

The app handles that complexity.

---

# Canonical Source of Truth

Before changing product code, read these in order:

1. `docs/MASTER_PRODUCT_BLUEPRINT.md`
2. `docs/CANONICAL_PRODUCT_DIRECTION.md`
3. `docs/GUIDE_ARCHITECTURE.md`
4. `docs/EXPERIENCE_SYSTEM.md`
5. `docs/REFACTOR_PLAN.md`
6. `docs/AUTONOMOUS_COMPLETION_MISSION.md`
7. `docs/AGENT_MISSION_GUIDE_FIRST.md`
8. `AGENTS.md`
9. Epic `#146`
10. Issues `#147–#157`

If an older document, issue, branch, screen, route, feature, phase plan, dashboard, or architectural assumption conflicts with these sources, the Guide-first direction wins.

Do not allow historical implementation documents to silently become product requirements.

---

# North Star

Human Health is not primarily a workout app.

It is a **personal body-and-health operating system**.

Its purpose is to answer:

> Given who this person is today, their history, body, goals, environment, time, recovery, preferences and health context, what is the simplest useful thing they should do next?

The answer might be:

- strength training;
- cardio;
- mobility;
- balance;
- walking;
- recovery;
- rest;
- nutrition guidance;
- education;
- professional escalation;
- a shorter session;
- a different session;
- nothing strenuous today.

---

# Target Product Experience

The primary shell should converge on:

- **Today**
- **Body**
- **Progress**
- **Guide**
- **You**

Active exercise/session mode is immersive.

## Today

Today should answer:

> What should I do now?

It should normally contain:

- one recommendation;
- duration;
- intensity;
- one short explanation;
- one clear primary action;
- contextual adjustments such as:
  - less time;
  - sore;
  - pain;
  - different equipment;
  - travelling;
  - outside;
  - low energy;
  - ask Guide.

Do not turn Today into a dense dashboard.

## Body

Provide a visual way to communicate body state.

Support:

- ready;
- recently trained;
- recovering;
- tight;
- sore;
- pain reported;
- mobility focus;
- capability attention.

Body input must affect planning through validated rules.

Do not imply diagnosis from body-map interaction.

## Progress

Show meaningful trajectories rather than a single fake health score.

Examples:

- strength;
- aerobic/cardio;
- mobility;
- balance;
- consistency;
- recovery;
- capability;
- user-selected quality-of-life outcomes.

Answer:

- What improved?
- What is stable?
- What needs attention?
- What should I do next?

## Guide

Guide is the single visible intelligence layer.

It can accept text or voice, but chat is only one interface.

Examples:

- “I only have 10 minutes.”
- “I'm exhausted.”
- “Show me this exercise.”
- “Why are we doing this?”
- “My shoulder hurts.”
- “I'm travelling.”
- “Give me something I can do outside.”
- “What changed over the last three months?”

Respond using the best UI:

- plan card;
- exercise card;
- body map;
- video;
- image;
- chart;
- timer;
- route;
- evidence card;
- warning;
- professional escalation;
- concise conversation.

Do not make the product feel like a text terminal.

## You

Include:

- goals;
- priorities;
- personal rules;
- equipment;
- environments;
- coaching style;
- integrations;
- health modules;
- privacy;
- data controls;
- AI-memory controls;
- export/delete;
- what the system believes it knows.

---

# Intelligent Backend

Use a DeepSeek-first architecture initially, but never couple core product behaviour to one model provider.

Build a provider-agnostic model gateway.

The model layer may coordinate specialist roles for:

- strength and conditioning;
- cardio;
- mobility/movement;
- recovery/sleep;
- nutrition/hydration;
- behaviour/adherence;
- safety;
- research/evidence;
- long-term planning.

The rule is:

**Specialists advise.  
Coordinator resolves.  
Application validates.**

The LLM does not own authoritative health or training state.

---

# Deterministic Authority

The application remains authoritative for:

- safety;
- personal rules;
- programme state;
- workout history;
- health-data integrity;
- progression;
- regression;
- recovery limits;
- allowed exercise pool;
- privacy;
- consent;
- persistence;
- imports/exports;
- data deletion;
- rendering;
- professional escalation rules.

The LLM may recommend and explain.

It may not bypass these systems.

---

# Context Engine

Build durable structured context rather than relying on chat history.

Support:

- `BodyProfile`
- `DailyState`
- goals;
- priorities;
- preferences;
- equipment;
- environments;
- life mode;
- body state;
- training history;
- capability history;
- connected health;
- behaviour patterns;
- personal rules;
- external evidence;
- timeline;
- context freshness;
- provenance.

Distinguish:

- observed fact;
- user-reported fact;
- preference;
- explicit rule;
- inference;
- external evidence.

Never silently turn an inference into a fact.

Users must be able to:

- inspect;
- correct;
- disable;
- delete;
- export

what the system believes it knows.

---

# Life Context

The Guide should adapt to real life.

Understand contexts such as:

- workday;
- weekend;
- home;
- gym;
- travel;
- hotel;
- outdoors;
- busy period;
- illness/recovery;
- return after interruption;
- maintenance;
- low energy;
- normal energy;
- short time window;
- longer available session.

A missed workout must not break the programme.

Reflow the plan.

---

# Long-Term Adaptation

Support multiple time horizons.

## Daily

Choose today's safest useful action.

## Weekly

Maintain appropriate whole-person coverage across:

- strength;
- cardio;
- mobility;
- balance/coordination;
- recovery;
- general movement.

## 4–8 weeks

Adapt:

- volume;
- difficulty;
- exercise selection;
- frequency;
- recovery;
- session length;
- conditioning.

## Quarterly

Review capability and quality-of-life changes.

## Annually

Summarize:

- improved;
- stable;
- declined;
- recurring issues;
- adherence patterns;
- next priorities.

## Multi-year

Support:

- maintenance;
- aging;
- injury history;
- changing goals;
- travel;
- different equipment;
- lifestyle changes;
- reduced capacity;
- increased ambition.

Do not require the person to “restart a programme” every few months.

---

# Behaviour Learning

Learn what actually helps the person succeed.

Examples:

- 25-minute sessions are completed more often than 45-minute sessions;
- lunchtime works better than evening;
- cycling is preferred to treadmill cardio;
- certain exercises are repeatedly skipped;
- busy weeks work better with minimum-useful sessions.

Use this knowledge to reduce friction.

Do not respond by adding more guilt, reminders or notifications.

---

# Reversible Experiments

The app may try small experiments when useful.

Examples:

- shorter sessions;
- different training times;
- new cardio modality;
- different weekly distribution;
- alternative exercise.

Experiments must be:

- transparent;
- low-risk;
- reversible;
- based on a reason;
- evaluated over repeated evidence.

Never make a durable behavioural assumption from one event.

---

# Exercise Experience

During exercise, optimize for low decision load.

An exercise screen should usually provide:

- exercise name;
- short visual demonstration;
- sets/reps/time;
- relevant weight/load;
- one or two key cues;
- Done;
- Too easy;
- Good;
- Hard;
- Pain.

Use feedback to adapt future planning.

If Pain is reported, do not treat it like an ordinary difficulty score.

Route it through safety logic.

---

# Minimum Useful Day

Every day should have an achievable version of success.

If the person has:

- 5 minutes;
- 10 minutes;
- low motivation;
- low energy;
- limited equipment;
- travel constraints;

the Guide should be able to generate the smallest useful session.

Do not punish missed days.

Do not break streaks.

Do not frame reduced activity as failure.

---

# Multimodal UI

The AI should return structured UI intent where appropriate.

Possible UI components:

- today hero;
- exercise card;
- set logger;
- rest timer;
- body map;
- chart;
- short video;
- image guide;
- route;
- map;
- checklist;
- evidence card;
- warning;
- professional escalation card;
- voice step;
- completion summary.

The app renders the interface.

The model should not directly generate arbitrary unsafe UI.

---

# Trusted Web and Media

Support controlled adapters for:

- web research;
- exercise media;
- videos;
- images;
- maps;
- routes;
- weather;
- health/device context.

Trust order:

1. owned/curated content;
2. approved expert/provider;
3. trusted evidence source;
4. broader web.

Track where relevant:

- source;
- author/provider;
- date;
- freshness;
- media type;
- exercise/topic;
- safety review status;
- rights/licensing status;
- whether content may be embedded, cached or only linked.

Do not silently turn random web media into canonical exercise guidance.

---

# Nutrition

Keep nutrition useful and low-friction.

Focus primarily on:

- protein;
- fruits and vegetables;
- hydration;
- meal quality;
- recovery nutrition;
- user-selected goals.

Do not require calorie counting by default.

Optional meal-photo guidance may offer broad observations and practical suggestions.

Do not claim exact calories/macros or diagnostic certainty from a photo.

---

# Health Modules

Optional modules may support contexts such as:

- diabetes;
- hypertension;
- arthritis;
- pregnancy/postpartum;
- previous injury;
- age-related needs;
- other validated contexts.

Modules must remain:

- opt-in;
- permissioned;
- exportable;
- deletable;
- understandable;
- secondary to the main simple experience.

For diabetes specifically:

The system may use glucose context for conservative exercise-safety guidance.

It must not independently prescribe:

- insulin;
- medication;
- treatment carbohydrates;
- correction doses;
- emergency treatment.

---

# Professional Escalation

A professional handoff is a successful outcome when appropriate.

Possible outcomes include:

- continue;
- modify;
- recover;
- monitor;
- see a physiotherapist;
- see another qualified professional;
- seek medical assessment;
- follow predefined urgent/emergency guidance.

The app may organize user-controlled context for discussion with a professional.

Do not claim diagnosis or clearance.

---

# Safety Hierarchy

Use this priority:

1. emergency/symptom safety policy;
2. health-condition safety policy;
3. explicit personal rules;
4. deterministic programme rules;
5. validated specialist recommendations;
6. LLM explanation/presentation.

The LLM never outranks safety.

---

# Graceful Degradation

The app must remain useful during:

- DeepSeek outage;
- another model-provider outage;
- no internet;
- failed web search;
- failed media provider;
- missing wearable data;
- stale health data;
- unsupported device capability;
- tool timeout.

A person should still be able to:

- see today's safe plan;
- complete a workout;
- record it;
- use core exercise guidance;
- access safety rules;
- continue their programme.

---

# Delight

Delight comes from reduced friction.

Prefer:

- clear hierarchy;
- immediate feedback;
- beautiful useful media;
- short animations;
- useful haptics;
- voice during exercise;
- large controls;
- easy overrides;
- progressive disclosure;
- satisfying completion moments;
- respectful coaching language.

Avoid:

- streak punishment;
- guilt;
- fake praise;
- meaningless scores;
- confetti for trivial actions;
- dense dashboards;
- excessive AI typing animation;
- forcing chat;
- gimmicky mascots.

---

# Accessibility

Treat accessibility as part of product quality.

Support:

- keyboard;
- screen readers;
- semantic controls;
- large tap targets;
- high contrast;
- reduced motion;
- text scaling;
- captions;
- transcripts;
- voice alternatives;
- reduced dexterity;
- responsive phone/tablet/desktop behaviour.

---

# Repository Cleanup

The repo currently contains historical plans and old implementation directions.

Do not delete historical evidence blindly.

Reconcile and clean it.

## Supersede duplicate roadmap work

Review old issues such as `#63–#73`.

Where they overlap the new Guide-first direction:

1. extract unique useful requirements;
2. move them into #146/#147–#157;
3. mark the old issue superseded.

Do not close independent safety/data-integrity issues merely because the product direction changed.

## Preserve hardening work

Keep and reconcile issues related to:

- storage integrity;
- connected-health integrity;
- privacy;
- deletion;
- import/export;
- CI;
- PWA;
- accessibility;
- device QA;
- rollback;
- safety.

Examples include:

- #9
- #30
- #42
- #43
- #47
- #51
- #61
- #85–#112

These may become migration prerequisites for the Guide-first system.

## Reframe legacy release gates

Reconcile old Phase 0–5 release gate #82.

Do not allow it to remain the product's canonical release gate.

Treat it as the integrity/verification gate for the legacy implementation and migration inputs.

The Guide-first final release gate is #157.

## Old documentation

Historical docs may be moved under something like:

`docs/archive/pre-guide/`

Candidate historical files include:

- old phase docs;
- old MVP build order;
- old issue maps;
- old next-20 plans;
- old project-board setup;
- old phase definitions;
- old polish summaries;
- old implementation summaries;
- old design-pass summaries.

Preserve history where useful.

Do not allow historical documents to appear authoritative beside current docs.

## PR reconciliation

Review draft PR #97.

Move any still-useful unique repository-readiness work into the current canonical branch/PR.

Then leave one clear active source-of-truth documentation PR.

Do not discard unique useful work.

## Branch cleanup

Audit historical branches only after confirming:

- work is merged;
- no unique safety fix exists;
- no unmerged migration evidence is needed.

Do not delete active or unique branches blindly.

---

# CI and Toolchain Cleanup

Reconcile verification paths.

Current known inconsistencies include:

- old phase branches referenced by Verify workflow;
- Android workflow using a different Node version;
- floating GitHub Action versions in some workflows;
- historical lockfile/reproducibility concerns;
- self-hosted runner availability.

Converge on one documented supported toolchain.

Do not weaken verification merely to make CI green.

---

# AI Evaluation Suite

Create repeatable AI evaluation cases before treating AI behaviour as production-ready.

Test scenarios including:

- malformed structured output;
- specialist disagreement;
- hallucinated user facts;
- stale context;
- incorrect inference;
- unsafe exercise recommendation;
- reported pain;
- concerning symptoms;
- missing wearable data;
- conflicting health signals;
- DeepSeek outage;
- tool timeout;
- web/media failure;
- adversarial user instructions;
- model upgrade regression;
- accidental mutation request;
- unsafe medical-treatment request.

Record expected safe behaviour.

---

# Migration Strategy

Do not perform a giant rewrite unless the architecture proves that is safest.

Prefer incremental vertical slices.

Possible order:

1. inventory;
2. shell;
3. Today;
4. context/memory;
5. Guide orchestration;
6. programme/safety integration;
7. Body;
8. multimodal components;
9. long-term planner;
10. health modules;
11. advanced voice/camera/contextual experiences.

Use adapters where possible.

Preserve user data meaning.

Do not silently rewrite historical workout or health records.

---

# Feature Flags

Where useful, introduce feature flags or migration gates so the new Guide experience can coexist temporarily with legacy implementation during testing.

Feature flags should support:

- safe incremental migration;
- internal comparison;
- rollback;
- staged QA.

Do not leave permanent duplicate product experiences after migration completes.

---

# Product Name

Audit naming across:

- UI;
- docs;
- prompts;
- assets;
- manifests;
- native apps;
- metadata.

Use `Human Health` as the canonical repo/product name unless a separate product naming decision is explicitly approved.

Remove or mark obsolete working names that could create future drift.

---

# Engineering Standards

For every meaningful change:

- understand current behaviour;
- identify owned data;
- identify dependencies;
- identify migration impact;
- implement smallest complete vertical slice;
- write/update tests;
- run available verification;
- record evidence;
- include accessibility;
- include responsive QA;
- include offline/error states;
- include privacy impact;
- include safety impact;
- include security impact;
- include analytics/observability where relevant;
- include rollback notes.

Do not claim something was verified if it was not actually verified.

---

# Figma-First Product Work

For major user-facing changes:

1. establish the target flow;
2. define reusable components/states;
3. work Figma-first where practical;
4. implement from the approved design direction;
5. preserve responsive behaviour;
6. validate accessibility;
7. QA representative mobile/tablet/desktop layouts.

Do not reproduce old UI simply because components already exist.

---

# Issue Execution Model

Use GitHub as the engineering source of truth.

For every issue:

1. understand the intended outcome;
2. inspect actual current code;
3. reconcile related issues/PRs/docs;
4. determine whether it is already done, duplicated, blocked, or genuinely open;
5. implement the smallest complete solution;
6. test;
7. document evidence;
8. update the issue;
9. prepare a focused PR when appropriate;
10. continue to the next safe unblocked task.

Do not optimize for closing issues.

Close only when acceptance criteria are genuinely met.

---

# Execution Order

Begin with `#147`.

Produce the Preserve / Adapt / Replace / Quarantine / Retire migration matrix.

Do not broadly rewrite the UI before #147 establishes what should survive.

Then proceed through the dependency chain.

Suggested order:

1. #147 — current architecture/migration inventory
2. repository/roadmap cleanup discovered during inventory
3. #148 — Guide-first shell + Today
4. #149 — Context Engine / BodyProfile / DailyState / memory
5. #150 — provider gateway + DeepSeek coordinator
6. #151 — deterministic programme/safety integration
7. #152 — Body experience
8. #153 — multimodal UI + trusted media/tools
9. #154 — long-term adaptive planner
10. #155 — optional health/lifestyle modules
11. #156 — voice/camera/contextual environments
12. #157 — final release gate

Continue independent safety/integrity work in parallel when it blocks or protects migration.

---

# Autonomous Work Rules

Keep working until all safe, useful, unblocked work is exhausted.

Do not stop after:

- one issue;
- one PR;
- one document;
- one component;
- one phase;
- one successful test.

When you encounter a blocker:

1. document it;
2. identify why it is blocked;
3. identify the smallest action that resolves it;
4. continue with other unblocked work.

Ask Cameron only when a decision is genuinely required and cannot safely be inferred from canonical product direction.

Prefer reversible decisions.

Prefer existing documented product principles over asking questions.

---

# Actions Requiring Explicit Cameron Approval

Do not perform these unless Cameron explicitly approves that exact action in the current conversation:

- merge to protected/default branch;
- production deployment;
- production DNS changes;
- destructive data deletion;
- infrastructure permission expansion;
- billing/spend;
- credential/secret changes;
- external messages;
- publishing;
- irreversible account changes.

You may safely:

- inspect;
- plan;
- implement on feature branches;
- commit;
- create/update issues;
- create/update draft PRs;
- run tests;
- perform local/static QA;
- prepare deployment instructions;
- prepare merge-ready work.

---

# Definition of Done

The mission is complete only when all of the following are true:

## Product

- Guide-first shell is the primary experience.
- Today is clear and low-friction.
- Body is functional.
- Progress is meaningful.
- Guide is visual/multimodal rather than chat-only.
- You provides context/privacy/control.
- Active sessions are delightful and focused.

## Intelligence

- DeepSeek/provider gateway exists.
- specialist coordination works;
- structured output is validated;
- context is minimized;
- inferences remain distinct from facts;
- model failure has a useful fallback.

## Training

- whole-person coverage works;
- progression/regression works;
- minimum useful day works;
- recovery/load coordination works;
- interruptions and travel do not break planning.

## Long-term

- daily/weekly/monthly/yearly adaptation works;
- maintenance is supported;
- return-after-gap works;
- behaviour learning is implemented;
- quality-of-life checkpoints exist;
- experiments are transparent and reversible.

## Safety

- pain/symptom handling is deterministic;
- professional escalation works;
- health modules cannot bypass safety;
- no diagnosis;
- no medication/insulin prescribing;
- no emergency-monitoring claims;
- no injury clearance.

## Data

- historical workout data is preserved;
- connected-health provenance is preserved;
- imports/exports remain trustworthy;
- complete deletion works;
- migration and rollback are tested.

## Privacy

- users control health-module permissions;
- users can inspect AI memory/context;
- users can correct/delete inferred context;
- remote model sharing is minimized and explicit.

## Multimodal

- exercise visuals work;
- trusted media pipeline works;
- web/research tools are controlled;
- provenance is retained;
- media rights/licensing state is represented.

## Accessibility

- representative phone/tablet/desktop QA passes;
- keyboard works;
- screen-reader basics work;
- text scaling works;
- reduced motion works;
- contrast is acceptable;
- captions/transcripts exist where needed.

## Offline/resilience

- core training remains usable without AI;
- core experience survives internet loss;
- provider/tool failure degrades safely;
- PWA/native interruption recovery is verified.

## Engineering

- no competing active roadmap remains;
- historical docs are clearly archived;
- CI/toolchains are reconciled;
- no known high-severity integrity issue is hidden;
- tests pass in the supported environment;
- rollback path exists;
- current documentation matches actual behaviour.

## Release readiness

- #157 contains complete evidence.
- No claim of release readiness is made from documentation alone.
- Production deployment remains separately approved.

---

# Final Goal

Leave the repository in a state where another capable engineer or AI agent can open it and immediately understand:

1. what Human Health is;
2. what the user experience should feel like;
3. what architecture powers it;
4. what safety boundaries apply;
5. what is already completed;
6. what remains;
7. how to verify it;
8. what the next action is.

There should be no competing product story.

The finished experience should be sophisticated underneath and extremely simple above.

Keep working until all safe work toward that goal is complete.
