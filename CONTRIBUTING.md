# Contributing

Vibe Player is a React package, not a product app. Keep changes package-first,
provider-agnostic, and small enough that another maintainer can review them
without archaeology.

## Before Opening A PR

1. Run `bun install`.
2. Install browser acceptance dependencies with
   `bunx playwright install --with-deps chromium`.
3. Run `bun run ci`.
4. If you changed package output, run `npm pack --dry-run --json`.
5. If you changed media delivery logic, add or update focused Vitest coverage.
6. If you changed public APIs, update [usage](docs/usage.md),
   [integration](docs/integration.md), and public-surface guards.

## Development Rules

- Code and docs are English.
- Source/config files must stay under 280 LOC.
- Prefer 150-200 LOC per source file.
- No `any`, `.forEach()`, enums, or non-null assertions.
- Use interfaces for object shapes.
- Keep provider details inside `src/adapters`.
- Shared UI branches on normalized capabilities, not provider names.
- Product routing, telemetry, auth, billing, and storage stay outside the
  package.

## PR Shape

Keep PRs narrow. A good PR does one thing: bug fix, adapter change, UI control,
docs update, or release plumbing. If a change needs a behavior explanation,
include a short testing note and screenshots or browser evidence for UI work.

## Toolchain

Use Node 24 for repository development and build tooling.
`package.json#packageManager` pins Bun for local work and CI workflows.
The package supports Node 22 independently of the development toolchain; CI
checks an isolated tarball consumer on Node 22.0.0 with React 19.2.7 and on
Node 24 with the development React version.

`bun run ci` checks the package, both demo builds, an isolated packed consumer,
and Chromium acceptance. Install Chromium before running it locally; Playwright
also installs required system libraries on Linux with `--with-deps`.
`bun run demo:vite:verify`, `bun run package:consumer`, and
`bun run test:browser` expect the package to have been built first.
Vitest runs CLI tests in Node and component tests in Happy DOM. Playwright owns
the real browser lane; DOM emulation does not prove playback or focus geometry.

Ultracite 8.0.1 needs the checked-in Bun patch to use Biome 2.6's renamed
Tailwind rule and shared Tailwind settings. Bun applies it during installation.
Remove the patch when an upstream preset includes this migration.

The root Biome config keeps three intentional exceptions to the new preset:
- `noJsxPropsBind`: DOM event callbacks do not benefit from mandatory
  memoization. Stabilize callbacks where subscriptions or memoized consumers
  depend on their identity.
- `useConsistentMethodSignatures`: methods and function properties have
  different TypeScript variance. Preserve the public adapter contracts and
  callback properties instead of mechanically rewriting their types.
- `noUnnecessaryConditions`: Biome 2.6.2 treats mutable boolean fields, React
  refs, and CLI options as their initial literal values across callbacks and
  helper calls. Revisit when its mutation analysis handles these cases.

## Public API Changes

Public exports are guarded. If you add, rename, or remove an export, update the
surface tests and explain the migration. Do not leak test helpers, source-only
internals, or app-specific shortcuts through `src/index.ts`.

## Media And Provider Changes

Provider work needs regression tests for state, events, capabilities, and
cleanup. YouTube support must use compliant iframe or external handoff modes;
do not add hidden/raw-stream playback.

## Sponsorship

If this package saves you real engineering time, sponsor Vibe Code:
https://github.com/sponsors/vcode-sh
