# Human Health agent instructions

## Product

Human Health is a local-first, mobile-first health and performance PWA for people who want structured goals with flexible execution. It combines adaptive training, whole-person fitness, opt-in connected-health context, deterministic-first coaching, and a user-owned long-horizon platform layer.

Human Health is a fitness/lifestyle product, not a medical authority. Do not introduce diagnosis, medication or insulin dosing, treatment-carbohydrate calculations, emergency monitoring, injury clearance, or unsupported clinical/causal claims.

## Authority and reading order

Use repository content in this order:

1. `AGENTS.md` — durable execution and safety rules.
2. `README.md` — current product summary, setup, verification, and status.
3. `docs/implementation-roadmap.md` — current phased product direction.
4. Relevant architecture, privacy, QA, deployment, and phase-status documents under `docs/`.
5. Open GitHub issues and pull requests — live implementation/release work and current blockers.

Do not treat an older phase review, completion checklist, planning prompt, or historical design note as a current requirement when it conflicts with the sources above. Preserve useful history, but label historical material when ambiguity could mislead a future agent.

Do not put rapidly changing task state into this file. GitHub issues and pull requests are the live implementation source.

## Architecture

- Next.js 15 / React 19 / TypeScript.
- Static-export/PWA-oriented web application.
- `app/` — routes and UI surfaces.
- `lib/` — training, coaching, connected-health, storage, scheduling, platform, and domain logic.
- `public/` — PWA/static assets including service-worker assets.
- `scripts/` — repository verification/support scripts.
- `docs/` — architecture, privacy, delivery, phase, and review documentation.
- Current user data is designed to remain local-first. Treat training history, connected-health data, preventive records, exports, and integration payloads as sensitive.

Read the relevant domain document before changing a major boundary. In particular, use the connected-health/privacy/native-bridge documents for provider or health-data work and `docs/deployment-and-rollback.md` for delivery changes.

## Environment and setup

CI targets Node.js 22. Use a compatible Node 22/npm environment unless the repository is deliberately upgraded.

Current setup:

```bash
npm install
npm run dev
```

The repository does not currently have a trustworthy committed lockfile. Do not change documentation or CI to claim `npm ci` reproducibility until a real `package-lock.json` has been generated and reviewed in a dependency-capable environment.

No project secret file is required for the representative local app. `scripts/serve-static.mjs` accepts optional `STATIC_ROOT` and `PORT` environment overrides. Do not commit real credentials, tokens, private health data, or production configuration.

## Verification

Canonical merge-level source gate:

```bash
npm run verify
```

It runs TypeScript checking, the unit suite, the production build, and PWA static checks. A check is only passed when it actually ran successfully.

For focused iteration, use the underlying commands where appropriate:

```bash
npm run typecheck
npm test
npm run build
npm run check:pwa
```

GitHub Actions uses a self-hosted Ashbi runner. A queued workflow with no eligible runner is infrastructure evidence, not a source pass or source failure. Never report queued/cancelled infrastructure work as verified.

Executable/browser/native/release gates that are not part of `npm run verify` remain separate evidence and must not be implied by a green source gate.

## Testing and web QA

For web-facing changes, verify representative layouts when executable browser access is available:

- Mobile: approximately 390 px.
- Tablet: approximately 768 px.
- Desktop: approximately 1440 px.

Check the affected flows plus navigation, interactive states, keyboard operation, focus visibility, forms/validation where present, links, console errors, responsive imagery, loading/error/empty states, accessibility basics, metadata/PWA behaviour, and obvious performance regressions.

For workout/storage/PWA changes, also cover interruption, refresh/update, offline behaviour, persistence, and data-loss risk. For connected-health/platform changes, preserve provenance, explicit consent/sharing boundaries, fail-closed validation, deletion/export semantics, and the distinction between missing, stale, imported, inferred, and manually entered data.

Do not weaken or delete a failing test merely to obtain a green result.

## Security and privacy

- Never commit credentials, secrets, real private health information, or production data.
- Use synthetic fixtures for tests and examples.
- Preserve explicit user confirmation at external sharing boundaries.
- Keep source/provider provenance intact where the product relies on it.
- Treat storage migrations, imports, deletion, and rollback as data-safety boundaries.
- Do not silently equate unlike exercises, devices, providers, or measurement domains.
- Do not describe experimental capability models as validated without the required external evidence and independent replication.

If a credential or secret appears to be committed, stop handling the value and report only the repository/path and remediation need.

## Environments and production boundary

Known repository-level environments are:

- Local development.
- GitHub Actions verification on an eligible self-hosted runner.
- Approved static-hosting production delivery described in `docs/deployment-and-rollback.md`.

Do not invent a preview or staging environment that has not been documented and verified.

Agents may prepare, review, test, document, branch, commit, and open draft pull requests when authorised for the task. Without Cameron's explicit approval for the exact action, agents must not:

- deploy production;
- publish a release;
- change production configuration or DNS;
- rotate or expose credentials;
- change permissions/access or billing;
- perform destructive migrations;
- clear user storage;
- merge a pull request;
- perform another difficult-to-reverse production action.

## Deployment and rollback

Follow `docs/deployment-and-rollback.md`. Production deployment is a separate approval gate from source completion or CI success. Keep the previous deploy artifact/release available and preserve user-local data during normal releases.

If the actual deployment target, artifact retention, or rollback mechanism is not verifiable from repository evidence, report it as unknown rather than inventing operational detail.

## Definition of done

Use these statuses in handoffs:

1. Completed and verified
2. Completed but awaiting verification
3. In progress
4. Blocked
5. Awaiting client or teammate
6. Next action

Never use **Completed and verified** without the required evidence.

Every substantial coding handoff should include:

- branch;
- commit(s);
- pull request;
- files changed;
- implementation summary;
- checks actually executed and their pass/fail/queued state;
- screenshots or URLs when relevant and actually obtained;
- remaining risks/blockers;
- production status;
- next action.
