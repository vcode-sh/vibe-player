# Release and Open-Source Transition

## Current state

- Repo is private
- Package name is scoped for internal work: `@vibe-code/vibe-player`
- License is `UNLICENSED`
- Changesets is the intended versioning and npm release mechanism
- Package output is intentionally ESM-only

## Before the first public release

1. Decide the final package name and npm scope.
2. Decide whether the public package should remain scoped or become unscoped.
3. Replace `UNLICENSED` with the intended open-source license.
4. Review all docs and comments for private/internal-only references.
5. Ensure `bun run ci`, `publint`, and `ATTW` all pass.
6. Ensure exports and CSS entrypoints are intentional and documented.
7. Set `vars.ENABLE_NPM_PUBLISH=true` in GitHub repository settings.
8. Add `NPM_TOKEN` and confirm the package is no longer `private`.

## Release quality bar

Before any publish:

- `bun run check`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `bun run package:publint`
- `bun run package:attw`
- `bun run release:version` when cutting a version PR locally

## Changesets flow

- Create a new changeset for user-facing changes
- Merge changesets into `main`
- Let GitHub Actions manage version PRs and publish when enabled
- Keep manual `npm version` and ad hoc publish flows out of the repo

## Changelog rules

- Keep all new work under `[Unreleased]`
- Cut a versioned heading only when a real release is prepared
- Write changelog entries in plain English
