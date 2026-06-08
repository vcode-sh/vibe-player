# Vibe Player

Cinematic, provider-agnostic React video player primitives and skins.

Status: private repo, implementation scaffold ready  
Author: Vibe Code

## Intent

`vibe-player` is being built as a standalone package first, then later adopted
by product surfaces like Discovery. The package should preserve
Discovery-grade motion, chrome, transitions, and polish while supporting a
clean adapter model for:

- direct file playback
- HLS playback
- YouTube playback

The package is intentionally **ESM-only**.

## Tooling baseline

The scaffold uses the latest verified versions available during setup on
2026-06-08:

- `@biomejs/biome`: `2.4.16`
- `ultracite`: `7.8.2`
- `typescript`: `6.0.3`
- `react`: `19.2.7`
- `react-dom`: `19.2.7`
- `tsdown`: `0.22.2`
- `vitest`: `4.1.8`

## Repo rules

- Source and config files have a hard limit of `280 LOC`.
- Target size for most source files is `150-200 LOC`.
- New functionality should extend the folder structure, not inflate one file.
- `interface` over `type` for object shapes.
- No `any`, no `.forEach()`, no enums, no non-null assertions.
- Every exported package API should gain TSDoc as implementation becomes real.

See:

- [AGENTS.md](./AGENTS.md)
- [CLAUDE.md](./CLAUDE.md)
- [docs/claude/coding-standards.md](./docs/claude/coding-standards.md)
- [todo/vibe-player.md](./todo/vibe-player.md)

## Initial structure

```text
src/
  adapters/
  captions/
  core/
  react/
  skins/
  styles/
  ui/
```

## Commands

```bash
bun install
bun run check
bun run check-types
bun run test
bun run build
bun run package:publint
bun run package:attw
bun run release:version
```

## Publishing stance

The repo is private today and intentionally scaffolded so it can be published
later with limited churn:

- clean `exports`
- `dist` build output
- package lint/type/test/build scripts
- publint and ATTW validation
- changesets-based versioning
- GitHub CI

Until that transition happens, the license stays `UNLICENSED`.

## Test runner stance

Tests use `Vitest`, not `bun test`.

`bun` is the package manager and local command runner. `Vitest` is the actual
test framework because the package needs durable library-grade test ergonomics
and broader ecosystem-standard publishing confidence.
