# Phase 2 final review

## Decision

Phase 2 is **feature-complete in source on PR #52**, but it is **not yet verified for release**.

The remaining work is evidence gathering and release QA, not missing planned Phase 2 product capability. PR #52 must remain unmerged until Cameron explicitly approves that merge. Production deployment remains a separate approval.

## 1. Completed and source-reviewed

### Adaptive strength runtime

- Rolling Upper A / Lower A / Upper B / Lower B sequence independent of weekdays
- Explicit complete, end-early, abandon, pause, interrupted, resume, defer, and optional-add flows
- Required working sets are separated from warm-ups and optional additions
- Ended-early and deferred work remain visible for truthful partial-session accounting
- Short-on-time, low-energy, different-gym, equipment-unavailable, travel, return-to-training, and maintenance adaptations
- Manual next-session choice and one-time skip without falsely completing a workout

### Exercise graph and gym flexibility

- Versioned starter program
- Exercise metadata for movement, muscles, equipment, stability, fatigue, skill, unilateral status, and load type
- Ranked substitutions by movement intent, equipment, fatigue, skill, stability, and saved gym preference
- Independent history for each exercise variation
- Mid-workout substitutions preserve completed sets and remaining work

### Workout coaching and safety guardrails

- Deterministic double-progression baseline
- Previous-performance comparison using working sets only
- Pain, poor form, reduced readiness, long gaps, life mode, and recent hard-cardio load can hold progression
- A reduced-readiness user can explicitly retain original set volume while progression remains paused
- Pain or illness recovery-first constraints are not presented as medical clearance
- Bodyweight work progresses by variation or added load rather than invented machine-equivalent weight

### Whole-person fitness

- Strength, cardio, mobility, core, bodyweight, balance, power, movement, recovery, and consistency domains
- Configurable planned-cardio target with moderate-equivalent minutes
- Planned cardio separated from incidental daily movement
- Recovery, steady aerobic, interval, and short-finisher options
- Cross-domain fatigue coordination between lower-body strength, hard cardio, and power work
- Structured core and mobility progressions
- Pull-up, chin-up, push-up, dip, and hang skill trees with assistance/load/test-condition history
- Athletic balance/jump progression based on repeated comparable assessments
- Minimum-effective-day plans that fit available time and equipment
- Short strength doses remain partial and do not count as full strength sessions

### Capability and data ownership

- Separate capability measures rather than one universal medical health score
- Strength, cardio, recovery, consistency, and periodic-assessment trends
- Repeatable benchmark conditions are retained for comparison
- Local-first persistence with versioned JSON export
- Explicit warning states when browser storage cannot persist data
- Destructive local deletion requires confirmation and does not clear the in-memory view when browser deletion fails

### PWA foundation

- Static Next.js export
- Install manifest with 192px, 512px, maskable, and Apple touch icons
- Versioned service-worker cache and offline fallback
- Valid response returned for uncached asset failures while offline
- Offline/network/storage status messaging
- Rest timer survives interruption and supports pause, resume, extend, restart, and skip
- Screen Wake Lock release/reacquisition logic is feature-detected and fails gracefully
- Committed PWA icons are checked directly; builds no longer mutate source files to generate them
- Mobile safe-area support and reduced-motion handling

## 2. Review findings corrected during final review

- Removed superseded dashboard components and split large UI responsibilities into maintainable panels
- Fixed an invalid whole-person import and synchronized new assessments with capability trends
- Fixed assisted-skill comparison so lower assistance can represent progress when test conditions match
- Required comparable athletic benchmark conditions before level changes
- Added trend-aware readiness so repeated recent strain can keep progression conservative
- Added a safe reduced-readiness volume override without re-enabling load progression
- Added exercise defer and optional-add controls for unpredictable workouts
- Preserved split substitution work in completion and activity-quality accounting
- Prevented invalid zero-rep/negative-load set entries
- Improved bodyweight load display and recommendations
- Replaced greedy plate loading with an exact-combination calculator
- Fixed editable comma-separated plate denominations
- Corrected local-storage deletion success reporting
- Hardened offline service-worker responses
- Added `.gitignore` and corrected README links/instructions

## 3. Source-level verification assets

Tests now cover the principal deterministic engines:

- workout adaptation and progression
- exercise graph and substitutions
- workout state/accounting
- rolling scheduling and partial sessions
- rest-timer interruption behaviour
- storage and preferences
- readiness and trend-aware coaching
- cardio and cross-domain load management
- bodyweight skill progression
- athletic progression and comparable tests
- capability trends
- PWA asset checks

These tests exist in source. They have not yet completed on a runner for the current head.

## 4. Blocked verification

The current GitHub Actions job targets `[self-hosted, Linux, X64, ashbi-vps]` and is queued without a runner assignment. Earlier `ubuntu-latest` attempts failed before any workflow step started. This is tracked by issue #51.

Therefore the following are still unverified:

- dependency installation
- TypeScript typecheck
- unit-test execution
- production build/static export
- PWA static check against `out/`
- offline navigation and interruption recovery in a real browser
- PWA installation on representative Android/iOS-supported browsers
- Screen Wake Lock, notification, and vibration behaviour on supported/unsupported devices
- representative mobile, tablet, desktop, keyboard, focus, contrast, and one-handed workout QA
- static deployment and rollback rehearsal

## 5. Release boundary

Phase 2 can be described as **source-complete** now. It can be described as **verified complete** only after:

1. A runner executes install, typecheck, unit tests, build, and PWA checks successfully.
2. Any resulting code failures are fixed and the gate passes again.
3. Representative browser/device QA passes.
4. Offline/PWA interruption and cache-update behaviour passes.
5. Deployment and rollback are rehearsed outside production.
6. PR #52 receives explicit merge approval.

Production deployment requires a separate explicit approval even after the above gates pass.

## 6. Deferred beyond Phase 2

The following are intentionally later lifecycle work rather than Phase 2 blockers:

- user accounts and multi-device cloud sync
- import/restore UI for exported backups
- Health Connect, Apple Health, and wearable adapters
- nutrition, sleep-device, preventive-health, and clinician-facing features
- camera-based technique analysis
- medical diagnosis, medication/insulin dosing, injury clearance, and emergency triage authority
- physical plate inventory quantities beyond denomination-based calculations
