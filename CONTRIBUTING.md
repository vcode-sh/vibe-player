# Contributing

Vibe Player is a React package, not a product app. Keep changes package-first,
provider-agnostic, and small enough that another maintainer can review them
without archaeology.

## Before Opening A PR

1. Run `bun install`.
2. Run `bun run ci`.
3. If you changed package output, run `npm pack --dry-run --json`.
4. If you changed media delivery logic, add or update focused Vitest coverage.
5. If you changed public APIs, update README/docs and public-surface guards.

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
