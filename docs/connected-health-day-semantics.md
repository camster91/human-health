# Connected-health day semantics

Status: source policy for the final independent review.

## Current rule

Human Health's **daily** connected-health surfaces use the **current browser/device local calendar day** for observation instants.

This rule applies consistently to same-day totals and rolling day buckets such as:
- steps
- distance
- active energy
- hydration
- protein
- fibre
- fruit/vegetable servings
- meal-quality daily aggregation
- connected-health daily trend buckets
- habit streak/coverage days

The shared implementation is `lib/connected-health/local-day.ts`.

## Why

The PWA's "today" experience is a current-device dashboard. When the user travels or changes timezone, the dashboard follows the calendar day of the device they are currently using instead of silently mixing source-local and device-local calendar definitions.

This is a presentation/grouping rule only. It is not a medical interpretation.

## Provenance is preserved

Human Health does **not** rewrite source timestamps to make them fit the current day. Original observation times, provider/source identity, and optional `timezoneOffsetMinutes` remain part of the connected-health record/provenance.

A source-local historical-day view could be added later, but it must be explicitly labelled and must not silently replace the current-device rule.

## Sleep is different

Sleep is grouped as a sleep **period/session**, not as a same-calendar-day habit total. Sleep can cross midnight naturally. Detailed sleep stages are grouped near the latest sleep period and overlapping intervals are merged; they are not forced into the daily habit bucketing rule.

## Travel and DST

JavaScript's browser-local `Date` calendar fields define the current-device day boundary, including the browser's current timezone/DST rules. Source offsets remain provenance.

Release QA must still exercise:
- a late-night observation before local midnight
- an observation immediately after local midnight
- a timezone change/travel scenario
- a DST transition on a representative browser/device
- overnight sleep spanning a calendar boundary

## Non-goals

This policy does not:
- infer the user's home timezone
- infer a provider's preferred timezone
- change health-data timestamps
- combine unlike providers
- make diagnosis, treatment, medication/insulin, emergency-monitoring, or injury-clearance decisions
