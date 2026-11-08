# Release

## Current state

- Package: `vibe-player`
- Repository version: `0.7.0`; check `npm view vibe-player version` for the
  published stable version.
- License: `Apache-2.0`
- Author: Vibe Code, `hello@vcode.sh`, `https://x.com/vcode_sh`
- Output: minified ESM and stylesheets with readable type declarations, built
  into `dist`; `src/styles` stays the readable CSS source
- Versioning: Changesets
- Publishing: public npm package with Trusted Publishing/provenance
- Guard: `bun run package:release-state`

## Release policy

Publish only built package output and consumer docs. Do not publish plans,
workspace notes, app-specific source, demos, tests, or split source CSS files.
Consumers use `vibe-player`, its explicit `/hook`, `/stage`, `/compact` entry
points, and `vibe-player/styles.css`. HLS consumers provide the `hls.js` peer;
the package must not carry a second pinned runtime.

Local `file:` dependencies are for active package work only. Stable consumers
should use the npm package or a real workspace boundary.

## GitHub workflows

Both workflows use Ubuntu 26.04. Build and publish steps use Node 26; the
minimum-runtime check deliberately uses the package's supported Node 22.0.0.

Pull requests run one lightweight CI job: formatting/lint, TypeScript, unit
tests and build. New PR updates cancel superseded runs. Pushes to `main` do not
start CI or publish packages.

Release runs only through `workflow_dispatch` on `main`. It runs `bun run ci`
once on Node 26, including package rules, boundaries, dependency guard,
release-state guard, TypeScript, tests, build, styles, size, public surface,
tarball, publint, ATTW, the packaged consumer, and a type check of the browser
specs. After `bun run ci`, Release installs Chromium and WebKit with
`--with-deps` and runs `bun run test:browser` as a separate gate before
publishing. On failure or cancellation (including the job timeout) it uploads
`test-results/` (traces, screenshots) as the `browser-acceptance-results`
artifact, kept for 7 days. Local `bun run ci` deliberately excludes the
browser lane. The release-state guard fails if those workflow steps are
removed, moved outside the span between `bun run ci` and publishing, given an
`if:` condition or `continue-on-error`, or if the publish step gets an `if:`
condition; see [the timing rationale](../research/playwright-release-gate.md).
The same job then checks the built package on exact Node 22.0.0 / React
19.2.7, restores Node 26, and runs `bun run release:publish --no-git-tag` to
publish the committed version. The minimum-runtime check skips the Vite
consumer build, whose toolchain requires a newer Node than package runtime.
Node 26 consumer
coverage already belongs to `bun run ci`.

Changesets prepares versions and changelogs locally. There is no automatic
version PR or `ENABLE_NPM_PUBLISH` repository variable to maintain.
GitHub tags and releases are separate manual steps; this workflow only
validates and publishes to npm.

The workflow uses npm Trusted Publishing through GitHub Actions OIDC. It does
not require a long-lived `NPM_TOKEN`. Keep `id-token: write` in workflow
permissions and keep `publishConfig.provenance: true` for public releases.

## Prepare and publish a release

1. Confirm the GitHub repository is public.
2. Confirm the npm package is public and owned by the expected npm account/org.
3. Configure npm Trusted Publishing with owner `vcode-sh`, repository
   `vibe-player`, workflow filename `release.yml`, and permission for
   `npm publish`. Leave the environment field empty; the workflow does not use
   a GitHub environment. Preserve this filename when editing the workflow.
4. Add a changeset with `bunx changeset`, then run `bun run release:version`.
5. Review the version, changelog and lockfile changes, then commit and push the
   prepared release to `main`.
6. In GitHub Actions, select **Release**, choose **Run workflow** on `main`, and
   start it. This validates the selected commit and publishes its prepared
   version. Concurrent releases are serialized.
7. Confirm the published version with `npm view vibe-player version` for a
   stable release, or `npm view vibe-player dist-tags` for a prerelease.

Saving the npm Trusted Publisher settings does not verify authentication or
publish a version. A successful publish confirms the complete integration.

## Prereleases

Use Changesets pre-mode for prereleases:

```bash
bunx changeset pre enter alpha
```

Do not hard-code prerelease versions in docs or consumer branches before
`changeset version` generates them. Let Changesets decide the exact version and
dist tag.

## Manual checks

For local release validation, reproduce the Release gate: install browser
engines once, then run `bun run ci` (which builds `dist`) followed by the
browser lane:

```bash
bunx playwright install --with-deps chromium firefox webkit
bun run ci
bun run test:browser
```

Local `bun run ci` alone omits the browser lane that Release runs.

Before publishing, the workflow also verifies the minimum Node/React runtime;
it reuses the built package instead of installing and building it in another
job.

The live YouTube lane is intentionally separate from deterministic CI. Before
claiming target-platform acceptance, record a successful `bun run test:youtube`
and the applicable native keyboard/screen-reader checks from
[accessibility-acceptance.md](../accessibility-acceptance.md). Linux WebKit
coverage does not establish physical Safari/iOS behavior.

## Changelog rules

- Keep new work under `[Unreleased]` until a release is prepared.
- Cut a versioned heading only for real releases.
- Write changelog entries in plain English.
- Keep customer-facing changes concrete: behavior, API, CLI, docs, or release
  metadata.
