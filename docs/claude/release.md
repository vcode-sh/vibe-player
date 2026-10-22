# Release

## Current state

- Package: `vibe-player`
- Development version: `0.2.0`, unreleased
- License: `Apache-2.0`
- Author: Vibe Code, `hello@vcode.sh`, `https://x.com/vcode_sh`
- Output: ESM-only, built into `dist`
- Versioning: Changesets
- Publishing: public npm package with Trusted Publishing/provenance
- Guard: `bun run package:release-state`

## Release policy

Publish only built package output and consumer docs. Do not publish plans,
workspace notes, app-specific source, demos, tests, or split source CSS files.
Consumers must use `vibe-player` and
`vibe-player/styles.css`.

Local `file:` dependencies are for active package work only. Stable consumers
should use the npm package or a real workspace boundary.

## GitHub release workflow

The release workflow is gated by `vars.ENABLE_NPM_PUBLISH`.

Before `changesets/action` can create a version PR or publish, it runs
`bun run ci`, including package rules, boundaries, dependency guard,
release-state guard, TypeScript, tests, build, styles, size, public surface,
tarball, publint, and ATTW.

The workflow uses npm Trusted Publishing through GitHub Actions OIDC. It does
not require a long-lived `NPM_TOKEN`. Keep `id-token: write` in workflow
permissions and keep `publishConfig.provenance: true` for public releases.

## Before enabling npm publish

1. Confirm the GitHub repository is public.
2. Confirm the npm package is public and owned by the expected npm account/org.
3. Configure npm Trusted Publishing for `.github/workflows/release.yml`.
4. Add a changeset for the release.
5. Run `bun run ci`.
6. Run `npm publish --dry-run --tag alpha --json`.
7. Install the generated tarball in a temporary consumer and verify import,
   stylesheet resolution, and `vibe-player-media-audit --help`.
8. Set `vars.ENABLE_NPM_PUBLISH=true` only when publish should run.

## Prereleases

Use Changesets pre-mode for prereleases:

```bash
bunx changeset pre enter alpha
```

Do not hard-code prerelease versions in docs or consumer branches before
`changeset version` generates them. Let Changesets decide the exact version and
dist tag.

## Manual checks

Run these before any publish:

```bash
bun run check
bun run check-types
bun run test
bun run build
bun run package:release-state
bun run package:styles
bun run package:size
bun run package:surface
bun run package:tarball
bun run package:publint
bun run package:attw
```

## Changelog rules

- Keep new work under `[Unreleased]` until a release is prepared.
- Cut a versioned heading only for real releases.
- Write changelog entries in plain English.
- Keep customer-facing changes concrete: behavior, API, CLI, docs, or release
  metadata.
