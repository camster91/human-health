## Summary

Describe the bounded change and why it is needed.

## Scope

- In scope:
- Out of scope:
- Product/safety boundaries affected:

## Verification evidence

Record only checks that actually ran. Do not mark queued or unavailable checks as passed.

- [ ] `npm run verify`
- [ ] Relevant focused tests
- [ ] Mobile QA (~390 px), when UI is affected
- [ ] Tablet QA (~768 px), when UI is affected
- [ ] Desktop QA (~1440 px), when UI is affected
- [ ] Keyboard/focus/accessibility basics, when UI is affected
- [ ] Offline/PWA/update/interruption checks, when applicable
- [ ] Storage/import/export/delete/rollback checks, when applicable

Evidence/results:

## Safety, privacy, and data integrity

- [ ] No diagnosis, medication/insulin dosing, treatment-carbohydrate calculation, emergency monitoring, or injury-clearance behaviour was introduced.
- [ ] No secrets, real private health data, or production credentials were added.
- [ ] Local data/provenance/explicit-sharing boundaries remain intact where applicable.
- [ ] Failing tests or safety gates were not weakened merely to obtain green CI.

## Deployment and rollback

Production status: **Not deployed unless separately and explicitly approved.**

- Deployment impact:
- Rollback/compatibility impact:
- Data migration required: Yes / No

## Handoff

Use the repository status model:

1. Completed and verified
2. Completed but awaiting verification
3. In progress
4. Blocked
5. Awaiting client or teammate
6. Next action

Remaining risks/blockers:

Next action:
