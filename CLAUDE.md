@docs/claude/architecture.md
@docs/claude/coding-standards.md
@docs/claude/important-rules.md
@docs/claude/release.md

# Vibe Player

Standalone package repository for a cinematic, provider-agnostic React video
player.

## Current repo stance

- Private repository
- Author: Vibe Code
- Initial implementation scaffold only
- Later public/open-source target

## Repo goals

1. Ship a gold-standard package codebase before public release.
2. Keep the runtime provider-agnostic from the start.
3. Preserve Discovery-level motion and polish without coupling to Discovery.
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

## Repo map

See `docs/claude/architecture.md` for the canonical structure and ownership
model.
