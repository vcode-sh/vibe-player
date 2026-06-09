@CLAUDE.md

# Vibe Player - Agent Quick Reference

All repo rules live in `CLAUDE.md` and `docs/claude/*`.

## Critical Rules

1. **Never run `git reset`** without explicit user permission.
2. **Always run `date "+%Y-%m-%d %H:%M"`** before writing any timestamp.
3. **Source and config files have a hard limit of 280 LOC.**
4. **Target 150-200 LOC per source file.**
5. **No `any`, no `.forEach()`, no enums, no non-null assertions.**
6. **Use `interface` over `type` for object shapes.**
7. **`bun run check` and `bun run lint` are non-mutating.**
8. **Keep root `biome.json` thin.**
9. **Do not silently couple package code to app-specific routing, telemetry, or storage.**
10. **Preserve provider-agnostic architecture.**
11. **Use Vitest for tests.** Bun runs scripts, but `bun test` is not the repo test standard.

## Architecture Rules

- `core/` owns source, controller, events, state, and capabilities.
- `adapters/` owns provider bridges only.
- `react/` owns hooks and bindings.
- `ui/` owns rendering primitives and assemblies.
- `skins/` owns visual presets.
- `captions/` owns parsing and caption helpers.
- `styles/` owns package CSS only.

## Package Direction

- Public-ready package architecture from day one
- Apache-2.0 public release stance
- Product-grade motion quality is a hard requirement
- Product apps are consumers, not architectural owners
