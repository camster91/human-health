# Deployment and rollback

## Build gate

Before production deployment:

1. `npm ci`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. Verify generated `out/` locally
6. Run mobile/tablet/desktop QA and offline/interruption checks

## Deployment target

Phase 1 is configured as a static Next.js export. Deploy the generated `out/` directory to the approved Sites/static-hosting target only after explicit production approval.

## Monitoring

Human Health uses VPS-hosted monitoring infrastructure:

- **Uptime Kuma** — availability monitoring and status checks
- **GlitchTip** (self-hosted at `https://glitchtip.ashbi.ca`) — error reporting and exception tracking

Error reporting requires `NEXT_PUBLIC_SENTRY_DSN` environment variable set on the VPS. See `.env.example` for configuration details. No third-party SaaS monitoring services are used.

## Rollback

Keep the previous deploy artifact/release available. If the new build causes workout-state loss, broken navigation, service-worker cache problems, or a critical accessibility regression, restore the previous artifact and invalidate the new service-worker/cache version.

## Data safety

Do not clear browser storage as part of a normal release. Schema changes that affect local workout/history state require a migration strategy before release.

## Production checks

- App loads and installs as a PWA where supported
- Start/log/pause/interruption/finish flows work
- Offline active workout retains completed sets
- Rest timer degrades safely if background timers are throttled
- Exercise substitutions preserve movement intent
- History remains intact across refresh/update
- No medical or medication recommendation language is introduced
