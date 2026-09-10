# Agent Handoff — Human Health (`camster91/human-health`)

**Product:** Human Health — calm whole-human fitness coach PWA. Apple / Hevy density bar. Adult terse tone. Local-first.
**Live:** https://health.ashbi.ca (Ashbi VPS). **Ship gate = VPS verify**, not GitHub Actions.
**Owner:** Cameron (camster91)
**Last updated:** 2026-09-10

## Status

- Live and shipping polish / integrity; still **below** Apple/Hevy visual bar.
- Keep-shipping **paused** until Cameron asks to resume (Cursor usage / billing).

## Read first

1. `docs/END_TO_END_SHIP_PLAN.md`
2. `docs/implementation-roadmap.md`
3. This file
4. Open GitHub issues (P0/P1 integrity + UX epics #128–#130)

## Recent ships (2026-09-10)

- #137–#140 visual / phone density · #138–#139 GlitchTip · #141 connected-health fail-closed
- #142 training storage fail-closed · #143 pain/illness prescription regression (#89) · #144 delete-all domains (#88)
- Live SHA was `865995c2` after #144 (confirm with Infra / VPS before assuming)

## Next agent track (when Cameron resumes)

Prefer **P0/P1 integrity** then visual bar:

1. Remaining connected-health P1s (#99–#112) — fail-closed / quarantine / freshness
2. P0 leftovers if any still open after #88/#89
3. UX density toward Hevy/Apple (Today / Lift / Log / You) — epics #128–#130; use Dribbble refs / attached PNGs (Figma MCP broken)

## Do NOT do without Cameron

- App Store / Play as ship gates for this trio (PWA on VPS for now)
- Inventing medical claims / diagnosing
- Soft baby-talk coach voice
- Third-party SaaS when Ashbi VPS self-host is preferred
- Agency BD

## Rules

- GitHub Actions ≠ ship gate
- After merge, ask Infrastructure to deploy `health.ashbi.ca` and confirm live SHA
- World-class bar — Cameron rejected thin/empty UI before
