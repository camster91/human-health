# Phase 1 QA matrix

## Mobile

- 360–430px width: Today, workout, Progress, Coach
- One-handed set logging and 44px+ interactive targets
- No horizontal scrolling
- Keyboard/numeric input does not hide primary action
- Screen refresh does not lose active workout

## Tablet

- 768–1024px layout remains readable without over-stretching controls
- Bottom navigation and workout controls remain reachable

## Desktop

- Content remains constrained to a comfortable reading/training width
- Keyboard focus is visible
- Forms and buttons remain operable without touch

## Accessibility basics

- Semantic headings and form labels
- Sufficient contrast for primary text/actions
- Visible focus states via browser defaults
- Reduced-motion preference respected
- Status is communicated with text, not colour alone

## Functional

- Start each of four sessions
- Log all sets and finish
- End early without losing completed work
- Reload mid-workout
- Use 20/30-minute adaptation
- Switch to commercial gym
- Use low-energy adaptation
- Swap an exercise
- Verify prior performance on next session
- Verify progression message
- Verify plate calculator
- Verify history and coach summary
- Verify offline cache after initial load

## Known pre-merge verification requirement

The repository connector can create and review source but cannot execute the Node build in this session. `npm ci`, typecheck, tests, production build, and browser/device QA remain required before merge/deploy.
