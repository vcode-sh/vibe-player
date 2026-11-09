# Core test-quality audit

Reviewed all 23 original `src/core/*.test.ts` files, their production owners,
the controller fixture, and immediate React/UI/adapter consumers. Decisions
follow the current repository testing skill. No deletion quota was applied:
18 original files are kept, five rewritten, and one focused file added.

## Confirmed defects and evidence

1. **A source replaced from a load observer still performed obsolete work.**
   Three controller regressions failed before the fix: the old adapter was
   subscribed after its initial state callback replaced it; `opened` was emitted
   after a ready callback replaced it; and a resume-store read still ran after
   an `opened` callback replaced it. Generation checks after state notification
   and before resume reads now stop these effects. The replacement still mounts,
   loads, and restores its own position. The oracle is the documented ownership
   rule that superseded work cannot affect current playback, plus existing
   event/seek callback-ownership coverage.
2. **An old asynchronous observer rejection contaminated a reloaded session
   when the host reused the same source object.** Extending the existing
   different-source regression with the same object failed: `onError` received
   the previous telemetry failure in the new session. A private observer session
   counter now fences host results independently of source-object identity.
   Current-session rejection reporting remains covered for analytics, state
   listeners, and resume writes.
3. **Resume restoration accepted positive infinity before duration metadata.**
   A real controller with a host store returning infinity dispatched
   `seek:Infinity` and exposed an infinite position. Finite validation in the
   eligibility predicate now skips it. Existing positive-position and unknown
   duration cases retain valid restoration. Built-in stores already normalize
   values; injected host stores still require this controller boundary check.

All five newly failing regression cases passed after their corresponding
production fixes. Public API signatures and exports are unchanged.

## Test improvements

- Removed an extra clamp from the seek fixture: it could hide dispatch of the
  raw request while persistence stayed clamped. The test now checks the exact
  dispatched target as well as persistence and analytics. A separate case protects the documented accepted
  target when a provider getter still reports the old position.
- Expanded source equality to equivalent
  fresh file/HLS values, changed delivery URLs, MIME types, caption removal or
  replacement, HLS delivery mode, source removal, and provider/source identity.
  These are literal cases; expected equality is not computed by the helper.
  The existing React URL-change test remains a complementary consumer check.
- The pending-capabilities fixture now settles its controlled load, disposes
  its controller, and restores its spy in `finally`, including assertion failure.

## Original-file decisions

Paths below are relative to `src/core/`.

| Original file                                         | Decision | Protected contract and distinct role                                                                                                                                                                           |
| ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vibe-player-controller-analytics.test.ts`            | KEEP     | Real controller emits once per session, attributes asymmetric progress values correctly, and rearms after replacement. Complements threshold-helper tests.                                                     |
| `vibe-player-controller-async-integrations.test.ts`   | REWRITE  | Preserve current-session async rejection/thenable containment; add same-object reload to distinguish session ownership from source identity.                                                                   |
| `vibe-player-controller-async-ownership.test.ts`      | KEEP     | Controlled completion covers old disposal, presentation mount, play and pause results after newer intents or sources. No arbitrary sleeps.                                                                     |
| `vibe-player-controller-capabilities.test.ts`         | REWRITE  | Pending provider readiness must expose accepted source capabilities before ready; retain the behavior and guarantee fixture cleanup.                                                                           |
| `vibe-player-controller-command-errors.test.ts`       | KEEP     | Playback failure rolls back intent, auxiliary failure preserves playback, stale commands cannot report on replacements, independent commands retain diagnostics.                                               |
| `vibe-player-controller-errors.test.ts`               | KEEP     | Factory/mount/provider errors preserve source, phase and cause; disposed callbacks and duplicate event/rejection reporting are rejected; host diagnostics cannot break notification.                           |
| `vibe-player-controller-event-ownership.test.ts`      | KEEP     | Subscriber and storage reentrancy must stop old progress/completion effects and error reporting. Distinct from async completion ownership.                                                                     |
| `vibe-player-controller-integration-failures.test.ts` | KEEP     | Synchronous telemetry/storage/listener failures cannot block disposal, playback analytics or other subscribers; nested notifications cannot deliver stale state.                                               |
| `vibe-player-controller-load-races.test.ts`           | KEEP     | Explicit barriers make stale load success and failure observable after a current load; the current source and its analytics remain authoritative.                                                              |
| `vibe-player-controller-paused-events.test.ts`        | KEEP     | Pending pause filters delayed active events until acknowledgment, but accepts later provider play and already-paused source playback.                                                                          |
| `vibe-player-controller-resume-errors.test.ts`        | REWRITE  | Preserve store-read failure isolation and provider-seek error ownership; add invalid infinite host resume input through the real controller.                                                                   |
| `vibe-player-controller-seek-results.test.ts`         | REWRITE  | Remove the fixture's masking clamp; verify dispatch normalization, accepted-target reporting with stale getters, denial effects and stale/reentrant completion ownership.                                      |
| `vibe-player-controller.test.ts`                      | KEEP     | Useful public controller lifecycle baseline: mount/load/restore order, command dispatch, intent state, blocking, load identity and source close/remount. Specialized files cover different failure mechanisms. |
| `vibe-player-events.test.ts`                          | KEEP     | Independent literal inclusive thresholds and earliest-unsent ordering detect boundary errors and skipped progress milestones.                                                                                  |
| `vibe-player-playback-rate.test.ts`                   | KEEP     | Default/provider cycles, wraparound, unsupported current values and empty choices protect controls from unavailable rate requests.                                                                             |
| `vibe-player-quality-options.test.ts`                 | KEEP     | Selection fallback and capability/options combinations protect honest UI availability; fixture object expectations are intentional selection identity, not copied computation.                                 |
| `vibe-player-resume-store.test.ts`                    | KEEP     | Real store implementations normalize values, persist across instances and isolate encoded keys/prefixes through a stateful storage fake; no claim about browser quota policy.                                  |
| `vibe-player-resume.test.ts`                          | KEEP     | Independent near-end threshold and current/seekable/positive eligibility partitions; complements orchestration regressions and does not fake the owner.                                                        |
| `vibe-player-shortcuts.test.ts`                       | KEEP     | Documented mappings, per-capability denial, native interactive targets and modifiers with a valid unrelated playback control detect overbroad shortcut interception.                                           |
| `vibe-player-time.test.ts`                            | KEEP     | Literal time formatting, metadata fallback and seek boundaries cover shared adapter/UI helpers without duplicating expected calculations.                                                                      |
| `vibe-player-volume.test.ts`                          | KEEP     | Independent clamping and rounding thresholds distinguish silent from muted; protects public headless helpers and their UI consumer.                                                                            |

Added `vibe-player-controller-load-observers.test.ts` owns the three synchronous
load-observer replacement regressions. No original files were deleted or left
unresolved.

## Verification and limits

- Focused behavioral RED: load-observer regressions 3 failed; same-object async
  rejection regression failed while different-object control passed; infinite
  resume regression failed with the actual `seek:Infinity` effect.
- Corresponding focused GREEN: 12 tests across the three affected files passed.
- Final scoped lane: `bun run test --project dom src/core`, **24 files / 121 tests
  passed**.
- `bunx biome check src/core` and `bunx biome lint src/core`: **53 files passed**.
- New regressions settle their owned work and restore their spies; all deferred
  cases completed in the scoped run. No process, socket, browser, file store,
  network request, fake timer, or shared service was acquired for this audit.
- Observable avoided work: the obsolete subscription changed from one to zero;
  analytics-triggered replacement reduced resume reads from two to the one
  current-source read. These are operation counts, not a throughput benchmark.
- Core tests execute the real controller with a controllable adapter boundary.
  They do not prove decoding, physical fullscreen/PiP, real browser playback, or
  provider-specific timing. Broad package/type/browser gates belong to the lead
  agent and remain required for the combined tree.

## Integration follow-up

A synchronous adapter `subscribe` callback could replace the source before the
returned disposer was stored. An independent inline reproduction and a fourth
load-observer regression showed the old adapter changing the new source time
from 12 to 77. The lead now disposes the just-returned subscription if its load
was superseded and stops before mounting it. The focused four-case file passes;
ongoing events still use active-subscription ownership so remounts remain valid.
