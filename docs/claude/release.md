# Release

## Current state

- Package: `vibe-player`
- Repository version: `0.7.1`; check `npm view vibe-player version` for the
  published stable version.
- License: `Apache-2.0`
- Author: Vibe Code, `hello@vcode.sh`, `https://x.com/vcode_sh`
- Output: readable, unminified ESM with stable chunk names
  (`dist/chunks/[name].js`), readable type declarations and minified
  stylesheets; no sourcemaps. `src/styles` stays the readable CSS source.
- Versioning: hand-written `CHANGELOG.md` and a manual `package.json` bump
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

## Semver policy

While the package is `0.x`, a minor bump (`0.x.0`) carries breaking API
changes, including widening a union in an exported type and adding a required
member to an exported interface or options object. Fixes and compatible
additions are patches (`0.x.y`). Every breaking change gets a CHANGELOG bullet
with a one-line migration hint.

## API report

`api/vibe-player.api.md` records every public entry point's exports and the
full declaration graph, generated from `dist` declarations (sorted, comments
removed). `bun run package:api` (part of `bun run ci`) fails when the build
differs from the committed report. After an intended API change, run
`bun run package:api:update`, review the report diff against the semver policy
and commit it with the change.

## Size budgets

`bun run package:size` fails above a limit and warns when a budget has less
than 5 % headroom. Re-base a warning budget deliberately (about 15 % headroom)
with a dated comment, instead of waiting for it to fail.

## GitHub workflows

Both workflows use Ubuntu 26.04 and Node 26; the minimum-runtime check uses
the supported Node 22.0.0.

CI runs on every push to `main` and on pull requests. The `quality` job runs
`bun run ci`; the `browser` job installs Chromium and WebKit (cached by
Playwright version), builds and runs `bun run test:browser`, uploading
`test-results/` as `browser-acceptance-results` on failure. Only pull request
runs cancel superseded runs.

Release runs only through `workflow_dispatch` on `main`, in this order:
1. Extract the `## [<version>] - <date>` section of `CHANGELOG.md` as release
   notes (`scripts/write-release-notes.mjs`); fail when it is missing or empty.
2. Fail when tag `v<version>` already exists on `origin`.
3. `bun run ci`, then `bun run test:browser` on Chromium and WebKit (uploading
   `test-results/` on failure or cancellation), then the exact Node 22.0.0 /
   React 19.2.7 consumer check.
4. `bun run release:publish --no-git-tag` publishes the committed version.
5. Push an annotated `v<version>` tag on the released commit and run
   `gh release create` with the notes file (`contents: write`).

The release-state guard fails if the browser gate leaves the span between
`bun run ci` and publishing, if the notes or tag checks move after publishing,
if tagging or the GitHub release move before it, or if any of these steps gets
an `if:` condition or `continue-on-error`; see
[the timing rationale](../research/playwright-release-gate.md).
`release:publish` calls `changeset publish`, so keep `.changeset/config.json`
(public access, no commits); no changeset files or version PRs are used.

The workflow uses npm Trusted Publishing through GitHub Actions OIDC; there is
no long-lived `NPM_TOKEN`. Keep `id-token: write` and
`publishConfig.provenance: true`.

## Prepare and publish a release

1. Confirm the repository and npm package are public and owned by the expected
   account, and that npm Trusted Publishing names owner `vcode-sh`, repository
   `vibe-player`, workflow `release.yml` and no environment. Keep that filename.
2. Run `date "+%Y-%m-%d"`, rename `## [Unreleased]` content into
   `## [<version>] - <date>` (keep an empty `[Unreleased]` above it), and bump
   `version` in `package.json` according to the semver policy.
3. Run `bun run ci` and `bun run test:browser`, review the API report and size
   output, then commit and push the release to `main`.
4. In GitHub Actions, run **Release** on `main`. Concurrent releases are
   serialized.
5. Confirm `npm view vibe-player version`, the `v<version>` tag and the GitHub
   release.

`changeset publish` uses the `latest` dist tag unless Changesets pre mode is
active (`bunx changeset pre enter <tag>` writes `.changeset/pre.json`); enter it
before releasing a prerelease. Prerelease versions get a GitHub prerelease.

## Manual checks

Local `bun run ci` omits the browser lane; reproduce the full gate with:

```bash
bunx playwright install --with-deps chromium webkit
bun run ci
bun run test:browser
```

Before claiming target-platform acceptance, record the applicable native
keyboard/screen-reader checks from
[accessibility-acceptance.md](../accessibility-acceptance.md). Linux WebKit
coverage does not establish physical Safari/iOS behavior.

## Changelog rules

- Keep new work under `[Unreleased]` until a release is prepared.
- Cut a versioned heading only for real releases.
- Write changelog entries in plain English.
- Keep customer-facing changes concrete: behavior, API, CLI, docs, or release
  metadata.
