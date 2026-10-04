# Human Health

A calm, local-first fitness coach that tells you what to train today, adapts to how you feel, and keeps your data on your device.

**Live app:** [health.ashbi.ca](https://health.ashbi.ca) (installable PWA, works offline)

## What it does

Most fitness apps either hand you a static program or bury you in dashboards. Human Health opens on one screen, **Today**, with the next session it recommends, a quick check-in (Ready, Flat, Sore, Peak), and simple ways to adjust the plan when life gets in the way. Behind that screen, deterministic training, recovery and load-management logic decides what to suggest, and recommendations come with plain-language explanations.

Everything is stored locally in the browser. There is no account and no server-side database, and you can export, restore or delete all of your data at any time.

Human Health is a fitness and wellbeing tool, not a medical product. It does not diagnose, treat or monitor any condition, and pain or illness check-ins never trigger an exercise prescription.

## Features

- **Adaptive training:** a 4-day upper/lower split with progression, plateau detection and deload suggestions based on your history and recovery.
- **Readiness check-ins:** one-tap Ready / Flat / Sore / Peak check-ins that shape the session you get.
- **Flexible sessions:** 20 or 30 minute versions, a low-energy option at reduced volume, and a travel mode for hotel gyms.
- **Gym profiles:** choose the equipment you have and exercise selection follows it.
- **Focused workout mode:** an immersive set logger with a rest timer, add-exercise, pause/resume and recovery from interrupted sessions.
- **Progress and history:** lift progress, a weekly log, capability trends and skill progressions.
- **Whole-person context:** recovery, movement and mobility assessments, fuel and soft habits, and short mind reflections, without a single "health score".
- **Connected health (optional):** import an Apple Health export file, parsed entirely on-device, with source provenance, freshness rules and per-source deletion.
- **Data ownership:** full archive export and import with validation, and a complete local wipe. The app fails closed on corrupt data instead of guessing.
- **Offline-first PWA:** service worker caching, an offline page and an installable manifest.

## Tech stack

- [Next.js](https://nextjs.org/) 15 (static export) and React 19
- TypeScript
- Vitest for unit tests
- Service worker and Web App Manifest for offline and install support
- Browser LocalStorage for persistence (no backend)
- Optional Sentry error reporting, only enabled when a DSN is configured

## Getting started

Requires Node.js 22 and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional settings are read from environment variables; `.env.example` lists the names. The app runs fully without them.

Production-style build:

```bash
npm run build        # static export to out/
npm run start        # serves out/ locally
```

## Testing

```bash
npm run typecheck    # TypeScript
npm test             # Vitest unit tests
npm run check:pwa    # PWA manifest and asset checks
npm run verify       # all of the above plus a production build
```

The same checks run in GitHub Actions on every push and pull request.

## Project structure

```
app/                   Today, workout mode, progress, log, settings, health and coach views
lib/                   Training engine, program, load management, readiness, storage and validation
lib/coaching/          Session planner and plain-language explanations
lib/connected-health/  Apple Health import, metric merging, freshness, portability and deletion
lib/platform/          Long-horizon capability models and export
public/                Icons, illustrations, manifest and service worker
scripts/               Static server, PWA checks and icon generation
docs/                  Product, architecture, privacy and safety documentation
```

## Docs

- [Coaching principles](docs/coaching-principles.md)
- [Privacy and safety boundaries](docs/privacy-safety-boundaries.md)
- [Connected health architecture](docs/connected-health-architecture.md)
- [Connected health privacy](docs/connected-health-privacy.md)
- [Data model notes](docs/data-model-notes.md)
- [Product direction](docs/CANONICAL_PRODUCT_DIRECTION.md)
