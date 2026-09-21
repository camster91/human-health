# #148 — Guide-First Shell and Today: Implementation Plan

Status: **implementation plan** (not implemented). Derived from `docs/GUIDE_FIRST_MIGRATION_MATRIX.md` §2, §14 and the actual source of `app/human-health-app.tsx`.

Issue #148 acceptance:

1. Today / Body / Progress / Guide / You shell, with session as an immersive mode.
2. Old `today`/`lift`/`log`/`you` no longer the target shell.
3. Today renders **without AI or internet**.

Hard rule from the mission: **do not delete old code in #147.** For #148, the legacy shell stays reachable behind a feature flag until the new shell passes QA (#30, #42).

---

## 1. What must be extracted before the shell is replaced

`app/human-health-app.tsx` currently mixes three concerns. Extraction order matters so both shells can coexist.

### 1.1 Extract (React-free or thin-React) — behaviour that must not be rewritten

| Concern | Current location | Target module | Notes |
|---|---|---|---|
| Workout start / adapt / progression gating | `startWorkout()` (lines ~150–215) | `lib/session/start-workout.ts` | Wraps `contextualRollingSession`, `strengthLoadAdjustment`, `adaptWorkout`, `buildSession`. Must stay pure/deterministic. |
| Set logging + pain handling | `logSet()` | `lib/session/log-set.ts` | Pain flag must set `progressionAllowed=false` exactly as today. |
| Substitution / deferral / add-exercise | `selectSwap`, `toggleDeferred`, `addExercise` | `lib/session/edit-workout.ts` | Preserves `originalId` split semantics and `optional` flags. |
| Finalization | `finishWorkout()` | `lib/session/finalize-workout.ts` | Delegates to `workoutActivityDoses`, `summarizeWorkout`, `store` journal. Existing `workout-finalization.ts` + `storage.ts` already provide idempotency; do not duplicate. |
| Pause/resume/interruption | `pauseWorkout`, `resumeWorkout`, hydration `interrupted` mapping | `lib/session/lifecycle.ts` | `paused`/`interrupted`/`active` state machine. |
| Rest timer + wake lock + notify/vibrate effects | `useEffect` blocks | `lib/session/use-rest-timer.ts`, `lib/session/use-wake-lock.ts` | Currently inline; wake lock is #47 territory — extract without changing behaviour. |
| Readiness chips | Today JSX inline handlers | `lib/session/readiness-checkin.ts` + shared component | Four chips map to `readinessDecision` inputs already defined. |
| Preferences save + normalization | `savePreferences()` | reuse `preferences.ts`; thin hook | Keep `selectedGymId` validation. |

### 1.2 Keep as-is (no rewrite)
`store`, all `lib/` engines, `lib/coaching/engine.ts` snapshot, `lib/connected-health/*`, `lib/platform/*`.

### 1.3 Retire from the new shell (still present in legacy shell)
- `useState<'today'|'log'|'progress'|'settings'>` tab model.
- `bottom-nav` with `today-*`/`lift-*`/`log-*`/`you-*` icons.
- Today-as-dashboard composition (metrics-row + readiness card + adjust-plan + whole-person dashboard + mind reflection + skills, all stacked).

---

## 2. Target shell

Five primary surfaces + immersive session mode:

```
Today | Body | Progress | Guide | You
```

### 2.1 Navigation
- Replace the 4-column bottom nav with 5 columns. `globals.css` `.bottom-nav { grid-template-columns: repeat(4,1fr) }` → `repeat(5,1fr)`. Verify ≥44px targets at 320px width (5 × 44 = 220px + padding fits; label font may need to drop to `.66rem` under 380px, matching existing `@media(max-width:380px)` rule).
- Icons: reuse `icon-component.tsx` `Icon`. Add canonical icon assets:
  - `public/icons/body-*.svg`, `progress-*.svg`, `guide-*.svg` (new)
  - `today-*` (reuse), `you-*` (reuse)
  - `lift-*`/`log-*` become Retire-with-legacy-shell (kept in the repo, not used by the new nav).
- Session is **immersive**: when a workout is active, render the session view full-screen with **no** bottom nav (current code already does this: `if (active) return <main className="workout-shell session-view">`). Preserve that pattern.

### 2.2 Today (must render offline, no AI, no network)
Composition, in order:

1. **Hero**: one recommendation — session name, duration, intensity, **one-sentence reason**, one large Start button. Data: `contextualRollingSession(history, mode, override, readiness)` + `strengthLoadAdjustment` + `latestReadiness`. Offline-safe: pure local.
2. **Context actions** (small chips, one tap, no typing): *I have less time · I'm sore · Something hurts · Change equipment · Ask Guide*.
   - "less time" → `startWorkout({minutes:20|10})`; "sore" → readiness `soreness:high`; "Something hurts" → readiness `pain:true` (routes to recovery hold); "Change equipment" → gym/equipment picker; "Ask Guide" → Guide surface (degrades to deterministic answer with no model).
3. Progressively disclosed secondary content only if the user opens it (not stacked dashboard cards).

Hard requirements:
- No import of any model client on this path; no `fetch`; no `window.HumanHealthCoachAI` call.
- Must render with `navigator.onLine === false`.
- Must render before hydration as a useful shell (current code returns a "Loading your local training data…" card; the new shell must show at least the Today skeleton, not a bare spinner).

### 2.3 Body / Progress / Guide / You (stubs in #148, deepened in #152/#154/#150/#155)
Each must exist as a route/surface with a truthful placeholder: Body → "Body map coming in #152" is acceptable **only** if the surface does something deterministic (e.g. Body shows current readiness + recently trained areas from history). Do not ship empty placeholder shells.

---

## 3. PWA coupling (must change in the same commit)

`public/sw.js` `CORE` and `scripts/check-pwa.mjs` currently hardcode `/health/`, `/coach/`, `/platform/`.

Prepared change when new routes are added (example route names):

```js
const CORE = ['/', '/body/', '/progress/', '/guide/', '/you/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/offline.html'];
```

and in `scripts/check-pwa.mjs`:

```js
if (root === 'out') required.push('index.html', 'body/index.html', 'progress/index.html', 'guide/index.html', 'you/index.html');
...
for (const route of ["'/body/'", "'/progress/'", "'/guide/'", "'/you/'"]) {
  if (!serviceWorker.includes(route)) throw new Error(`Service worker is missing route ${route}.`);
}
```

**Do not** simply delete the `/health/`, `/coach/`, `/platform/` assertions while those routes still exist. If the legacy routes are kept behind a flag, keep their assertions too until they are removed.

Also update `public/manifest.webmanifest` `description` (currently training-only) and `shortcuts` (currently Today/Log).

---

## 4. Feature flag for coexistence

Introduce a single migration gate (e.g. `localStorage['human-health:shell'] = 'legacy' | 'guide'`, default `guide`, overridable by a `?shell=legacy` query param for internal QA). The legacy `HumanHealthApp` stays fully functional behind `legacy`. The flag is temporary and must be removed in #157 after migration completes (no permanent duplicate product experience).

---

## 5. Verification required for #148 (not yet run)

```bash
npm run verify        # typecheck + test + build + check:pwa
```

Plus manual/QA evidence:
- Phone (≤430px), tablet, desktop layouts.
- Offline: `navigator.onLine=false` → Today renders a deterministic plan.
- Keyboard: all nav + context chips reachable, visible focus (`:focus-visible` already defined).
- Screen reader: nav has `aria-label="Primary"`, active surface exposed.
- Reduced motion: existing `@media(prefers-reduced-motion:reduce)` rule covers transitions.
- Rollback: `?shell=legacy` renders the legacy app.

## 6. Rollback notes

- Legacy shell remains in the tree and reachable via flag.
- No data schema change in #148 (Today reads existing keys only).
- Reverting #148 is reverting the shell route + nav + PWA CORE change; no data migration to undo.
