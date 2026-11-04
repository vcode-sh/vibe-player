# YouTube test quality audit

Inspected all 12 original `src/adapters/youtube/*.test.ts` files, both SDK
fixtures, the adapter/runtime/state/command owners, the built-in factory,
controller load subscription, and the direct-adapter contract in
`docs/integration.md`. The suite now contains 51 tests, compared with 50 before
this audit: one redundant case removed and two distinct cases added. Counts are
inventory, not acceptance criteria.

## Confirmed defects and fixes

- **Readiness event published an unusable snapshot.** The default runtime's
  `onReady` callback emitted `ready` before the adapter committed its handle.
  The focused regression received `idle`, time `0`, duration `0` instead of the
  already-ready provider values `23.5` and `213`. The adapter now publishes
  readiness after committing the current handle. The existing readiness test
  still rejects premature handle reads and commands.
- **Cancellation retained the adapter's creation deadline.** Unmounting while an
  injected runtime was still pending left the adapter-owned 8-second timer
  active. A focused regression observed one timer after unmount. The creation
  wrapper now rejects promptly with `AbortError`, removes its abort listener,
  and clears its timer. Late success still destroys the obsolete handle, and
  obsolete rejection cannot destroy or overwrite replacement playback. A custom
  runtime remains responsible for releasing resources that it never returns.

## Original-file decisions

Paths in this table are relative to `src/adapters/youtube/`.

| Original file                                 | Decision | Contract, failure sensitivity, and action                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-youtube-adapter-events.test.ts`       | REWRITE  | Real adapter stops sampling on pause/cue/buffer/end and translates event names. The short-video case now actually delivers the official blocked event after end; waiting for the removed watchdog could not detect an uncleared playback intent. Added SDK-to-adapter rate/error payload translation and silence after disposal. |
| `create-youtube-adapter-load-session.test.ts` | REWRITE  | Deferred creation challenges late success, late failure, and obsolete callbacks against active replacement playback. Added prompt cancellation, zero remaining deadline timers, and explicit old-handle disposal. The rejecting SDK fixture releases its own inaccessible handle.                                                |
| `create-youtube-adapter.test.ts`              | REWRITE  | Retains real-adapter command/clamping, state sampling, unsupported-source, timeout, capabilities, and factory-dispatch checks. Removed duplicate state-event assertions now owned by the event suite and obsolete watchdog waiting. Active sampling must leave zero timers after unmount.                                        |
| `create-youtube-external-adapter.test.ts`     | KEEP     | Literal watch URL, title/action, safe external target, no iframe/playback, and real default-factory handoff distinguish wrong routing and wrong URL construction. Registered disposal even if an assertion fails.                                                                                                                |
| `youtube-adapter-mount.test.ts`               | KEEP     | SDK replacement-node identity survives repeated mounting and target relocation; time and handle ownership remain current. DOM identity does not establish preservation of a real iframe browsing context. Added fixture-level failure cleanup.                                                                                   |
| `youtube-api-retry.test.ts`                   | KEEP     | Script error/timeout, shared retry, and retained host script/callback exercise actual loader ownership with network execution disabled. These are useful concurrency and host-integration boundaries.                                                                                                                            |
| `youtube-controls-options.test.ts`            | KEEP     | Literal official player parameters and distinct native/custom capabilities protect supported controls/caption requests, including layout before SDK readiness. The full origin/referrer oracle here makes the removed runtime case redundant. Added fixture-level failure cleanup.                                               |
| `youtube-iframe-runtime.test.ts`              | REWRITE  | Retains cached API, shared initialization, callback restoration, polling fallback, and deadline behavior. Removed the duplicated origin/referrer case and its standalone command-counter fake. Added zero-timer and callback cleanup assertions at timeout.                                                                      |
| `youtube-player-readiness.test.ts`            | REWRITE  | Strict SDK fixture throws before readiness; default runtime covers readiness, deadline destruction, replacement/unmount cancellation, current autoplay blocking, and pending relocation. Added the independently observable ready-event snapshot regression. Removed unrelated whole-body cleanup.                               |
| `youtube-presentation.test.ts`                | KEEP     | Package presentation container owns fullscreen; SDK iframe is not requested, browser exit is translated, unsupported hosts remain honest, and disposed adapters stop receiving events. Added fixture-level failure cleanup. Native browser fullscreen remains outside this emulated boundary.                                    |
| `youtube-protocol-capabilities.test.ts`       | REWRITE  | Retains buffering versus official autoplay-block discrimination, duplicate/late block suppression, and provider-rate normalization/capability honesty. Added invalid raw provider readings paired with valid fractional values, preventing passthrough and always-zero normalization.                                            |
| `youtube-time-updates.test.ts`                | KEEP     | Exact 499/500-ms boundaries, repeated-start idempotence, stop silence, and fresh restart protect the real sampler. Added failure cleanup and zero remaining timer checks.                                                                                                                                                        |

No original test file was deleted. No file-level decision remains unresolved.
Protocol expectations follow the checked-in integration contract and the
existing official-parameter oracle; the audit did not infer real SDK behavior
from configured mock answers.

## Verification and resource ownership

Executed behavioral RED then GREEN for both implementation fixes:

```sh
bun run test --project dom src/adapters/youtube/youtube-player-readiness.test.ts -t 'waits for SDK readiness'
bun run test --project dom src/adapters/youtube/create-youtube-adapter-load-session.test.ts -t 'destroys a late player'
```

The failures were the wrong readiness snapshot and a retained timer, not setup
or compilation failures. The full load-session file also passed after improving
the rejecting fixture's ownership and late-handle assertion.

Final scoped checks passed: 12 files / 51 tests, scoped Biome check and lint,
and whitespace validation.

```sh
bun run test --project dom src/adapters/youtube
bunx biome check src/adapters/youtube docs/test-quality-audit/youtube.md
bunx biome lint src/adapters/youtube
git diff --check -- src/adapters/youtube docs/test-quality-audit/youtube.md
```

Adapters and observer subscriptions now register test-finish cleanup when
acquired; explicit lifecycle assertions still call actual unmount/stop methods.
Deferred gates settle in cleanup, globals/spies/fake clocks are restored, and
sampler/deadline tests inspect remaining timer ownership. No server, browser,
network request, or persistent external environment was started by this audit.
Root typechecking, broad gates, and browser/provider acceptance belong to the
lead integration run. These tests establish package translation and lifecycle
under a controlled SDK boundary, not live YouTube playback, provider policy,
actual autoplay blocking, native fullscreen, or iframe-context preservation.
