# Dependency and GitHub Actions update policy

Human Health treats dependency and CI workflow changes as supply-chain changes, not routine formatting.

## npm dependencies

- Keep `package.json` and the committed `package-lock.json` in sync.
- Generate or update the lockfile only from a clean, supported Node 22/npm environment.
- Review the lockfile diff before merge, including package names, resolved versions, integrity hashes, lifecycle scripts, new transitive packages and unexpected registry/source changes.
- CI must use `npm ci` once the reviewed lockfile is committed. Do not fall back silently to `npm install` when the lockfile is expected.
- Run typecheck, the complete unit suite, the production build and PWA checks after dependency changes.
- Prefer narrow dependency updates. Do not combine unrelated package upgrades with product changes when avoidable.
- Security updates still require regression verification; urgency does not make an unexecuted check a pass.

## GitHub Actions

- Third-party Actions are pinned to reviewed immutable commit SHAs.
- Keep the human-readable major version in a comment beside the SHA, for example `# v4`.
- When updating an Action, resolve the intended upstream tag to its current commit SHA, review upstream release/change information, then update the immutable SHA deliberately.
- Do not use a floating branch or major-version tag as the executable workflow reference.

## Runner boundary

Runner availability is infrastructure evidence, not source correctness. A queued job with no eligible runner is neither a pass nor a source-test failure.

Provisioning or broadening privileged runner access remains an approval-gated infrastructure action. Production deployment remains a separate release decision.

## Current migration note

PR #84 pins the existing `actions/checkout` and `actions/setup-node` v4 references to immutable SHAs. The repository still needs a reviewed `package-lock.json` generated in a clean dependency-capable environment; only then should the workflow install step switch from `npm install --no-audit --no-fund` to `npm ci --no-audit --no-fund`.
