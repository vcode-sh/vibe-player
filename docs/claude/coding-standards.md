# Coding Standards

## Pre-write checklist

Before editing any source or config file:

1. Estimate whether the file will exceed `200 LOC`.
2. If it may exceed `200 LOC`, split the design first.
3. Keep functions under `40 LOC` when practical.
4. Use early returns and extracted helpers to keep cognitive complexity under `20`.
5. Count imports and props before inflating one module into multiple concerns.

## Hard rules

- File hard limit: `280 LOC`
- Function hard limit: `50 LOC`
- Preferred file size: `150-200 LOC`
- Preferred function size: `30-40 LOC`
- `interface` over `type` for object shapes
- No `any`
- No `.forEach()`
- No enums
- No non-null assertions
- No nested ternaries
- No parameter reassignment
- No namespace imports
- Use kebab-case file names

## Modular architecture rules

### Single-responsibility folders

- `core`: controller, types, events, time, state
- `adapters`: provider bridges
- `react`: hooks and bindings
- `ui`: render components and shells
- `skins`: visual presets
- `captions`: caption parsing and helpers
- `styles`: CSS assets only

### Extension over modification

When a file approaches the limit:

- extract a helper
- extract a hook
- extract a sub-component
- add a focused file rather than extending the original

### Barrel exports

Each folder should have a local `index.ts`, but barrel files should stay thin.

## Testing guidance

- Use `Vitest` as the test runner
- Run tests through `bun run test`, but the framework itself is `Vitest`
- Prefer focused unit tests for core logic
- Use component tests for accessibility and interaction behavior
- Add regression tests for motion and chrome behavior when those systems land
- Keep provider-specific tests near adapters

## Documentation guidance

- Use TSDoc on exported package APIs as implementation becomes real
- Keep cross-cutting process docs in `docs/claude/*`
- Keep roadmap and architecture execution plans in `todo/*`
