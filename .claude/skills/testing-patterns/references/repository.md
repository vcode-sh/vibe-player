# Vibe Player test mechanics

Paths below are relative to the repository root unless linked. Check current
scripts/configuration when changing lanes; historical audit counts are not gates.

## Owners and fixtures

| Claim                                             | Owner and useful boundary                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transitions, stale loads, commands, subscriptions | Real `src/core` controller; injected adapter controls completion/events. Assert state and relevant forbidden effects.                                   |
| File/HLS translation and disposal                 | Real `src/adapters` implementation; substitute only media/SDK boundary. Emulated events do not establish decoding or live-provider behavior.            |
| WebVTT parsing and cue selection                  | `src/captions/parse-webvtt.ts`, consumed by `src/react/use-vibe-player-captions.ts`. Literal cue fixtures and expected lines.                           |
| Hook subscription, cancellation, source changes   | Real `src/react` hook/controller; controlled loader promises, rerenders and unmounts.                                                                   |
| Controls, modal, keyboard, captions               | Real `src/ui` components and owner logic; roles, names, actions and visible results. Actual geometry, focus, playback and motion need the browser lane. |
| Media-audit HTTP, CORS, ranges, timeouts          | Real `scripts/media-delivery-audit-*` logic; `Response` fixtures for protocol decisions, loopback HTTP for transport lifecycle.                         |
| Architecture, exports, release/package policies   | Real guard rule functions plus actual built-artifact gates. Structural assertions are justified by the explicit package policy.                         |

Product applications own authentication, routing, storage choices and telemetry
sinks. This package has no configured SQL/Redis test lane. Do not import another
project's database, queue, credentials, or migration commands. If a future task
introduces such a boundary, verify its actual environment before claiming it.

Fixture conventions:
- `src/core/vibe-player-controller-test-helpers.ts` supplies `TestAdapter`, event
  injection, call history and a real controller harness. It does not prove host
  persistence simply because the injected store receives a call.
- Provider helpers control SDK callbacks/sessions; keep the adapter under test
  real. A UI interaction test can complement a controller rule test without
  duplicating its algorithm.
- Caption lifecycle tests distinguish `old`/`current` sources and stale/current
  text. Complete deferred work explicitly inside Testing Library `act`.
- `scripts/media-delivery-audit-test-helpers.mjs` builds MP4 boxes and Fetch
  responses. Reuse setup when useful; independently check the expected findings.
- `test/setup.ts` only imports jest-dom. Do not assume it resets resources.
  Import Vitest APIs explicitly and keep fixtures small. Project coding rules
  and the 280-line source/config limit apply; split by behavior ownership.

## Select and run checks

Run from the repository root with installed lockfile dependencies. Bun runs
scripts; **Vitest runs tests**, not `bun test`. `vitest.config.ts` defines:
- `dom`: `src/**/*.test.ts` and `src/**/*.test.tsx`, happy-dom, `test/setup.ts`.
- `node`: `scripts/**/*.test.mjs`, Node environment.

These focused selectors use existing files and names. Confirm the intended
cases ran; zero matches or unrelated setup failure is not success.

```bash
bun run test --project dom src/captions/parse-webvtt.test.ts
bun run test --project dom src/react/use-vibe-player-captions-lifecycle.test.tsx -t 'superseded'
bun run test --project node scripts/media-delivery-audit-deadline-http.test.mjs
bun run test --project node scripts/package-boundary-rules.test.mjs
```

For a bounded code change, select the relevant tests, scoped Biome checks, and
`bun run check-types` (the root package typecheck). For example:

```bash
bunx biome check src/captions/parse-webvtt.test.ts
bunx biome lint src/captions/parse-webvtt.test.ts
bun run check-types
```

For documentation/skill-only edits, read back, validate skill frontmatter and
links with available tooling, run scoped `bunx biome check <changed-files>` and
`git diff --check`. No new runtime test is normally needed. The installed Biome
formats Markdown, but that alone does not validate skill discovery or behavior.
`bun run check` and `bun run lint` do not mutate files.

Preserve required gates from [release guidance](../../../../docs/claude/release.md)
and the task acceptance contract. Current PR CI runs `check`, `check-types`,
`test`, and `build`. Broad suite changes warrant the relevant root gates;
release validation uses `bun run ci`, including package rules/boundaries,
TypeScript, unit tests, build, styles/size/surface/tarball, publint, ATTW,
packaged consumer and a type check of the browser specs. Release then runs
deterministic browser acceptance (`bun run test:browser`) and the minimum
Node/React check as separate workflow steps; local `ci` does not run the
browser lane. Do not weaken or replace these gates with a selected test or a
mock. Do not run release/publish commands for a test-quality task.

## Browser, provider and environment boundaries

Read [browser acceptance](../../../../test/browser/README.md) when the risk needs
it. Its fixture imports built `vibe-player` exports/CSS and committed local
MP4/HLS/VTT assets. Build before testing changed package behavior:

```bash
bun run build
bun run test:browser:check
bun run test:browser --project=chromium
bun run test:browser --project=webkit
```

Installed engines are required; the README documents installation. The configs
own servers on loopback ports 5197/5198, one worker, and
`reuseExistingServer: false`. Coordinate exclusive use before a run; a busy port
is not permission to stop another session. These checks prove the exercised
Chromium/WebKit behavior, not physical Safari/iOS or audible autoplay policy.

For target-platform accessibility acceptance, consult
[accessibility requirements](../../../../docs/accessibility-acceptance.md).
`bun run test:accessibility:native` is a separate Linux environment lane, not
proof of physical keyboard, human listening, VoiceOver or NVDA acceptance.
`package:consumer` installs an archive in a disposable directory and can access
the registry; it is not a network-free unit check.

Unit tests need no production network, credentials or persistent browser profile.
For transport tests, bind disposable HTTP servers to `127.0.0.1` on port `0` and
use the assigned port. No GPU or additional testing dependency is needed here.

## Async and resource cleanup

Own each resource explicitly and register cleanup as it is acquired. Use
`afterEach`/`finally` for normal and exceptional paths; when supervising a process,
handle cancellation/timeouts and confirm exit. Do not treat killing a test runner
as proof that its child servers exited.
- Unmount React trees; dispose controllers/adapters through their actual APIs.
- Settle/cancel deferred work; restore spies, globals, fake timers and storage.
  Clear watchdog timers in `finally` even when the operation wins a
  `Promise.race`; losing promises do not cancel themselves.
- For Node HTTP fixtures, close owned connections with `closeAllConnections()`
  and await `server.close(...)`, as the deadline HTTP test does.
- Let Playwright tear down its owned server/context. On interruption, inspect the
  recorded owned PID/process group and listening ports; stop only that ownership.
  Use `ps -p <owned-pid>` and `ss -ltnp` for readback, not broad `pkill` patterns.
- Remove only test-owned temporary directories. Preserve shared build artifacts
  and services. Use isolated copies for fault probes, never shared source edits.

## Examples to adapt, not duplicate

1. **Caption boundary regression:** `src/captions/parse-webvtt.test.ts` checks
   inclusive starts and exclusive ends. Literal expectations at 1, 1.999 and 2
   distinguish a wrong comparison; overlapping, distinct text reveals stale or
   duplicated output. Existing coverage may already make a new case unnecessary.
2. **Stale completion:** `src/react/use-vibe-player-captions-lifecycle.test.tsx`
   lets superseded requests resolve/reject despite cancellation, then completes
   the current request. Observe current captions/status, not just `abort` calls.
3. **Real transport:** `scripts/media-delivery-audit-deadline-http.test.mjs`
   stalls a loopback response before headers or during its body. The actual audit
   must time out and close the real request. A mocked Fetch rejection cannot
   prove connection cleanup; focused deadline tests can still complement this.
4. **Legitimate structure:** `scripts/package-boundary-rules.test.mjs` feeds real
   rule analysis allowed/forbidden imports, including comment decoys. Keep that
   explicit architecture protection; it does not prove playback correctness.

## Provenance and discovery

Adapted from the supplied `guidelines.md` and `audit.md` in the source collection
`/home/vcode/docs/research/test-quality-2026/`. The audit holds the research
bibliography and qualifications; it is not required at runtime. Source SHA-256:
- `guidelines.md`: `0b19c15a4d1fbccbbea6f61564788fa4d9e2a1c2a1992710465faea19da8d764`
- `audit.md`: `7bd25662e3f4964c087a30d9dd07ce49078bec0fae445945838d9aa99e9321ce`

The canonical body is `.claude/skills/testing-patterns/SKILL.md`.
`.agents/skills/testing-patterns` is the tracked relative directory symlink
`../../.claude/skills/testing-patterns`. Preserve one body and portable `name` /
`description` frontmatter. Existing `CLAUDE.md` routing is sufficient; `AGENTS.md`
and `CLAUDE.md` are distinct regular files, not aliases requiring duplicate edits.

[Codex documentation](https://learn.chatgpt.com/docs/build-skills) describes
`.agents/skills` discovery and `$testing-patterns` invocation;
[Claude Code documentation](https://code.claude.com/docs/en/skills) describes
`.claude/skills` and `/testing-patterns`. Both support symlinked skill directories.
Automatic selection uses the description. Check actual discovery after checkout;
platforms that materialize Git symlinks as text need working symlink support,
not a second instruction copy. Validation evidence is in
[validation.md](validation.md).
