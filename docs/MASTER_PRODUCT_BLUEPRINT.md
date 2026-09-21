# Human Health — Master Product Blueprint

## Product promise

Human Health should feel like one simple, delightful Guide that helps a person take care of their whole body and long-term health.

The person should not manage programmes, dashboards, specialist opinions, prompts, or AI systems. The app coordinates that complexity and presents one clear next action.

**North star:** Open → understand what matters → do the next useful thing → see meaningful progress → leave.

## What the product is

A personal body-and-health operating system that grows with the person for years.

On the surface:
- one calm Guide;
- one useful recommendation at a time;
- visual, multimodal interactions;
- simple overrides such as less time, sore, pain, travelling, outside, or low energy;
- meaningful progress rather than streak pressure.

Underneath:
- structured personal context and memory;
- coordinated specialist reasoning;
- deterministic programme logic;
- deterministic health/safety policy;
- trusted exercise/media knowledge;
- optional connected-health and lifestyle context;
- long-horizon planning;
- controlled web/research/media tools;
- graceful offline/no-model fallbacks.

## The invisible specialist team

The Guide may coordinate specialist roles for:
- strength and conditioning;
- cardio/aerobic fitness;
- mobility and movement;
- recovery and sleep;
- nutrition and hydration;
- behaviour and adherence;
- injury/symptom safety;
- research and evidence;
- long-term planning.

Specialists advise. The coordinator resolves conflicts. The application validates. The user experiences one Guide.

## Daily experience

A normal day should take seconds to understand.

Today can combine:
- energy;
- soreness;
- pain or limitations;
- available time;
- recent training;
- sleep/recovery;
- steps/activity;
- equipment/location;
- current goals;
- schedule/life mode;
- connected health when permitted.

The result should be one clear recommendation with one primary action.

Examples:
- 28-minute full-body strength;
- 15-minute recovery walk + mobility;
- 8-minute minimum useful session;
- easy cardio because strength coverage is already sufficient;
- rest/recovery when training would be counterproductive.

Missing a day never breaks the programme. The plan reflows.

## Life-context engine

The system should understand the difference between:
- workday and weekend;
- home, gym, hotel, outdoors, travel;
- normal, busy, ill, return-after-gap, maintenance, recovery;
- 8 minutes versus 45 minutes;
- high versus low energy;
- usual equipment versus temporary equipment;
- normal routine versus major schedule change.

Context should simplify the recommendation, not add dashboard clutter.

## Long-term adaptation

### Daily
Choose the safest useful next action.

### Weekly
Maintain whole-person coverage across strength, cardio, mobility, balance/coordination, movement, recovery, and activity.

### Every 4–8 weeks
Adjust workload, exercises, progression, variety, and recovery based on repeated evidence.

### Quarterly
Review capability and quality-of-life signals.

### Annually
Review what improved, what declined, what stayed stable, and what priorities should change.

### Multi-year
Support maintenance, aging, changing goals, injuries, life stages, travel, interruptions, and different levels of ambition without forcing the person to restart programmes.

Maintenance is a valid success state.

## Personal model and memory

Do not use a giant chat transcript as memory.

Maintain structured records for:
- observed facts;
- user-reported facts;
- preferences;
- explicit personal rules;
- inferred patterns;
- external evidence;
- goals and priorities;
- equipment/environments;
- body state;
- training history;
- capability trends;
- adherence patterns;
- life modes.

Inferences never silently become facts.

The user must be able to inspect, correct, disable, export, and delete what the system believes it knows.

## Behaviour intelligence

Learn what actually helps the person succeed.

Examples:
- sessions over 35 minutes are frequently skipped;
- lunchtime sessions are completed more often than evenings;
- cycling is preferred to treadmill work;
- a particular exercise is repeatedly disliked;
- shorter sessions improve consistency during busy periods.

Use this to simplify future plans rather than increase reminders or guilt.

## Small experiments

The Guide may propose small, transparent, reversible experiments when useful:
- shorter sessions;
- different workout timing;
- a new cardio modality;
- alternate exercise selection;
- slightly different weekly distribution.

Experiments must:
- have a reason;
- be reversible;
- avoid unsafe medical experimentation;
- use repeated evidence before becoming a durable preference.

## Visual and multimodal experience

Chat is only one surface.

Use the best interface for the task:
- workout → exercise card + set controls;
- mobility → short loop/video + timer;
- cardio → timer/effort/heart-rate view;
- outdoor session → route/map;
- soreness/pain → body map;
- progress → chart/trajectory;
- learning → trusted image/video;
- evidence question → source/evidence card;
- active session → voice/hands-free controls;
- completion → concise visual summary.

The app should not feel like a text terminal.

## Trusted web, research, media, and tools

When external context is useful, retrieve it through controlled adapters.

Trust order:
1. owned/curated content;
2. approved expert/provider;
3. trusted evidence source;
4. broader web with visible provenance.

External content should retain source, date/freshness, provider, and relevance metadata where appropriate.

The user should see the useful result, not the search process.

## Food and nutrition

Nutrition should remain practical and low-friction.

Default focus:
- protein;
- fruits and vegetables;
- hydration;
- meal quality;
- recovery nutrition;
- user-selected goals.

Do not require constant calorie tracking for ordinary value.

Optional meal-photo guidance can help identify broad meal composition and practical next actions, but must not imply diagnostic certainty or exact nutrient measurement from an image.

## Professional escalation

The Guide must know when AI coaching is not enough.

Valid outcomes include:
- continue normally;
- modify activity;
- rest/recover;
- monitor and reassess;
- seek a physiotherapist or other qualified professional;
- seek medical assessment;
- urgent/emergency guidance where appropriate to a pre-defined safety policy.

The app should be able to organize relevant user-controlled history for professional discussion without claiming diagnosis.

## Health-condition modules

Health modules are optional, permissioned context layers, not the identity of the product.

Possible modules include:
- diabetes;
- hypertension;
- arthritis;
- pregnancy/postpartum;
- previous injury;
- age-related priorities;
- other validated contexts.

For diabetes, glucose context may inform conservative exercise-safety guidance, but the system must not independently prescribe insulin, medication, or treatment carbohydrate decisions.

## Safety hierarchy

1. emergency/symptom policy;
2. health-condition policy;
3. explicit personal rules;
4. deterministic programme rules;
5. validated specialist recommendations;
6. model-generated explanation/presentation.

The LLM never outranks safety.

## Graceful degradation

Core usefulness must survive:
- LLM outage;
- internet loss;
- web/media provider failure;
- missing wearable data;
- stale connected-health data;
- tool timeout;
- unsupported device capability.

Recent programme state, trusted exercise knowledge, deterministic safety, and a useful fallback session should remain available.

## Delight principles

Delight means reducing friction, not adding gimmicks.

Prefer:
- immediate comprehension;
- beautiful, useful media;
- strong hierarchy;
- large touch targets;
- satisfying completion;
- short meaningful animation;
- useful haptics;
- calm voice guidance;
- progressive disclosure;
- fast transitions;
- easy undo/override;
- respectful language.

Avoid:
- guilt;
- fake praise;
- streak punishment;
- confetti for trivial actions;
- unreadable dashboards;
- AI typing theatre;
- mascots unless intentionally justified;
- forcing chat when a control or visual is better.

## Accessibility and aging

The product should remain usable for decades.

Support:
- screen readers;
- keyboard navigation;
- large tap targets;
- text scaling;
- high contrast;
- reduced motion;
- captions/transcripts;
- voice alternatives;
- reduced dexterity;
- phone, tablet, desktop, and applicable wearable surfaces.

## Success model

Do not optimize primarily for streaks or time-in-app.

Track whether the product helps people:
- maintain or improve strength;
- maintain or improve cardio/aerobic capacity;
- preserve mobility and balance;
- remain physically capable;
- recover appropriately;
- fit movement into real life;
- reduce unnecessary decision load;
- return successfully after interruptions;
- understand meaningful progress;
- keep using the product because it remains useful.

The best session is not the longest session. The best app outcome is not more app usage. The goal is better long-term capability and health-support behaviour.

## Refactor rule

The existing application is an implementation inventory, not the product specification.

For every current subsystem classify:
- Preserve;
- Adapt;
- Replace;
- Quarantine;
- Retire.

Preserve proven data, safety, programme, connected-health, offline, and exercise foundations where they align.

Replace old IA, dashboards, roadmap assumptions, or feature visibility when they conflict with the Guide-first experience.

Do not delete first. Do not keep something simply because it already exists.

## Canonical delivery sequence

1. Inventory and migration map.
2. Guide-first shell and Today.
3. Context, memory, personal rules, and trust controls.
4. DeepSeek-first provider-agnostic orchestration.
5. Deterministic programme, safety, escalation, and fallback.
6. Body experience.
7. Multimodal UI, trusted media, web/research/tool adapters.
8. Long-term adaptation and behaviour learning.
9. Optional nutrition/recovery/health modules.
10. Voice, camera/movement support, contextual outdoor/travel experiences.
11. Full migration, privacy, accessibility, offline, security, QA, performance, and rollback gate.

No merge or production deployment without separate explicit approval.
