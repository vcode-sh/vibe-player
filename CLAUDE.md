@docs/claude/architecture.md
@docs/claude/coding-standards.md
@docs/claude/important-rules.md
@docs/claude/release.md

# Vibe Player

Standalone package repository for a cinematic, provider-agnostic React video
player.

## Current repo stance

- Public-ready package repository
- Author: Vibe Code, `hello@vcode.sh`, `https://x.com/vcode_sh`
- License: Apache-2.0
- npm package: `vibe-player`

## Repo goals

1. Ship a gold-standard package codebase.
2. Keep the runtime provider-agnostic from the start.
3. Preserve product-reference motion and polish without coupling to an app.
4. Maintain strict modularity and small-file architecture.

## Commands

```bash
bun install
bun run check
bun run lint
bun run check-types
bun run test
bun run build
bun run package:publint
bun run package:attw
bun run ci
```

## Critical working rules

- Never guess dates or versions.
- Keep code and docs in English.
- Do not let `core` import from `ui`, `skins`, or app-specific runtime code.
- Do not let adapters leak provider-specific assumptions into shared UI.
- Keep exports explicit and stable.
- Prefer additive new files over extending already-large files.
- Use `Vitest` as the test runner. Bun is the package manager and script runner.
- When writing, reviewing, or deleting tests, use
  [testing-patterns](.claude/skills/testing-patterns/SKILL.md).

## Repo map

See `docs/claude/architecture.md` for the canonical structure and ownership
model.
