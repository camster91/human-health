# AGENTS.md — Human Health

Operational notes for AI agents. Product ship status: **`docs/AGENT_HANDOFF.md`** and **`docs/END_TO_END_SHIP_PLAN.md`**.

## Product

- PWA SaaS on Ashbi VPS: https://health.ashbi.ca
- Bar: Apple / Hevy density, adult terse coach, local-first
- Verification: **VPS**, not GitHub Actions

## Commands

See `package.json` / README. Prefer existing test scripts (`npm test`, etc.).

## Rules

- Fail closed on corrupt training / connected-health data
- Pain/illness flags must not prescribe exercise
- Delete-all must clear every local domain
- After merge: request Infra deploy + confirm live SHA
- Keep-shipping may be paused — check `docs/AGENT_HANDOFF.md`
