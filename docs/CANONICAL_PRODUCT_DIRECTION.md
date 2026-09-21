# Canonical Product Direction — Human Health

> **Status: canonical product direction for the Guide-first refactor.**
>
> This document supersedes older product-direction, navigation, phased-feature, and "AI as narrative only" assumptions. Existing code and historical docs remain useful implementation evidence, but they are not the product specification when they conflict with this document.

## Product in one sentence

Human Health is a simple personal body-and-health guide that continuously answers:

**Given who I am today, what is the simplest useful thing I should do for my body and health next?**

The product should feel like one calm, highly capable guide. Underneath, it can coordinate specialist reasoning, deterministic rules, personal history, connected health data, current web knowledge, trusted media, and long-term planning.

The user should not have to manage programs, dashboards, specialists, AI prompts, or health data.

## North-star experience

**Open → understand what matters → do the next useful thing → see meaningful progress → leave.**

The home experience should usually fit on one screen:

- what to do today;
- why it matters in one short sentence;
- how long it will take;
- one primary action;
- small context actions such as "I have 10 minutes", "I'm sore", or "Ask Guide".

The backend can become more sophisticated for years without making the front end more complicated.

## One guide, invisible team

The user interacts with one persistent Guide.

Behind it, the system can coordinate specialist roles such as:

- strength and conditioning;
- cardio and aerobic fitness;
- mobility and movement;
- recovery and sleep;
- nutrition and hydration;
- behaviour and habit support;
- injury/health-safety review;
- evidence/research review;
- long-term program planning.

Specialists do not independently talk to the user by default. They provide structured recommendations to a coordinator, which resolves conflicts and produces one coherent action.

## Core product principles

1. **Simple above, sophisticated below.**
2. **One useful next action beats a dashboard.**
3. **The app adapts to life instead of punishing missed plans.**
4. **There is always a smaller successful version of the day when safe.**
5. **The app learns from measured behaviour, not just stated goals.**
6. **Facts, user reports, model inferences, and external evidence are stored separately.**
7. **Safety and user-defined rules outrank AI suggestions.**
8. **Visual, video, audio, charts, maps, body interactions, and controls are preferred when they communicate better than text.**
9. **Chat is a capability, not the main interface.**
10. **No guilt, streak punishment, fake universal health scores, diagnosis, medication dosing, or medical-authority posture.**
11. **The user can always inspect, correct, export, or delete what the app thinks it knows.**
12. **Core guidance must still work if the LLM, wearable sync, or internet is unavailable.**

## Canonical information architecture

The target product shell is:

- **Today** — what matters now and the current session/action.
- **Body** — interactive body map, soreness/pain/tightness, capability, mobility, recovery, and areas needing attention.
- **Progress** — meaningful trajectories across strength, cardio, mobility, balance, consistency, and quality of life.
- **Guide** — natural conversation, explanations, planning, learning, and contextual help.
- **You** — goals, preferences, equipment, health modules, integrations, privacy, data controls, and what the app knows.

The active workout/session becomes an immersive mode rather than another permanent tab.

Old navigation models such as Today / Lift / Log / You are historical references and must not drive new UI work unless explicitly re-approved.

## Long-term operating rhythm

### Daily

The system uses the current day state:

- available time;
- energy;
- soreness/pain;
- recent training;
- recovery;
- sleep/activity/wearable context;
- schedule/life mode;
- equipment/location context;
- goals and personal rules.

It produces one useful recommendation and can shrink, replace, or defer a session without treating the day as failed.

### Weekly

The system checks whole-person coverage rather than rigid calendar compliance:

- push;
- pull;
- squat;
- hinge;
- carry;
- core;
- aerobic work;
- higher-intensity work where appropriate;
- mobility;
- balance/coordination;
- recovery.

It quietly reorganizes the week when life changes.

### Every few weeks

The system progresses or reduces training based on repeated evidence, not a single bad day. It can adjust load, reps, exercise choice, workout length, conditioning, and recovery.

### Every few months

The app reviews real capability and quality-of-life outcomes. It can use normal workout evidence and occasional simple assessments instead of constant formal testing.

### Yearly and multi-year

The app reviews what improved, what declined, what repeatedly causes difficulty, what actually fits the user's life, and what deserves more attention as goals and age change.

Maintenance is a valid outcome. The product must not assume every metric should continuously improve.

## Living personal model

The app should maintain a structured body-and-life profile, not rely on a giant chat transcript.

Categories include:

- goals and current priorities;
- capabilities and performance;
- body status and recurring limitations;
- exercise preferences;
- equipment and environments;
- normal workout duration;
- recovery patterns;
- schedule/life context;
- behaviour/adherence patterns;
- connected-health context;
- health modules and user-approved precautions.

### Memory types

Every stored item is classified as one of:

- **Observed fact** — completed workout, recorded sleep, connected metric.
- **User-reported fact** — "my shoulder feels tight".
- **Preference/rule** — "never schedule over 35 minutes".
- **Inference** — "shorter sessions may improve adherence".
- **External evidence** — source-backed knowledge used for guidance.

Inferences never silently become facts.

## Context-aware modes

The same Guide should handle:

- normal training;
- "I have 10 minutes";
- low energy;
- soreness;
- pain/safety hold;
- travel;
- different gym/equipment;
- outside/walking;
- return after a break;
- maintenance;
- recovery;
- learning an exercise;
- family-friendly movement;
- illness/recovery hold where exercise guidance should be limited;
- user-selected health modules.

## Multimodal experience

The app should choose the best surface for the moment:

- strength: exercise card, large controls, set/rest flow;
- mobility: short looping movement demo;
- cardio: timer, effort/heart-rate guidance;
- walking/outdoor: map/route where available;
- soreness: body map;
- progress: clear charts and capability trajectories;
- education: image/video/illustration;
- hands-free workout: voice;
- discussion/explanation: Guide conversation.

The LLM should usually return structured UI intent, not paragraphs.

## Web and media intelligence

The Guide may retrieve current context, images, videos, routes, weather, articles, and research through explicit tools.

Media trust order:

1. owned/curated Human Health exercise library;
2. approved expert/provider sources;
3. trusted evidence-based external sources;
4. broader web results with visible provenance.

External content must record source, date where relevant, creator/provider, topic, and trust/review status. The app should never randomly substitute a low-quality influencer video into a safety-sensitive flow.

## Professional escalation

The app is a guide, not a replacement for licensed professionals.

It should know when the best next action is to recommend professional assessment and should help the user organize relevant history for that conversation.

High-risk health decisions remain outside autonomous LLM control. The system must not independently diagnose, prescribe medication/insulin, provide emergency monitoring, or clear injuries.

## Personal rules

Users may establish durable rules such as:

- maximum normal workout time;
- exercises to avoid;
- training-day preferences;
- equipment limitations;
- coaching style;
- notification preferences;
- health-related precautions.

These rules are enforced above the LLM and cannot be casually overridden by model output.

## Experimentation and learning

The system may run small, reversible experiments to learn what works for the individual, for example:

- shorter vs longer sessions;
- morning vs evening;
- different cardio modalities;
- exercise substitutions;
- recovery adjustments.

Experiments must be transparent, safe, reversible, and based on user outcomes rather than engagement manipulation.

## Food and recovery

Nutrition should be practical and lightweight by default:

- protein;
- fruit/vegetable intake;
- hydration;
- meal quality;
- recovery nutrition;
- user-selected goals.

The product should not require constant calorie tracking to be useful.

Recovery is multi-signal and may include subjective energy, soreness, recent workload, sleep, recent performance, illness state, and connected metrics. Wearable scores are context, not unquestioned truth.

## Health modules

Optional modules can add condition- or life-stage-aware context without turning the entire product into a medical app. Examples may include diabetes-aware exercise safety context, blood-pressure-aware wellness context, arthritis, previous injuries, pregnancy/postpartum, or aging-related priorities.

Modules remain conservative, transparent, and subject to the product's non-diagnostic boundaries.

## Delight without gamification pressure

The app should feel polished, responsive, visual, calm, and fast.

Use:

- useful animation;
- rich exercise media;
- strong hierarchy;
- immediate feedback;
- progress that reflects capability;
- subtle celebration of completed work;
- short factual coaching.

Avoid:

- streak anxiety;
- shame states;
- fake urgency;
- cartoon coach personas;
- excessive notifications;
- walls of AI text;
- "you're crushing it" filler.

## Success definition

The primary success question is not "did the user keep a streak?"

It is:

**Is this person maintaining or improving physical capability, cardiovascular health, movement quality, recovery, useful habits, and consistency in a way that realistically fits their life?**

Supporting metrics may include:

- useful-action completion;
- recommendation acceptance/override patterns;
- sustainable weekly movement;
- strength/cardio/mobility trajectories;
- pain/safety events;
- return-after-gap success;
- session duration fit;
- user-reported quality-of-life outcomes;
- trust and correction rate for inferred context.

## Treatment of the existing app

Existing implementation is an asset inventory, not a requirement to preserve every current screen.

### Preserve where sound

- local-first/user-owned data;
- workout history;
- exercise knowledge;
- adaptive training rules;
- readiness/recovery logic;
- connected-health provenance;
- import/export;
- safety/privacy controls;
- offline/PWA/native foundations;
- validated low-level utilities.

### Refactor

- navigation;
- Today experience;
- coaching/orchestration;
- progress presentation;
- data/context access patterns;
- exercise runtime presentation;
- optional modules;
- AI integration;
- long-horizon planning;
- onboarding.

### Retire or quarantine if they conflict

- old phase names as user-facing concepts;
- dashboard-first surfaces;
- old Today/Lift/Log/You IA;
- duplicated coaching logic;
- AI limited only to narrative explanation;
- stale roadmap assumptions;
- UI that exposes platform architecture to the user;
- features with no clear value in the Guide-first product.

No old behaviour is kept merely because it already exists.
