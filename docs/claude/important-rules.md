# Important Rules

## Date rule

- Always execute `date "+%Y-%m-%d %H:%M"` before writing any timestamp.
- Never guess the year, date, or time.

## Architecture truth rules

- Discovery is a reference surface, not the package owner.
- The package must stay provider-agnostic.
- Shared UI may branch on normalized capabilities, not provider internals.
- Adapters may know providers; shared components may not.
- Product telemetry, watched state, routing, and SEO stay outside the package.

## Package publishing rules

- Keep `exports` explicit.
- Keep `dist` buildable at all times once implementation starts.
- Keep the repo private until the API surface is intentional and stable.
- Treat publint and ATTW as release gates, not optional extras.

## Repo hygiene

- Use English in code, docs, comments, and commit messages.
- Do not add dependencies speculatively without a concrete role.
- Do not weaken lint rules just to fit unfinished code.
- Prefer honest capability degradation over fake cross-provider parity.
- Use `Vitest` for tests and `bun` for package management and script execution.
