# Deployment and rollback

## Build gate

Before production deployment:

1. Use Node.js 22 and install dependencies with `npm install` while the repository has no reviewed lockfile.
2. Run `npm run verify` successfully.
3. Verify the generated `out/` artifact locally.
4. Run representative mobile/tablet/desktop QA plus offline/interruption checks.
5. Resolve or explicitly disposition any applicable release blockers recorded in GitHub.
6. Obtain explicit approval for the exact production deployment.

Do not claim `npm ci` reproducibility until a trustworthy committed `package-lock.json` exists and has been reviewed. Do not treat queued GitHub Actions with no eligible runner as successful verification.

## Deployment target

The current Next.js configuration uses `output: 'export'`, producing a static `out/` artifact. Deploy that artifact only to the approved Sites/static-hosting production target and only after explicit production approval.

The repository does not currently establish a separate staging or preview environment as an authoritative deployment target. Do not invent one in agent handoffs.

## Rollback

Keep the previous deploy artifact/release available. If the new build causes workout-state loss, broken navigation, service-worker cache problems, or a critical accessibility regression, restore the previous artifact and invalidate the new service-worker/cache version.

If the actual production host cannot be inspected or the previous artifact is not demonstrably available, report rollback readiness as unverified rather than assuming it is safe.

## Data safety

Do not clear browser storage as part of a normal release. Schema changes that affect local workout/history, connected-health, preventive, or platform state require an explicit migration/compatibility strategy before release.

## Production checks

- App loads and installs as a PWA where supported.
- Start/log/pause/interruption/finish flows work.
- Offline active workout retains completed sets.
- Rest timer degrades safely if background timers are throttled.
- Exercise substitutions preserve movement intent.
- History remains intact across refresh/update.
- Connected-health/platform data preserves provenance and user-controlled sharing/deletion boundaries.
- No medical diagnosis, medication/insulin dosing, treatment-carbohydrate calculation, emergency-monitoring, or injury-clearance behaviour is introduced.
- No production change is reported as completed until the deployed environment was actually inspected.
