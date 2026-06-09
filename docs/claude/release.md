# Release and Open-Source Transition

## Current state

- Repo is private
- Package name is scoped for internal work: `@vibe-code/vibe-player`
- License is `UNLICENSED`
- Changesets is the intended versioning and npm release mechanism
- Package output is intentionally ESM-only
- `bun run package:release-state` guards the current private-release stance in
  CI. Update that guard intentionally when the package is ready to become a
  versioned internal or public release.

## Consumer dependency policy

Use local `file:` dependencies only for active package/product co-development.
They are useful while a consumer and this package are changing together, but
they are not a release or staging strategy.

Before a consumer branch is stabilized, cut over to one of these modes:

1. Versioned internal release: publish or otherwise pin an exact internal
   package version and consume the package through its `exports` surface.
2. Workspace policy: keep the package in a shared workspace with one lockfile
   and one CI boundary that builds the package before the consumer.
3. Public npm release: only after the public-release checklist below is done.

Do not let product apps import `src/*`, split CSS source files, or copied
package code. Consumers must use `@vibe-code/vibe-player` and
`@vibe-code/vibe-player/styles.css`.

For every consumer cutover, verify:

- the consumer lockfile points to the intended package version or workspace;
- `@vibe-code/vibe-player/styles.css` resolves to the built stylesheet;
- the package build, tarball, public-surface, publint, and ATTW checks pass;
- the product route has a runtime smoke for file, HLS, and any YouTube surface
  it uses.

## Before the first public release

1. Decide the final package name and npm scope.
2. Decide whether the public package should remain scoped or become unscoped.
3. Replace `UNLICENSED` with the intended open-source license.
4. Review all docs and comments for private/internal-only references.
5. Ensure `bun run ci`, `publint`, and `ATTW` all pass.
6. Ensure exports and CSS entrypoints are intentional and documented.
7. Update or remove `package:release-state` so the new release stance is
   explicit.
8. Set `vars.ENABLE_NPM_PUBLISH=true` in GitHub repository settings.
9. Add `NPM_TOKEN` and confirm the package is no longer `private`.

## Release quality bar

Before any publish:

- `bun run check`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `bun run package:release-state`
- `bun run package:styles`
- `bun run package:size`
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
