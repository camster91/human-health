# Guide-First Architecture

This is the target technical model for Human Health after the product reset.

## Architecture principle

**The LLM reasons. Deterministic systems constrain. The UI renders structured intent.**

Do not let a model directly control safety-critical behaviour or make the product depend on free-form text generation.

## System layers

```text
Human
  ↓
App shell / multimodal UI
  ↓
Context Engine
  ├─ body profile
  ├─ recent history
  ├─ goals + personal rules
  ├─ life context
  ├─ equipment/location
  ├─ connected health
  └─ current session state
  ↓
Guide Coordinator
  ├─ model gateway (DeepSeek-first, provider-agnostic)
  ├─ specialist roles
  └─ tool selection
  ↓
Deterministic Programme Engine
  ↓
Safety / Policy Engine
  ↓
UI Composer
  ↓
Cards • video • body map • charts • voice • maps • actions • short text
```

## Model gateway

DeepSeek can be the preferred model backend, but product code must call an internal model interface rather than DeepSeek directly.

The gateway should support:

- provider/model selection;
- structured-output validation;
- retries/timeouts;
- privacy/consent checks;
- context budgeting;
- tool permissions;
- redaction;
- audit/provenance;
- offline/no-model fallback.

This prevents product architecture from being tied to one vendor.

## Coordinator

The Guide Coordinator owns the final recommendation. Specialist outputs are advisory.

Inputs:

- current user state;
- relevant long-term facts;
- current program state;
- specialist recommendations;
- safety constraints;
- available tools;
- applicable user rules.

Outputs should be typed data, for example:

```json
{
  "intent": "today_plan",
  "summary": "Upper body + easy cardio",
  "durationMinutes": 28,
  "reason": "Legs are still recovering",
  "actions": [],
  "ui": []
}
```

Do not use free-form model text as the source of truth for training state.

## Specialist roles

Initial roles:

- Strength
- Cardio
- Mobility/Movement
- Recovery/Sleep
- Nutrition/Hydration
- Behaviour/Adherence
- Safety
- Research/Evidence
- Long-term Planning

They can initially be prompt roles over the same model. Separate model calls/services are only justified when quality, latency, privacy, or cost evidence supports it.

Each specialist returns a small structured result:

- recommendation;
- reason;
- evidence/context used;
- risk/contraindication flags;
- confidence;
- uncertainty;
- requested tools.

## Deterministic programme engine

The programme engine remains authoritative for:

- exercise eligibility;
- progression limits;
- volume/load bounds;
- recovery constraints;
- scheduling/coverage;
- equipment compatibility;
- current program state;
- immutable workout history;
- approved substitutions;
- minimum-effective-day construction.

The LLM can propose changes, but the engine validates them.

## Safety / policy engine

Safety must be model-independent.

It can block or modify actions based on:

- pain/symptom flags;
- injury restrictions;
- illness/recovery state;
- health-module rules;
- user-defined precautions;
- medication/dosing boundary;
- emergency-risk language;
- unsupported claims;
- stale/insufficient data;
- age/life-stage rules where appropriate.

The model may explain a safety result but cannot override it.

## Context Engine

The Context Engine should provide the minimum relevant context needed for each action.

Sources may include:

- training history;
- current weekly coverage;
- exercise performance;
- body map state;
- schedule/life mode;
- equipment;
- recent sleep/activity;
- user-entered nutrition/hydration;
- connected-health data;
- previous Guide decisions;
- preferences;
- personal rules;
- experiments;
- external evidence already approved/cached.

Avoid sending the entire user history to the model.

## Memory model

Store memory as structured records with provenance.

Suggested types:

- observed;
- user_reported;
- preference;
- rule;
- inference;
- external_evidence.

Each record should support:

- createdAt;
- lastConfirmedAt;
- confidence where applicable;
- source;
- expiry/freshness where applicable;
- supersedes/contradicts;
- user-editable flag.

Inferences should be easy to inspect and correct.

## Tool layer

The Guide can call tools through explicit permissions.

Possible tools:

- exercise knowledge/media;
- research search;
- web search;
- image/video search;
- weather;
- maps/routes;
- health adapters;
- calendar/context adapters;
- camera/movement analysis later;
- voice/speech;
- export/share.

Tools return structured evidence. The LLM should not scrape arbitrary content directly when a trusted adapter exists.

## Trusted media pipeline

Every external media item should record:

- source URL/provider;
- creator;
- title;
- date where relevant;
- media type;
- exercise/topic;
- difficulty;
- equipment;
- review/trust status;
- safety notes;
- licence/usage metadata when stored.

Prefer curated media. Broader web media should be presented with provenance and should not silently become the canonical exercise demonstration.

## UI Composer

The model produces UI intent, not HTML.

Supported block types can include:

- today_hero;
- exercise_card;
- set_logger;
- rest_timer;
- short_video;
- image_guide;
- body_map;
- chart;
- route_map;
- checklist;
- comparison;
- explanation;
- warning;
- professional_escalation;
- voice_step;
- completion_summary.

The app decides how blocks render so accessibility and design remain deterministic.

## Daily State

Create a canonical DailyState object containing, where available:

- available time;
- energy;
- soreness;
- pain/symptom state;
- sleep;
- recent training load;
- readiness signals;
- movement/steps;
- life mode;
- equipment;
- location/environment context;
- schedule constraints;
- active goals;
- personal rules;
- current plan state.

This gives every specialist a consistent starting point.

## Long-horizon planner

Maintain multiple timescales:

- today;
- rolling week;
- 4–8 week adaptation;
- quarterly capability review;
- annual priorities;
- multi-year maintenance/aging strategy.

The planner should allow "maintain" as a deliberate state and should not chase perpetual metric growth.

## Evidence and trust

For any consequential recommendation, retain enough information to answer:

- Why did the app suggest this?
- What data did it use?
- Which part came from a rule?
- Which part came from model reasoning?
- Was external evidence used?
- Was anything uncertain?
- What would change the decision?

The user-facing explanation can stay one sentence; deeper provenance should be available on demand.

## Graceful degradation

The core product must remain useful if:

- the model provider is unavailable;
- internet is offline;
- wearable data is stale;
- web/media search fails;
- a native bridge is unavailable.

Fallback order:

1. validated local/deterministic plan;
2. cached trusted content;
3. simplified local UI;
4. clear unavailable state without inventing data.

## Privacy model

Default to local-first storage for personal history.

Before sending sensitive context to a remote model:

- determine what is actually necessary;
- apply user consent/settings;
- redact unnecessary identifiers;
- log which context class was shared;
- do not send raw exports when summarized context is enough.

The user must be able to inspect and delete AI memory independently of immutable workout history where technically practical.

## Camera and movement analysis

This is a later capability, not an MVP dependency.

Allowed direction:

- rep counting;
- tempo;
- approximate range of motion;
- simple movement cues.

Do not claim injury diagnosis, clinical movement assessment, or medical clearance from camera analysis without a separate validated and reviewed product scope.

## Professional escalation

Escalation is a first-class result type, not a failure.

The Guide should be able to say:

- stop/avoid the planned action;
- this is outside fitness guidance;
- consider qualified assessment;
- here is a concise history you can bring to the professional.

## Observability

Track product quality without leaking sensitive health content.

Useful telemetry:

- structured-output failures;
- safety blocks;
- fallback rates;
- tool latency/error;
- recommendation override;
- media failure;
- stale-data frequency;
- user correction of inferences.

Avoid logging raw health conversations or sensitive payloads by default.
